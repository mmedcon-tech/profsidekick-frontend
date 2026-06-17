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

export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt: string;
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

  const isAuthenticated = !!user && !!token;

  const restoreSessionFromStorage = (): boolean => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!storedToken || !storedUser) {
      return false;
    }
    try {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      return true;
    } catch {
      clearAuthSession();
      setToken(null);
      setUser(null);
      return false;
    }
  };

  const clearAuthAndRedirect = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuthSession();
    if (typeof window !== 'undefined') {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.detail || 'Token refresh failed');
    }

    const { token: newToken, expiresAt } = data;
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
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      if (!storedToken || !storedUser) {
        setToken(null);
        setUser(null);
        return;
      }

      const expiresAt = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
      if (shouldProactivelyRefresh(expiresAt)) {
        try {
          await refreshTokenRef.current();
        } catch (error) {
          console.error('Proactive token refresh failed:', error);
        }
      }

      const tokenForVerify =
        localStorage.getItem(AUTH_TOKEN_KEY) ?? storedToken;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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
          setToken(tokenForVerify);
          setUser(userData.user);
        } else if (response.status === 401 || response.status === 403) {
          clearAuthSession();
          setToken(null);
          setUser(null);
        } else {
          restoreSessionFromStorage();
        }
      } catch (error) {
        console.error('Auth verify failed, using cached session:', error);
        restoreSessionFromStorage();
      } finally {
        clearTimeout(timeoutId);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.detail || 'Login failed');
      }

      const { user: userData, token: authToken, expiresAt } = data;
      setUser(userData);
      setToken(authToken);
      persistAuthSession({
        token: authToken,
        user: userData,
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
      setUser(null);
      setToken(null);
      clearAuthSession();
    }
  };

  useEffect(() => {
    registerApiAuthHandlers({
      refreshToken,
      getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),
      clearAuthAndRedirect,
    });
    return () => resetApiAuthHandlers();
  }, [refreshToken, clearAuthAndRedirect]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
