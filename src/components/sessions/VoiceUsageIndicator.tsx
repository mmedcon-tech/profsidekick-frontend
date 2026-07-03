"use client";

import { AlertTriangle, Mic } from "lucide-react";
import type { VoiceProvider } from "@/types/types";

export type VoiceFallbackReason = "platform_unavailable" | "user_low_credits";

export interface VoiceUsageIndicatorProps {
  provider: VoiceProvider | null;
  creditsUsed: number;
  /** Non-null for the rest of the session once a fallback has occurred — a
   * persistent banner, not a toast, so the subscriber always knows their
   * active voice changed and why. */
  fallbackReason?: VoiceFallbackReason | null;
}

const PROVIDER_LABELS: Record<VoiceProvider, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
};

const FALLBACK_MESSAGES: Record<VoiceFallbackReason, string> = {
  platform_unavailable:
    "Premium voice temporarily unavailable — this is on our end, not yours. Continuing with a standard voice.",
  user_low_credits: "Low credits — switched to a lower-cost voice for the rest of this session.",
};

/** Persistent in-session indicator: active TTS provider + running credit cost. */
export default function VoiceUsageIndicator({
  provider,
  creditsUsed,
  fallbackReason,
}: VoiceUsageIndicatorProps) {
  if (!provider) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
      >
        <Mic className="h-3 w-3 text-primary" aria-hidden="true" />
        <span className="font-medium text-foreground">{PROVIDER_LABELS[provider]}</span>
        <span aria-hidden="true">·</span>
        <span>{creditsUsed.toFixed(2)} credits used</span>
      </div>

      {fallbackReason && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{FALLBACK_MESSAGES[fallbackReason]}</span>
        </div>
      )}
    </div>
  );
}
