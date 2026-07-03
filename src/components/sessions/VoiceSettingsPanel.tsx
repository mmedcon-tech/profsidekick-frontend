"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Mic, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useVoicePreferences } from "@/hooks/useVoicePreferences";
import { useVoiceCatalog } from "@/hooks/useVoiceCatalog";
import { useVoiceProviderAvailability } from "@/hooks/useVoiceProviderAvailability";
import type { VoiceProvider } from "@/types/types";

/** Matches the average-speech-rate heuristic used server-side for the
 * session-start credit-floor check (app/api/sessions/api.py eligibility). */
const ESTIMATED_CHARS_PER_MINUTE = 600;

const PROVIDER_LABELS: Record<VoiceProvider, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
};

const PROVIDER_NOTES: Record<VoiceProvider, string> = {
  openai: "Included in standard credits",
  elevenlabs: "Higher quality, richer dialect support — uses premium credits",
};

function formatCostPerMinute(costPer1kCharsUsd: string | undefined): string | null {
  if (!costPer1kCharsUsd) return null;
  const rate = parseFloat(costPer1kCharsUsd);
  if (!Number.isFinite(rate)) return null;
  const perMinute = (rate * ESTIMATED_CHARS_PER_MINUTE) / 1000;
  return `~$${perMinute.toFixed(3)} / minute`;
}

export interface VoiceSettingsPanelProps {
  open: boolean;
  /** Called once the subscriber is done here (skip, reset, or save) — safe to start the session. */
  onDone: () => void;
}

export default function VoiceSettingsPanel({ open, onDone }: VoiceSettingsPanelProps) {
  const { data, isLoading, error, saveOverride, clearOverride, isSaving } =
    useVoicePreferences();
  const { availability } = useVoiceProviderAvailability();

  const [mode, setMode] = useState<"default" | "customize">("default");
  const [provider, setProvider] = useState<VoiceProvider>("elevenlabs");
  const [dialect, setDialect] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seed local selection from the resolved/saved preference once loaded.
  useEffect(() => {
    if (!data) return;
    if (data.preference && data.preference.is_valid && data.preference.voice_id) {
      setMode("customize");
      setProvider(data.preference.provider);
      setDialect(data.preference.dialect ?? "");
      setVoiceId(data.preference.voice_id);
    } else {
      setMode("default");
      setProvider(data.resolved.provider);
    }
  }, [data]);

  // Validation: never let the picker rest on a provider the availability
  // check has flagged as unavailable — reroute to OpenAI automatically
  // rather than let the subscriber pick it and hit a silent failure later.
  useEffect(() => {
    if (availability && !availability[provider].available) {
      setProvider("openai");
    }
  }, [availability, provider]);

  const { catalog, isLoading: catalogLoading } = useVoiceCatalog(
    mode === "customize" ? provider : null,
  );

  const dialectOptions = useMemo(() => {
    const all = new Set<string>();
    catalog?.voices.forEach((v) => v.dialects.forEach((d) => all.add(d)));
    return Array.from(all).sort();
  }, [catalog]);

  const voiceOptions = useMemo(() => {
    if (!catalog) return [];
    if (!dialect) return catalog.voices;
    return catalog.voices.filter((v) => v.dialects.includes(dialect));
  }, [catalog, dialect]);

  // Keep the voice selection valid as provider/dialect change.
  useEffect(() => {
    if (voiceOptions.length === 0) {
      setVoiceId("");
      return;
    }
    if (!voiceOptions.some((v) => v.id === voiceId)) {
      setVoiceId(voiceOptions[0].id);
    }
  }, [voiceOptions, voiceId]);

  const costPerMinute = formatCostPerMinute(catalog?.cost_per_1k_characters_usd);

  const handleSkip = () => {
    onDone();
  };

  const handleUseInstructorDefault = async () => {
    setSaveError(null);
    const result = await clearOverride();
    if (!result.success) {
      setSaveError(result.error ?? "Failed to reset to instructor default");
      return;
    }
    onDone();
  };

  const handleSave = async () => {
    if (mode === "default") {
      onDone();
      return;
    }
    if (!voiceId) {
      setSaveError("Choose a voice before continuing.");
      return;
    }
    setSaveError(null);
    const result = await saveOverride(provider, voiceId, dialect || undefined);
    if (!result.success) {
      setSaveError(result.error ?? "Failed to save your voice preference");
      return;
    }
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Session Voice
          </DialogTitle>
          <DialogDescription>
            Choose how your instructor&apos;s assistant sounds for this session, or keep the
            default.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your voice settings…
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-muted-foreground">
            Couldn&apos;t load voice settings — your instructor&apos;s default voice will be
            used.
          </p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setMode("default")}
                aria-pressed={mode === "default"}
                className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                  mode === "default"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <p className="font-medium text-foreground">Use instructor default</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Configured by your instructor
                  {data?.resolved.source === "publisher" && data.resolved.provider
                    ? ` (${PROVIDER_LABELS[data.resolved.provider]})`
                    : ""}
                </p>
                {data?.resolved.provider === "elevenlabs" &&
                  availability &&
                  !availability.elevenlabs.available && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Currently unavailable — service issue on our end. A standard voice will
                        be used instead.
                      </span>
                    </p>
                  )}
              </button>
              <button
                type="button"
                onClick={() => setMode("customize")}
                aria-pressed={mode === "customize"}
                className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                  mode === "customize"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Customize my voice
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pick your own provider, dialect &amp; voice
                </p>
              </button>
            </div>

            {mode === "customize" && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="voice-provider">Provider</Label>
                  <select
                    id="voice-provider"
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value as VoiceProvider);
                      setDialect("");
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="openai">OpenAI voices</option>
                    <option value="elevenlabs" disabled={availability ? !availability.elevenlabs.available : false}>
                      ElevenLabs voices
                      {availability && !availability.elevenlabs.available
                        ? " — Currently unavailable — service issue on our end"
                        : ""}
                    </option>
                  </select>
                  <p className="text-xs text-muted-foreground">{PROVIDER_NOTES[provider]}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="voice-dialect">Dialect</Label>
                  <select
                    id="voice-dialect"
                    value={dialect}
                    onChange={(e) => setDialect(e.target.value)}
                    disabled={catalogLoading || dialectOptions.length === 0}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">Any dialect</option>
                    {dialectOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="voice-id">Voice</Label>
                  <select
                    id="voice-id"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    disabled={catalogLoading || voiceOptions.length === 0}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {voiceOptions.length === 0 && <option value="">No voices available</option>}
                    {voiceOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {costPerMinute && (
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    Estimated cost: <span className="font-medium text-foreground">{costPerMinute}</span>
                  </p>
                )}
              </div>
            )}

            {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            {data?.preference && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUseInstructorDefault}
                disabled={isSaving}
              >
                Reset to instructor default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || (mode === "customize" && !voiceId)}
              aria-busy={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Start Session"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
