"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { registerApiAuthHandlers, resetApiAuthHandlers } from '@/lib/api';
import {
  AUTH_EXPIRES_AT_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearAuthSession,
  persistAuthSession,
  shouldProactivelyRefresh,
} from '@/lib/authSession';
import { toFrontendRole } from '@/lib/roleMapping';

export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt: string;
}

function normalizeStoredUser(raw: unknown): User {
  const user = raw as User;
  return {
    ...user,
    role: toFrontendRole(user?.role) ?? user?.role,
  };
}

function readSessionFromStorage(): { token: string; user: User } | null {
  if (typeof window === 'undefined') return null;
  try {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!storedToken || !storedUser) return null;
    const user = normalizeStoredUser(JSON.parse(storedUser));
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { token: storedToken, user };
  } catch {
    clearAuthSession();
    return null;
  }
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydratedRef = useRef(false);

  const isAuthenticated = !!user && !!token;

  const clearAuthAndRedirect = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuthSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }, []);

  const refreshTokenRef = useRef<() => Promise<void>>(async () => {});

  const refreshToken = useCallback(async () => {
    const currentToken = token ?? localStorage.getItem(AUTH_TOKEN_KEY);
    if (!currentToken) {
      throw new Error('No token to refresh');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.detail || 'Token refresh failed');
    }

    const { token: newToken, expiresAt } = data;
    if (!newToken) {
      throw new Error('No token returned from refresh');
    }

    setToken(newToken);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
      persistAuthSession({
        token: newToken,
        user: JSON.parse(storedUser),
        expiresAt: expiresAt ?? null,
      });
    } else {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      if (expiresAt) {
        localStorage.setItem(AUTH_EXPIRES_AT_KEY, expiresAt);
      }
    }
  }, [token]);

  refreshTokenRef.current = refreshToken;

  const checkAuth = useCallback(async () => {
    // Always release the UI within 2.5s — never leave pages spinning.
    const safetyTimer = window.setTimeout(() => setIsLoading(false), 2500);

    try {
      const session = readSessionFromStorage();
      if (!session) {
        setToken(null);
        setUser(null);
        return;
      }

      // Hydrate immediately so layouts can render while we verify.
      setToken(session.token);
      setUser(session.user);
      setIsLoading(false);

      const expiresAt = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
      if (shouldProactivelyRefresh(expiresAt)) {
        try {
          const refreshController = new AbortController();
          const refreshTimeout = window.setTimeout(() => refreshController.abort(), 3000);
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.token}`,
              'Content-Type': 'application/json',
            },
            signal: refreshController.signal,
          });
          window.clearTimeout(refreshTimeout);
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.token) {
              setToken(refreshData.token);
              persistAuthSession({
                token: refreshData.token,
                user: session.user,
                expiresAt: refreshData.expiresAt ?? null,
              });
            }
          } else if (refreshResponse.status === 401 || refreshResponse.status === 403) {
            clearAuthAndRedirect();
            return;
          }
        } catch (error) {
          console.error('Proactive token refresh failed:', error);
        }
      }

      const tokenForVerify = localStorage.getItem(AUTH_TOKEN_KEY) ?? session.token;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenForVerify}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (response.ok) {
          const userData = await response.json();
          const normalizedUser = normalizeStoredUser(userData.user);
          setToken(tokenForVerify);
          setUser(normalizedUser);
          persistAuthSession({
            token: tokenForVerify,
            user: normalizedUser,
            expiresAt: localStorage.getItem(AUTH_EXPIRES_AT_KEY),
          });
        } else if (response.status === 401 || response.status === 403) {
          // Expired/invalid session — force a clean login.
          clearAuthAndRedirect();
        }
      } catch (error) {
        console.error('Auth verify failed, keeping cached session:', error);
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('checkAuth unexpected error:', error);
      clearAuthSession();
      setToken(null);
      setUser(null);
    } finally {
      window.clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  }, [clearAuthAndRedirect]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.detail || 'Login failed');
      }

      const { user: userData, token: authToken, expiresAt } = data;
      const normalizedUser = normalizeStoredUser(userData);
      setUser(normalizedUser);
      setToken(authToken);
      persistAuthSession({
        token: authToken,
        user: normalizedUser,
        expiresAt: expiresAt ?? null,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const currentToken = token ?? localStorage.getItem(AUTH_TOKEN_KEY);
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthAndRedirect();
    }
  };

  useEffect(() => {
    registerApiAuthHandlers({
      getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),
      refreshToken: () => refreshTokenRef.current(),
      onUnauthorized: clearAuthAndRedirect,
    });
    return () => resetApiAuthHandlers();
  }, [clearAuthAndRedirect]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshToken,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
