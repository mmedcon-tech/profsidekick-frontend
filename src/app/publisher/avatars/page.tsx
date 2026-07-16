"use client"

import React, { useEffect, useState } from 'react';
import Image from "next/image"
import Link from 'next/link';

import { tr } from "@/lib/v2/i18n"
import { avatarApi, ApiError } from '@/lib/avatarApi';
import type { AvatarSummary } from '@/types/avatar';
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Globe, Lock, Trash2, Settings } from "lucide-react"
import { useProgramContext } from "@/contexts/ProgramContext"

export default function PublisherAvatarsPage() {
  const lang = "en" as "en" | "ar"
  const { activeProgram, contextReady } = useProgramContext()
  const [avatars, setAvatars] = useState<AvatarSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    avatarApi.list(activeProgram?.id)
      .then((r) => { setAvatars(r.avatars); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!contextReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProgram?.id, contextReady]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this avatar? This cannot be undone.')) return;
    try {
      await avatarApi.delete(id);
      setAvatars((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const handlePublishToggle = async (a: AvatarSummary) => {
    if (a.is_published) {
      alert('Unpublishing is not yet supported via UI. Contact your admin.');
      return;
    }
    try {
      const updated = await avatarApi.publish(a.id);
      setAvatars((prev) => prev.map((x) => x.id === a.id ? { ...x, is_published: updated.is_published } : x));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Publish failed. Make sure a configuration exists first.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr("myAvatars", lang)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeProgram
              ? `Showing avatars in "${activeProgram.name.en}" — switch to "MyOS" to see all.`
              : "Manage your AI avatars and their configurations"}
          </p>
        </div>
        <Link href="/publisher/avatars/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            {tr("newAvatar", lang)}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
           {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600 mb-2">{error}</p>
          <Button variant="outline" onClick={load}>Retry</Button>
        </div>
      ) : avatars.length === 0 ? (
        <div className="text-center py-16 border rounded-xl border-border bg-card">
          <p className="text-muted-foreground mb-4">No avatars found.</p>
          <Link href="/publisher/avatars/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Create your first avatar
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {avatars.map((avatar) => {
            return (
              <div
                key={avatar.id}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm"
              >
                {/* Header */}
                <div className="relative flex items-center gap-4 bg-sidebar p-5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-sidebar-border bg-muted">
                    {avatar.template_image_url ? (
                        <Image
                            src={avatar.template_image_url}
                            alt={avatar.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                        />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center text-xl font-bold uppercase text-muted-foreground">
                          {avatar.name.charAt(0)}
                        </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sidebar-foreground truncate">{avatar.name}</h3>
                      {avatar.is_published ? (
                        <Badge className="bg-primary/20 text-primary/40 text-[10px]">
                          <Globe className="me-1 h-3 w-3" /> {tr("published", lang)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/60">
                          <Lock className="me-1 h-3 w-3" /> {tr("draft", lang)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-sidebar-foreground/60">{avatar.description || 'No description provided'}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* Template badge */}
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="text-xs text-muted-foreground">
                      {tr("template", lang)}: <span className="font-medium text-foreground">{avatar.template_name || 'Custom'}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/publisher/avatars/${avatar.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 px-3"
                      onClick={() => handlePublishToggle(avatar)}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {avatar.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(avatar.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
