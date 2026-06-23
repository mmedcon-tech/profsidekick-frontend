"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { marketplaceApi, subscriptionApi, ApiError } from '@/lib/avatarApi';
import { config } from '@/lib/config';
import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/contexts/AuthContext';
import type { AvatarPublicResponse } from '@/types/avatar';
import type { SubscriptionResponse, InsufficientCreditsError } from '@/types/subscription';
import {
  Bot, ArrowLeft, BookOpen, Info, ExternalLink,
  CheckCircle2, Coins, Lock, AlertTriangle, Loader2,
} from 'lucide-react';
import JoinCourseModal from '@/components/courses/JoinCourseModal';
import AvatarIcon from '@/components/avatars/AvatarIcon';

interface PublicCourse {
  course_id: string;
  name?: string;
  code?: string;
  description?: string;
  session_count?: number;
  enrolled: boolean;
}

export default function SubscriberAvatarDetailPage() {
  const { avatarId } = useParams<{ avatarId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { balance, refetch: refetchBalance } = useBilling();

  const [avatar,          setAvatar]          = useState<AvatarPublicResponse | null>(null);
  const [courses,         setCourses]         = useState<PublicCourse[]>([]);
  const [subscription,    setSubscription]    = useState<SubscriptionResponse | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [subscribing,     setSubscribing]     = useState(false);
  const [unsubscribing,   setUnsubscribing]   = useState(false);
  const [creditError,     setCreditError]     = useState<InsufficientCreditsError | null>(null);
  const [joinModalOpen,   setJoinModalOpen]   = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [av, coursesData, statusData] = await Promise.all([
        marketplaceApi.get(avatarId),
        fetch(config.getApiUrl(`/api/courses?avatar_id=${avatarId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((r) => r.ok ? r.json() : [])
          .catch(() => []),
        token
          ? subscriptionApi.status(avatarId).catch(() => ({ subscribed: false, subscription: null }))
          : Promise.resolve({ subscribed: false, subscription: null }),
      ]);
      setAvatar(av);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setSubscription(statusData.subscribed ? statusData.subscription : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [avatarId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubscribe = async () => {
    if (!token) { router.push('/login'); return; }
    setCreditError(null);
    setSubscribing(true);
    try {
      const sub = await subscriptionApi.subscribe(avatarId);
      setSubscription(sub);
      refetchBalance();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        try {
          const body = JSON.parse(e.message);
          setCreditError(body as InsufficientCreditsError);
        } catch {
          setCreditError({ error: 'insufficient_credits', required: 0, available: 0, message: e.message });
        }
      } else if (e instanceof ApiError && e.status === 409) {
        // Already subscribed — reload status
        await loadData();
      } else {
        alert(e instanceof Error ? e.message : 'Subscription failed. Please try again.');
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Cancel your subscription to this avatar?')) return;
    setUnsubscribing(true);
    try {
      await subscriptionApi.unsubscribe(avatarId);
      setSubscription(null);
      refetchBalance();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Unsubscribe failed.');
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleOpenCourse = (courseId: string) => {
    if (!token) { router.push('/login'); return; }
    router.push(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || 'Avatar not found'}</p>
        <Link href="/subscriber/marketplace" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const cost = avatar.subscription_cost ?? 0;
  const isSubscribed = subscription !== null;
  const userBalance = balance ? parseFloat(balance.balance) : null;
  const canAfford = cost <= 0 || (userBalance !== null && userBalance >= cost);

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/subscriber/marketplace"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit">
          <ArrowLeft size={16} /> Marketplace
        </Link>

        {/* Avatar hero */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <AvatarIcon imageUrl={avatar.template_image_url} name={avatar.name} size={80} rounded="lg" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4">{avatar.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
              {avatar.description || 'AI-powered educational avatar.'}
            </p>
          </div>

          {/* Subscription action area */}
          {isSubscribed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
                <CheckCircle2 size={18} />
                You are subscribed
              </div>
              <button
                onClick={handleUnsubscribe}
                disabled={unsubscribing}
                className="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {unsubscribing ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Cost display */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">Subscription cost</span>
                {cost <= 0 ? (
                  <span className="text-sm font-semibold text-green-600">Free</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                    <Coins size={14} /> {cost} credits
                  </span>
                )}
              </div>

              {/* Credit balance */}
              {cost > 0 && (
                <div className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Your balance</span>
                  <span className={`font-medium ${canAfford ? 'text-gray-700 dark:text-gray-300' : 'text-red-600'}`}>
                    {userBalance !== null ? `${userBalance} credits` : '—'}
                  </span>
                </div>
              )}

              {/* Insufficient credits error */}
              {creditError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Not enough credits</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      You need {creditError.required} credits but have {creditError.available}.{' '}
                      <Link href="/billing/redeem" className="underline hover:no-underline">Redeem a code</Link> or{' '}
                      <Link href="/billing/add-credits" className="underline hover:no-underline">purchase credits</Link>.
                    </p>
                  </div>
                </div>
              )}

              {/* Subscribe button */}
              {!token ? (
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Sign in to Subscribe
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing || (cost > 0 && !canAfford)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {subscribing ? (
                    <><Loader2 size={16} className="animate-spin" /> Subscribing…</>
                  ) : cost <= 0 ? (
                    'Subscribe for Free'
                  ) : canAfford ? (
                    `Subscribe for ${cost} credits`
                  ) : (
                    'Insufficient credits'
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Courses</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {isSubscribed
              ? 'Enroll in a course to access its AI-powered sessions.'
              : 'Subscribe to this avatar first, then enroll in a course to start learning.'}
          </p>

          {courses.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No courses available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.course_id}
                  className={`flex items-center gap-4 p-4 border rounded-xl transition-all ${
                    course.enrolled
                      ? 'border-green-200 bg-green-50'
                      : isSubscribed
                      ? 'border-gray-200 dark:border-gray-700 hover:border-blue-200 hover:bg-blue-50'
                      : 'border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    course.enrolled ? 'bg-green-100' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {course.enrolled
                      ? <BookOpen size={18} className="text-green-600" />
                      : <Lock size={18} className="text-gray-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {course.name || 'Untitled Course'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      {course.code && <span>{course.code}</span>}
                      {course.session_count !== undefined && (
                        <span>{course.session_count} session{course.session_count !== 1 ? 's' : ''}</span>
                      )}
                      {course.enrolled && <span className="text-green-600 font-medium">Enrolled</span>}
                    </div>
                  </div>

                  {course.enrolled ? (
                    <button
                      onClick={() => handleOpenCourse(course.course_id)}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex-shrink-0"
                    >
                      Open <ExternalLink size={13} />
                    </button>
                  ) : isSubscribed ? (
                    <button
                      onClick={() => setJoinModalOpen(true)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-shrink-0"
                    >
                      Enter Code
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Sessions are AI-powered oral examinations and teaching interactions. A working microphone may be required
            depending on the session format. Each run is independent — you can retake sessions multiple times.
          </p>
        </div>
      </div>

      {joinModalOpen && (
        <JoinCourseModal
          onClose={() => setJoinModalOpen(false)}
          onSuccess={(_courseName, courseId) => {
            setJoinModalOpen(false);
            loadData();
            router.push(`/courses/${courseId}`);
          }}
        />
      )}
    </>
  );
}
