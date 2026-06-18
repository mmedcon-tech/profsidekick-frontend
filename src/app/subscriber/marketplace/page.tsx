"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { marketplaceApi, subscriptionApi, ApiError } from '@/lib/avatarApi';
import { STARTER_AVATARS } from '@/lib/starterAvatars';
import type { AvatarPublicResponse } from '@/types/avatar';
import { Search, BookOpen, Users, Star, CheckCircle2, Bot, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AvatarIcon from '@/components/avatars/AvatarIcon';

export default function MarketplacePage() {
  const [avatars, setAvatars] = useState<AvatarPublicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [subscribedIds, setSubscribedIds] = useState<string[]>(['__profsidekick__']); // Mock enrolled
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);

  useEffect(() => {
    marketplaceApi.list()
      .then((r) => setAvatars(r.avatars))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load avatars'))
      .finally(() => setLoading(false));
  }, []);

  const filteredStarter = STARTER_AVATARS.filter((sa) => sa.isAvailable && (!query || sa.name.toLowerCase().includes(query.toLowerCase()) || sa.description.toLowerCase().includes(query.toLowerCase())));

  const filteredApi = avatars.filter((a) =>
    !query || a.name.toLowerCase().includes(query.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(query.toLowerCase())
  );

  function openConfirm(id: string) {
    setConfirmId(id);
    setAgreedTerms(false);
    setAgreedPrivacy(false);
  }

  async function handleSubscribe() {
    if (!confirmId) return;
    setLoading(true);
    try {
      await subscriptionApi.subscribe(confirmId);
      setSubscribedIds((prev) => [...prev, confirmId]);
      setSubscribeSuccess(confirmId);
      setConfirmId(null);
      setTimeout(() => setSubscribeSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to subscribe to avatar');
    } finally {
      setLoading(false);
    }
  }

  const confirmAvatarApi = avatars.find((a) => a.id === confirmId);
  const confirmAvatarStarter = STARTER_AVATARS.find((a) => a.id === confirmId);
  const confirmAvatarName = confirmAvatarApi?.name || confirmAvatarStarter?.name || '';
  const confirmCost = 5; // Mock credit cost

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover available AI avatars and programs
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search avatars..."
          className="h-12 w-full rounded-xl border border-input bg-card ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {subscribeSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90 dark:border-primary dark:bg-primary dark:text-primary/40 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Successfully subscribed to the avatar program!
        </div>
      )}

      {/* Starter Avatars */}
      {filteredStarter.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Platform Avatars</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStarter.map((avatar) => {
              const isEnrolled = subscribedIds.includes(avatar.id);
              
              return (
                <div
                  key={avatar.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card transition-all hover:shadow-lg overflow-hidden group",
                    isEnrolled ? "border-primary/50 ring-1 ring-primary/20 shadow-md" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="relative p-5 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                         <div className={`relative h-16 w-16 shrink-0 rounded-xl flex items-center justify-center shadow-inner ${avatar.id === '__profsidekick__' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary/40' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                           <Bot size={32} />
                         </div>
                         <div>
                           <div className="flex flex-wrap items-center gap-2">
                             <h3 className="font-bold text-foreground text-lg">{avatar.name}</h3>
                           </div>
                           <p className="text-xs font-medium text-primary mt-1">{avatar.badge}</p>
                         </div>
                      </div>
                      {isEnrolled && (
                        <Badge variant="default" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-none">Enrolled</Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {avatar.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                        <BookOpen className="h-3.5 w-3.5 text-primary/70" />
                        <span className="font-medium">Free</span> courses
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                        <Users className="h-3.5 w-3.5 text-primary/70" />
                        <span className="font-medium">10k+</span> users
                      </span>
                    </div>

                    <div className="pt-4 border-t border-border mt-2">
                      {isEnrolled ? (
                        <Link href="/subscriber/dashboard">
                          <Button className="w-full font-semibold shadow-sm" variant="outline">
                            Start Learning
                          </Button>
                        </Link>
                      ) : (
                        <Button className="w-full font-semibold shadow-sm" onClick={() => openConfirm(avatar.id)}>
                          Subscribe
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Publisher Avatars */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold text-foreground">Community Avatars</h2>
        
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-destructive/5 rounded-2xl border border-destructive/20">
            <p className="text-destructive font-medium">Failed to load publisher avatars.</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        ) : filteredApi.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border flex flex-col items-center">
            <Bot size={48} className="text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              {query ? 'No community avatars match your search.' : 'No community avatars available yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApi.map((avatar) => {
              const isEnrolled = subscribedIds.includes(avatar.id);
              
              return (
                <div
                  key={avatar.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card transition-all hover:shadow-lg overflow-hidden group",
                    isEnrolled ? "border-primary/50 ring-1 ring-primary/20 shadow-md" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="relative p-5 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <AvatarIcon imageUrl={avatar.template_image_url} name={avatar.name} size={64} rounded="lg" />
                        <div>
                           <h3 className="font-bold text-foreground text-lg line-clamp-1">{avatar.name}</h3>
                           <div className="mt-1 flex items-center gap-1">
                             <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                             <span className="text-xs font-medium text-muted-foreground">4.5</span>
                           </div>
                        </div>
                      </div>
                      {isEnrolled && (
                        <Badge variant="default" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-none">Enrolled</Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {avatar.description || 'AI-powered educational avatar.'}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                        <Calendar className="h-3.5 w-3.5 text-primary/70" />
                        <span className="font-medium">{new Date(avatar.created_at).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md text-primary">
                        <span className="font-bold">5</span> credits/session
                      </span>
                    </div>

                    <div className="pt-4 border-t border-border mt-2">
                      {isEnrolled ? (
                        <Link href={`/subscriber/marketplace/${avatar.id}`}>
                          <Button className="w-full font-semibold shadow-sm" variant="outline">
                            View Avatar
                          </Button>
                        </Link>
                      ) : (
                        <Button className="w-full font-semibold shadow-sm" onClick={() => openConfirm(avatar.id)}>
                          Subscribe
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription consent modal */}
      {confirmId && confirmAvatarName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setConfirmId(null) }}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">
              Subscribe to {confirmAvatarName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {confirmCost} credits will be deducted per session run with this avatar.
            </p>

            <div className="mt-6 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-start mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-4 w-4 rounded border border-primary ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:bg-primary peer-checked:text-primary-foreground transition-all flex items-center justify-center">
                     {agreedTerms && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                </div>
                <span className="text-sm text-foreground select-none group-hover:text-primary transition-colors">
                  I agree to the <span className="text-primary underline underline-offset-2">Terms of Service</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-start mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-4 w-4 rounded border border-primary ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:bg-primary peer-checked:text-primary-foreground transition-all flex items-center justify-center">
                     {agreedPrivacy && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                </div>
                <span className="text-sm text-foreground select-none group-hover:text-primary transition-colors">
                  I agree to the <span className="text-primary underline underline-offset-2">Privacy Policy</span> and understand my sessions may be recorded for learning quality review.
                </span>
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="outline" className="flex-1 font-semibold" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 font-semibold"
                disabled={!agreedTerms || !agreedPrivacy}
                onClick={handleSubscribe}
              >
                Confirm Subscription
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
