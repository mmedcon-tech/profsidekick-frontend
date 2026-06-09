"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscriptionApi, marketplaceApi } from '@/lib/avatarApi';
import { useAuth } from '@/contexts/AuthContext';
import type { AvatarPublicResponse } from '@/types/avatar';
import type { SubscriptionResponse } from '@/types/subscription';
import {
  Bookmark, Store, CheckCircle2, Coins, Calendar,
  ExternalLink, Loader2, Bot,
} from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

interface EnrichedSubscription {
  subscription: SubscriptionResponse;
  avatar: AvatarPublicResponse | null;
}

export default function MyAvatarsPage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [items,       setItems]       = useState<EnrichedSubscription[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [subList, avatarList] = await Promise.all([
        subscriptionApi.list(),
        marketplaceApi.list().catch(() => ({ avatars: [], total: 0 })),
      ]);
      const avatarMap = new Map<string, AvatarPublicResponse>(
        avatarList.avatars.map((a) => [a.id, a])
      );
      const enriched: EnrichedSubscription[] = subList.subscriptions.map((sub) => ({
        subscription: sub,
        avatar: avatarMap.get(sub.avatar_id) ?? null,
      }));
      setItems(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUnsubscribe = async (avatarId: string) => {
    if (!confirm('Cancel your subscription to this avatar?')) return;
    setUnsubscribingId(avatarId);
    try {
      await subscriptionApi.unsubscribe(avatarId);
      setItems((prev) => prev.filter((i) => i.subscription.avatar_id !== avatarId));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Unsubscribe failed.');
    } finally {
      setUnsubscribingId(null);
    }
  };

  if (!token || !user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Sign in to view your subscriptions.</p>
        <button onClick={() => router.push('/login')} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Avatars</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Avatars you&apos;re subscribed to.</p>
        </div>
        <Link href="/subscriber/marketplace"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Store size={15} /> Browse Marketplace
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={loadData} className="mt-3 text-sm text-blue-600 hover:underline">Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No subscriptions yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Browse the marketplace to find avatars and subscribe to access their sessions.
          </p>
          <Link href="/subscriber/marketplace"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Store size={16} /> Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(({ subscription, avatar }) => {
            const cost = avatar?.subscription_cost ?? 0;
            const isUnsubscribing = unsubscribingId === subscription.avatar_id;
            return (
              <div key={subscription.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-5">
                {/* Avatar icon */}
                {avatar ? (
                  <AvatarIcon imageUrl={avatar.template_image_url} name={avatar.name} size={56} rounded="xl" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Bot size={24} className="text-gray-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {avatar?.name ?? `Avatar ${subscription.avatar_id.slice(0, 8)}…`}
                    </h3>
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      <CheckCircle2 size={11} /> Subscribed
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {avatar?.description || 'AI-powered educational avatar.'}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Subscribed {new Date(subscription.subscribed_at).toLocaleDateString()}
                    </span>
                    {cost > 0 && (
                      <span className="flex items-center gap-1">
                        <Coins size={11} /> {cost} credits
                      </span>
                    )}
                    {subscription.expires_at && (
                      <span className="text-amber-600">
                        Expires {new Date(subscription.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {avatar && (
                    <Link href={`/subscriber/marketplace/${avatar.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                      View <ExternalLink size={13} />
                    </Link>
                  )}
                  <button
                    onClick={() => handleUnsubscribe(subscription.avatar_id)}
                    disabled={isUnsubscribing}
                    className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isUnsubscribing ? <Loader2 size={14} className="animate-spin" /> : 'Unsubscribe'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
