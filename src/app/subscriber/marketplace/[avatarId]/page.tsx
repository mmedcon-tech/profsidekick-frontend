"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { marketplaceApi } from '@/lib/avatarApi';
import { config } from '@/lib/config';
import { subscriptionApi } from '@/lib/avatarApi';
import AvatarShowcase from '@/components/avatar/AvatarShowcase';
import PortraitAvatarStage from '@/components/avatar/PortraitAvatarStage';
import { useSpeechPreview } from '@/hooks/useSpeechPreview';
import {
  avatarSupportsGlbShowcase,
  buildShowcaseEntryFromAvatar,
} from '@/lib/marketplaceShowcase';
import { isPlatformLibraryAvatarId } from '@/lib/marketplaceUtils';
import type { AvatarPublicResponse } from '@/types/avatar';
import { ArrowLeft, Calendar, Play, Clock, Square, Upload, Info, Volume2 } from 'lucide-react';

interface PublicSession {
  sessionId: string;
  classDetails: { className: string; courseName: string; courseCode: string; duration: number };
  status: string;
  totalSlides: number;
  runCount: number;
}

function useToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

export default function SubscriberAvatarDetailPage() {
  const { avatarId } = useParams<{ avatarId: string }>();
  const router = useRouter();
  const token = useToken();

  const [avatar,    setAvatar]   = useState<AvatarPublicResponse | null>(null);
  const [sessions,  setSessions] = useState<PublicSession[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (isPlatformLibraryAvatarId(avatarId)) {
      router.replace(`/subscriber/marketplace/glb/${avatarId}`);
      return;
    }

    Promise.all([
      marketplaceApi.get(avatarId),
      fetch(config.getApiUrl(`/api/sessions?avatar_id=${avatarId}&limit=20`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.ok ? r.json() : { sessions: [] })
        .then((d) => d.sessions ?? [])
        .catch(() => []),
      token ? subscriptionApi.checkStatus(avatarId).catch(() => ({ subscribed: false })) : Promise.resolve({ subscribed: false }),
    ])
      .then(([av, sess, subStatus]) => { setAvatar(av); setSessions(sess); setIsSubscribed((subStatus as { subscribed: boolean }).subscribed); })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [avatarId, token, router]);

  const handleSubscribe = async () => {
    if (!token) { router.push('/login'); return; }
    setSubscribing(true);
    try {
      await subscriptionApi.subscribe(avatarId);
      setIsSubscribed(true);
      const newSessions = await fetch(config.getApiUrl(`/api/sessions?avatar_id=${avatarId}&limit=20`), {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : { sessions: [] }).then(d => d.sessions ?? []);
      setSessions(newSessions);
      alert("Successfully subscribed and enrolled in associated courses!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Subscription failed");
    } finally {
      setSubscribing(false);
    }
  };

  const handleLaunch = async (sessionId: string) => {
    if (!token) { router.push('/login'); return; }
    setLaunching(sessionId);
    try {
      const res = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/start`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.detail || 'Launch failed');
      router.push(`/courses/${data.courseId}/sessions/${sessionId}/run/${data.sessionRunId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setLaunching(null);
    }
  };

  const showcaseEntry = useMemo(
    () => (avatar ? buildShowcaseEntryFromAvatar(avatar) : null),
    [avatar],
  );
  const speechPreview = useSpeechPreview(avatar?.name ?? 'Assistant');
  const portraitUrl =
    avatar?.template_image_url ??
    showcaseEntry?.thumbnailPath ??
    '/images/avatar-female.png';
  const hasGlbShowcase = !!(avatar && avatarSupportsGlbShowcase(avatar) && showcaseEntry);
  const hasPortraitOnly = !!(avatar?.template_image_url && !hasGlbShowcase);
  const widgetState = speechPreview.active ? 'speaking' as const : 'idle' as const;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || 'Avatar not found'}</p>
        <Link href="/subscriber/marketplace" className="text-emerald-700 dark:text-emerald-400 hover:underline text-sm mt-2 inline-block">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/subscriber/marketplace"
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit">
        <ArrowLeft size={16} /> Marketplace
      </Link>

      <div className={`grid gap-6 ${hasGlbShowcase || hasPortraitOnly ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]' : ''}`}>
        {hasGlbShowcase && showcaseEntry && (
          <div className="overflow-hidden rounded-3xl border border-gray-200 shadow-lg dark:border-gray-700">
            <AvatarShowcase entry={showcaseEntry} className="min-h-[520px]" />
          </div>
        )}

        {hasPortraitOnly && (
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-lg dark:border-gray-700">
            <div className="min-h-[520px]">
              <PortraitAvatarStage
                imageUrl={portraitUrl}
                avatarName={avatar.name}
                widgetState={widgetState}
                amplitude={speechPreview.amplitude}
              />
            </div>
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
              <button
                type="button"
                onClick={speechPreview.toggle}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-md transition-colors ${
                  speechPreview.active
                    ? 'bg-white text-[#133221]'
                    : 'bg-[#133221] text-white'
                }`}
              >
                {speechPreview.active ? (
                  <>
                    <Square size={12} /> Stop preview
                  </>
                ) : (
                  <>
                    <Volume2 size={12} /> Preview how they talk
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avatar.name}</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {avatar.tagline || avatar.description || 'AI-powered educational avatar.'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Calendar size={13} />
            <span>Published {new Date(avatar.created_at).toLocaleDateString()}</span>
          </div>

          <div className="mt-6">
            {isSubscribed ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Already Enrolled
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                {subscribing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enrolling…
                  </>
                ) : (
                  <>Enroll</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Available Sessions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose a session and launch your AI-powered learning experience.
        </p>

        {sessions.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No sessions available yet.</p>
            <p className="text-gray-400 text-xs mt-1">The publisher is still setting things up. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.sessionId}
                className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 transition-all">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <Play size={18} className="text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{s.classDetails.className}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><Clock size={11} />{s.classDetails.duration} min</span>
                    <span>{s.totalSlides} slides</span>
                    <span>{s.runCount} run{s.runCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleLaunch(s.sessionId)}
                  disabled={!!launching}
                  className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors text-sm font-medium flex-shrink-0"
                >
                  {launching === s.sessionId
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting…</>
                    : <><Play size={14} /> Launch</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <Upload size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Uploading your solution</p>
          <p>During a session you can upload one solution file (PDF, DOCX, or TXT).
            The AI will review it against the rubric and give you feedback.
            Only one upload per session run is allowed.</p>
        </div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 dark:text-emerald-300">
          Sessions are voice-driven AI oral examinations. A working microphone is required.
          Each run is independent — you can retake sessions multiple times.
        </p>
      </div>
    </div>
  );
}
