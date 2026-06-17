"use client";

import React, { useEffect, useState } from 'react';
import type { ThemeConfig } from '@/lib/v2/data';

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return null;
  }

  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0, s = 0;
  const l = (cmax + cmin) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (cmax === r)      h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else                 h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return { h, s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
}

function hslStr({ h, s, l }: { h: number; s: number; l: number }): string {
  return `${h} ${s}% ${l}%`;
}

function shifted(hsl: { h: number; s: number; l: number }, deltaL: number) {
  return hslStr({ ...hsl, l: Math.max(0, Math.min(100, hsl.l + deltaL)) });
}

interface ThemeConfigProviderProps {
  themeConfig?: ThemeConfig | null;
  children: React.ReactNode;
}

export function ThemeConfigProvider({ themeConfig, children }: ThemeConfigProviderProps) {
  const [styles, setStyles] = useState<string>('');

  useEffect(() => {
    if (!themeConfig) {
      setStyles('');
      return;
    }

    const primary   = themeConfig.primaryColor   ? hexToHsl(themeConfig.primaryColor)   : null;
    const secondary = themeConfig.secondaryColor ? hexToHsl(themeConfig.secondaryColor) : null;

    if (!primary) {
      setStyles('');
      return;
    }

    // Sidebar text is always white — works for dark primaries (navy, slate, etc.)
    // Active sidebar item: slightly lighter than the sidebar background
    // Sidebar border: slightly darker than the sidebar background
    const css = `:root {
      /* ── Content area ── */
      --primary:             ${hslStr(primary)};
      --primary-foreground:  0 0% 100%;
      --ring:                ${hslStr(primary)};
      ${secondary ? `
      --secondary:           ${hslStr(secondary)};
      --secondary-foreground: 220 25% 15%;
      --accent:              ${hslStr(secondary)};
      --accent-foreground:   220 25% 15%;
      ` : ''}

      /* ── Sidebar — primary color as background ── */
      --sidebar:             ${hslStr(primary)};
      --sidebar-foreground:  0 0% 98%;
      --sidebar-accent:      ${shifted(primary, +10)};
      --sidebar-accent-foreground: 0 0% 98%;
      --sidebar-primary:     ${secondary ? hslStr(secondary) : shifted(primary, +30)};
      --sidebar-primary-foreground: 220 25% 15%;
      --sidebar-border:      ${shifted(primary, -5)};
      --sidebar-ring:        ${secondary ? hslStr(secondary) : shifted(primary, +30)};
    }`;

    setStyles(css);
  }, [themeConfig]);

  return (
    <>
      {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      {children}
    </>
  );
}
