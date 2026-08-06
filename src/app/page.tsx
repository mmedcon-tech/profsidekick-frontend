"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Check, LogOut } from 'lucide-react';

function clearLocalAuthSession(): void {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_expires_at');
  } catch {
    // ignore
  }
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [stuck, setStuck] = useState(false);
  const dashboardUrl =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'publisher'
        ? '/publisher/dashboard'
        : '/subscriber/dashboard';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    const role = user.role;
    let destination = '/publisher/dashboard';
    if (role === 'admin') destination = '/admin/dashboard';
    else if (role === 'subscriber') destination = '/subscriber/dashboard';

    const timer = window.setTimeout(() => {
      window.location.replace(destination);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isLoading, user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setStuck(false);
      return;
    }
    const stuckTimer = window.setTimeout(() => setStuck(true), 3000);
    const forceLogin = window.setTimeout(() => {
      clearLocalAuthSession();
      window.location.replace('/login');
    }, 10000);
    return () => {
      window.clearTimeout(stuckTimer);
      window.clearTimeout(forceLogin);
    };
  }, [isLoading, isAuthenticated]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700 dark:border-gray-600 dark:border-t-blue-400" />
          <p className="text-slate-600 dark:text-gray-400">
            {isAuthenticated ? 'Opening your dashboard…' : 'Loading…'}
          </p>
          {stuck && (
            <button
              type="button"
              onClick={() => {
                clearLocalAuthSession();
                window.location.replace('/login');
              }}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-medium text-white"
            >
              Stuck? Clear session & go to login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="MyOS"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
            <div className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                MyOS
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">
                Expert AI Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => router.push(dashboardUrl)}
                  className="min-h-[44px] rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-300"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center px-3 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-gray-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — one composition: brand, headline, support, CTAs */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(42,168,201,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Image
              src="/images/logo.png"
              alt="MyOS"
              width={72}
              height={72}
              className="mx-auto mb-8 h-[72px] w-[72px] object-contain"
              priority
            />
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">
              MyOS
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Knowledge-based AI avatars that let experts scale
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-gray-400">
              Expert digital twins for education — upload your materials and teach through voice-driven AI sessions.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isAuthenticated ? (
                <button
                  onClick={() => router.push(dashboardUrl)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 text-base font-medium text-white hover:bg-blue-800 sm:w-auto"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 text-base font-medium text-white hover:bg-blue-800 sm:w-auto"
                  >
                    Start for free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-8 text-base font-medium text-slate-800 hover:bg-slate-50 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Product value */}
      <section className="border-b border-slate-200 py-20 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Built for modern teaching
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-gray-400">
              From slide analysis to live voice sessions, MyOS helps publishers and learners work with expert knowledge at scale.
            </p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              {
                title: 'Content that understands itself',
                body: 'Upload presentations and let MyOS extract structure, context, and teaching cues from every slide.',
              },
              {
                title: 'Voice-led sessions',
                body: 'Run interactive lessons with AI avatars that navigate materials and respond in real time.',
              },
              {
                title: 'Experts that scale',
                body: 'Publish once, reach many learners — with avatars that carry your expertise across courses and programs.',
              },
            ].map((item) => (
              <div key={item.title} className="text-left">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-3 text-slate-600 dark:text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why MyOS */}
      <section className="border-b border-slate-200 bg-slate-50 py-20 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Why MyOS
            </h2>
            <ul className="mt-8 space-y-5">
              {[
                {
                  title: 'Fast to start',
                  body: 'Upload materials and open a session in minutes — no complex setup.',
                },
                {
                  title: 'Natural interaction',
                  body: 'Navigate slides and answer questions through conversation, not menus.',
                },
                {
                  title: 'Configurable avatars',
                  body: 'Tune voice, persona, and delivery to match your subject and style.',
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-1 text-slate-600 dark:text-gray-400">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-950">
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Ready to get started?
            </h3>
            <p className="mt-3 text-slate-600 dark:text-gray-400">
              Create an account and publish your first AI-backed teaching session.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-blue-700 px-6 text-base font-medium text-white hover:bg-blue-800"
            >
              Create free account
            </Link>
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-gray-500">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/images/logo.png"
                  alt="MyOS"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
                <div>
                  <p className="font-semibold">MyOS</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Expert AI Platform</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm text-slate-400">
                Knowledge-based AI avatars that let experts scale — expert digital twins for education.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Account</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {isAuthenticated ? (
                  <li>
                    <Link href={dashboardUrl} className="hover:text-white">
                      Dashboard
                    </Link>
                  </li>
                ) : (
                  <>
                    <li>
                      <Link href="/login" className="hover:text-white">
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link href="/register" className="hover:text-white">
                        Register
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} MyOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
