"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading, user, token } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stuckLoading, setStuckLoading] = useState(false);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setSuccessMessage(message);
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setStuckLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setStuckLoading(true), 5000);
    return () => window.clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  const clearStuckSession = () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_expires_at');
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  // Redirect if already authenticated — role-based destination
  useEffect(() => {
    let mounted = true;

    const performRedirect = async () => {
      if (isAuthenticated && !isLoading && user) {
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
          window.location.replace(redirectParam);
          return;
        }

        if (user.role === 'admin') {
          window.location.replace('/admin/dashboard');
          return;
        }

        if (user.role === 'subscriber') {
          try {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 4000);
            const res = await fetch('/api/courses', {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            });
            window.clearTimeout(timeout);
            const courses = await res.json().catch(() => []);
            if (mounted) {
              if (Array.isArray(courses) && courses.length === 0) {
                window.location.replace('/subscriber/marketplace');
              } else {
                window.location.replace('/subscriber/dashboard');
              }
            }
          } catch {
            if (mounted) window.location.replace('/subscriber/dashboard');
          }
          return;
        }

        window.location.replace('/publisher/dashboard');
      }
    };

    performRedirect();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isLoading, user, searchParams, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login(formData.username, formData.password);
      // Redirect is handled by the useEffect above once isAuthenticated flips
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while checking auth or redirecting an existing session
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary/50"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isAuthenticated ? 'Taking you to your dashboard…' : 'Loading…'}
        </p>
        {stuckLoading && (
          <button
            type="button"
            onClick={clearStuckSession}
            className="mt-4 text-sm font-medium text-primary underline"
          >
            Stuck? Clear session and show login
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sign in</h2>
        <p className="text-gray-500">Sign in to your MyOS account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-300 text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary dark:focus:ring-primary/50 focus:border-primary dark:border-primary/50 transition-colors"
            placeholder="username"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary dark:focus:ring-primary/50 focus:border-primary dark:border-primary/50 transition-colors"
              placeholder="••••••••"
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full bg-primary dark:bg-primary/90 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary/90 dark:hover:bg-primary focus:ring-2 focus:ring-primary dark:focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 14 0" /><path d="m13 19 6-7-6-7" /></svg>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600">
          Do not have an account?{' '}
          <Link
            href="/register"
            className="text-primary/90 dark:text-primary/40 hover:underline font-semibold"
          >
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary/50"></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
} 
