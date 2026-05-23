'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, UserCheck, Mail } from 'lucide-react';
import { config } from '@/lib/config';

interface UserData {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function ApproveUserPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    const approveUser = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Approval token is missing. Please check your email link.');
        return;
      }

      try {
        const response = await fetch(
          config.getApiUrl(`/api/auth/approve-user?token=${token}`),
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
          setMessage(data.message || 'User account approved successfully!');
          if (data.user) {
            setUserData(data.user);
          }
        } else {
          setStatus('error');
          setMessage(data.message || data.detail || 'Failed to approve user. The link may have expired or already been used.');
        }
      } catch (error) {
        console.error('Error approving user:', error);
        setStatus('error');
        setMessage('An error occurred while approving the user. Please try again later.');
      }
    };

    approveUser();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-green-600 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Approving User Account
              </h1>
              <p className="text-gray-600">
                Please wait while we approve this account...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Account Approved! ✅
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>

              {userData && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Approved User Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {userData.firstName} {userData.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>{' '}
                      <span className="font-medium text-gray-900">{userData.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Username:</span>{' '}
                      <span className="font-medium text-gray-900">{userData.username}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Role:</span>{' '}
                      <span className="font-medium text-gray-900 capitalize">{userData.role}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-900 mb-1">
                      User Notified
                    </p>
                    <p className="text-sm text-green-700">
                      The user has been sent an email notification that their account is now active and they can log in.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Done
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Approval Failed
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  This link may have already been used or expired. If you need assistance, please contact support.
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

