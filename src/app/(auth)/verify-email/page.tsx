'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { config } from '@/lib/config';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing. Please check your email link.');
        return;
      }

      try {
        const response = await fetch(
          config.getApiUrl(`/api/auth/verify-email?token=${token}`),
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! Your account has been sent for approval.');
        } else {
          setStatus('error');
          setMessage(data.message || data.detail || 'Failed to verify email. The link may have expired.');
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again later.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary/90 dark:text-primary/40 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Verifying Your Email
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Email Verified! 🎉
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>
              <div className="bg-primary/5 dark:bg-primary/20 border border-primary/20 dark:border-primary/90 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary/90 dark:text-primary/40 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-primary dark:text-primary/10 mb-1">
                      What happens next?
                    </p>
                    <p className="text-sm text-primary/95 dark:text-primary/30">
                      Your account is pending approval. You will receive an email once your account is approved and ready to use.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full px-6 py-3 bg-primary dark:bg-primary/90 text-white rounded-lg hover:bg-primary/90 dark:hover:bg-primary transition-colors font-medium"
              >
                Return to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  If you continue to have issues, please contact support or try registering again.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/register')}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Register Again
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="flex-1 px-6 py-3 bg-primary dark:bg-primary/90 text-white rounded-lg hover:bg-primary/90 dark:hover:bg-primary transition-colors font-medium"
                >
                  Go to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

