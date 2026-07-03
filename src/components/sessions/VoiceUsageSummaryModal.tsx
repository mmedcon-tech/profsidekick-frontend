"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VoiceProvider } from "@/types/types";

export interface VoiceUsageBreakdownEntry {
  characters: number;
  credits: number;
}

export interface VoiceUsageSummaryModalProps {
  open: boolean;
  usageByProvider: Partial<Record<VoiceProvider, VoiceUsageBreakdownEntry>>;
  balance: number | null;
  onContinue: () => void;
}

const PROVIDER_LABELS: Record<VoiceProvider, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
};

/** Post-session summary: total credits used, provider breakdown, remaining balance. */
export default function VoiceUsageSummaryModal({
  open,
  usageByProvider,
  balance,
  onContinue,
}: VoiceUsageSummaryModalProps) {
  const entries = Object.entries(usageByProvider) as [VoiceProvider, VoiceUsageBreakdownEntry][];
  const totalCredits = entries.reduce((sum, [, usage]) => sum + usage.credits, 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onContinue()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Session Voice Usage</DialogTitle>
          <DialogDescription>Here&apos;s what this session&apos;s voice responses cost.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <span className="text-sm text-muted-foreground">Total credits used</span>
            <span className="text-lg font-semibold text-foreground">{totalCredits.toFixed(2)}</span>
          </div>

          {entries.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {entries.map(([provider, usage]) => (
                <li
                  key={provider}
                  className="flex items-center justify-between text-muted-foreground"
                >
                  <span>{PROVIDER_LABELS[provider]}</span>
                  <span className="text-foreground">
                    {usage.credits.toFixed(2)} credits ({usage.characters} chars)
                  </span>
                </li>
              ))}
            </ul>
          )}

          {balance !== null && (
            <p className="text-xs text-muted-foreground">
              Remaining balance:{" "}
              <span className="font-medium text-foreground">{balance.toFixed(2)} credits</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onContinue}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
