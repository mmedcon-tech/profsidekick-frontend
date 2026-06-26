'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, ImageIcon, Square, Volume2 } from 'lucide-react';
import PortraitAvatarStage from '@/components/avatar/PortraitAvatarStage';
import { useSpeechPreview } from '@/hooks/useSpeechPreview';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';
import type { GlbFraming } from '@/components/avatar/GlbAvatarPreview';

const GlbAvatarPreview = dynamic(
  () => import('@/components/avatar/GlbAvatarPreview'),
  { ssr: false },
);

type ShowcaseTab = 'portrait' | 'model3d';

interface AvatarShowcaseProps {
  entry: Pick<
    AvatarLibraryEntry,
    | 'name'
    | 'thumbnailPath'
    | 'glbPath'
    | 'lipSync'
    | 'previewFraming'
    | 'previewFitMargin'
    | 'previewModelScale'
  >;
  className?: string;
  defaultTab?: ShowcaseTab;
}

export default function AvatarShowcase({
  entry,
  className = '',
  defaultTab = 'portrait',
}: AvatarShowcaseProps): React.ReactElement {
  const [tab, setTab] = useState<ShowcaseTab>(defaultTab);
  const speechPreview = useSpeechPreview(entry.name);
  const widgetState = speechPreview.active ? ('speaking' as const) : ('idle' as const);
  const framing: GlbFraming = entry.previewFraming ?? 'full';
  const fitMargin = entry.previewFitMargin ?? 1.05;
  const modelScale = entry.previewModelScale ?? 1.15;

  return (
    <div className={`relative flex min-h-[520px] flex-col ${className}`}>
      <div className="absolute left-5 top-5 z-20 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('portrait')}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'portrait'
              ? 'bg-white text-[#133221]'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <ImageIcon size={12} /> Portrait
        </button>
        <button
          type="button"
          onClick={() => setTab('model3d')}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'model3d'
              ? 'bg-white text-[#133221]'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Box size={12} /> 3D model
        </button>
      </div>

      <div className="relative min-h-[520px] flex-1">
        {tab === 'portrait' ? (
          <PortraitAvatarStage
            imageUrl={entry.thumbnailPath}
            avatarName={entry.name}
            widgetState={widgetState}
            amplitude={speechPreview.amplitude}
          />
        ) : (
          <GlbAvatarPreview
            glbUrl={entry.glbPath}
            lipSyncHints={entry.lipSync}
            visemeRef={speechPreview.visemeRef}
            amplitude={speechPreview.amplitude}
            showControls
            framing={framing}
            fitMargin={fitMargin}
            modelScale={modelScale}
          />
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
        <button
          type="button"
          onClick={speechPreview.toggle}
          disabled={speechPreview.loading}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-colors disabled:cursor-wait disabled:opacity-80 ${
            speechPreview.active
              ? 'bg-white text-[#133221] hover:bg-gray-100'
              : 'bg-[#133221] text-white hover:bg-[#0a1e13]'
          }`}
        >
          {speechPreview.loading ? (
            <>Preparing voice…</>
          ) : speechPreview.active ? (
            <>
              <Square size={14} /> Stop preview
            </>
          ) : (
            <>
              <Volume2 size={14} /> Preview how they talk
            </>
          )}
        </button>
      </div>
    </div>
  );
}
