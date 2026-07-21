"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mic, GraduationCap, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { formatApiError } from '@/lib/apiError';

type Step = 1 | 2 | 'done';
type Role = 'publisher' | 'subscriber';

const ROLES: { value: Role; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'publisher',
    label: 'Publisher',
    description: 'Create AI-powered educational avatars, manage courses, sessions, and teach through the platform.',
    icon: <Mic size={28} />,
    color: 'blue',
  },
  {
    value: 'subscriber',
    label: 'Subscriber',
    description: 'Browse the marketplace, subscribe to AI avatars, and learn through voice-driven experiences.',
    icon: <GraduationCap size={28} />,
    color: 'green',
  },
];

const colorMap: Record<string, string> = {
  blue:   'border-primary/50 dark:border-primary/50 bg-primary/5 dark:bg-primary/20 ring-blue-500',
  green:  'border-primary/50 bg-primary/5 ring-primary/50',
  purple: 'border-purple-500 bg-purple-50 ring-purple-500',
};

const iconColorMap: Record<string, string> = {
  blue:   'text-primary/90 dark:text-primary/40 bg-primary/10 dark:bg-primary/40',
  green:  'text-primary bg-primary/10',
  purple: 'text-purple-600 bg-purple-100',
};

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: '' as Role | '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredRole, setRegisteredRole] = useState<Role | ''>('');

  useEffect(() => {
    if (isAuthenticated && !isLoading) router.push('/');
  }, [isAuthenticated, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateStep1 = () => {
    if (formData.firstName.trim().length < 1) { setError('First name is required'); return false; }
    if (formData.lastName.trim().length < 1)  { setError('Last name is required');  return false; }
    if (formData.username.trim().length < 3)  { setError('Username must be at least 3 characters'); return false; }
    if (!/\S+@\S+\.\S+/.test(formData.email)) { setError('Valid email is required'); return false; }
    if (formData.password.length < 6)         { setError('Password must be at least 6 characters'); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleContinue = () => {
    if (!validateStep1()) return;
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formData.role) { setError('Please select a role'); return; }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:  formData.username,
          email:     formData.email,
          password:  formData.password,
          firstName: formData.firstName,
          lastName:  formData.lastName,
          role:      formData.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data, 'Registration failed'));
      setRegisteredEmail(formData.email);
      setRegisteredRole(formData.role);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary/50" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create account</h2>
        <p className="text-gray-500">
          {step === 'done'
            ? 'Almost there'
            : `Step ${step} of 2 — ${step === 1 ? 'Account details' : 'Choose your role'}`}
        </p>
          {/* progress bar */}
          <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary dark:bg-primary/90 rounded-full transition-all duration-300"
              style={{ width: step === 'done' ? '100%' : step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: account info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">First Name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 text-sm"
                  placeholder="Jane" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Last Name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 text-sm"
                  placeholder="Doe" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Username</label>
              <input name="username" value={formData.username} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 text-sm"
                placeholder="janedoe" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 text-sm"
                placeholder="jane@example.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 text-sm"
                  placeholder="Min 6 characters" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword} onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 text-sm"
                  placeholder="Repeat password" required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Duplicate-prevention: disable Continue while isSubmitting */}
            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full bg-primary dark:bg-primary/90 text-white py-3 rounded-xl font-medium hover:bg-primary/90 dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validating...
                </>
              ) : (
                <>Continue <ArrowRight size={18} /></>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary/90 dark:text-primary/40 hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── Success: verify email ── */}
        {step === 'done' && (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Account created
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We sent a verification link to{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{registeredEmail}</span>.
                Click the link in your email to verify your account.
              </p>
              {registeredRole === 'publisher' && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Publisher accounts also require admin approval after email verification.
                  You will receive another email once your account is approved.
                </p>
              )}
            </div>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 bg-primary dark:bg-primary/90 text-white py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        )}

        {/* ── Step 2: role selection ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center">How will you use ProfSidekick?</h2>

            <div className="space-y-3">
              {ROLES.map((r) => {
                const selected = formData.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setError(null); setFormData((p) => ({ ...p, role: r.value })); }}
                    className={`
                      w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all
                      ${selected
                        ? `${colorMap[r.color]} ring-2 ring-offset-1`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:bg-gray-800'}
                    `}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColorMap[r.color]}`}>
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-100">{r.label}</span>
                        {selected && <CheckCircle size={18} className="text-primary/90 dark:text-primary/40 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-6">
              <button onClick={() => { setError(null); setStep(1); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting || !formData.role}
                className="flex-1 bg-primary dark:bg-primary/90 text-white py-3 rounded-xl font-medium hover:bg-primary/90 dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : 'Create Account'}
              </button>
            </div>
          </div>
        )}
      </div>
  );
}

