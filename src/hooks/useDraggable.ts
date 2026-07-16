'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragOffset {
  x: number;
  y: number;
}

export interface UseDraggableResult {
  /** Attach to the element that should move. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Translate offset to apply, e.g. `transform: translate(x, y)`. */
  offset: DragOffset;
  /** True while an actual drag (past the threshold) is in progress. */
  isDragging: boolean;
  /** Spread onto the drag handle (header, launcher, …). */
  dragHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    style: React.CSSProperties;
  };
  /** Whether the last pointer interaction was a drag — used to suppress the click. */
  wasDragged: () => boolean;
  /** Re-clamp the current offset into the viewport (call on open / resize). */
  reclamp: () => void;
}

const DRAG_THRESHOLD = 4; // px before a press becomes a drag
const EDGE_MARGIN = 8; // keep this much of a gap from the viewport edge

/**
 * Makes a fixed-position element freely draggable via a handle.
 *
 * The element keeps its CSS anchor (e.g. `bottom-5 end-5`); we only apply a
 * translate offset on top, so it stays docked by default and remembers where
 * the user dropped it (optionally persisted to localStorage). The offset is
 * clamped so the element can never be dragged off-screen.
 */
export function useDraggable(storageKey?: string): UseDraggableResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const draggedRef = useRef(false);

  // Clamp a candidate offset so the element stays inside the viewport. Reads
  // the live rect and subtracts the current offset to find the untransformed
  // anchor position, so it works regardless of which CSS edge it's docked to.
  const clamp = useCallback((next: DragOffset): DragOffset => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return next;
    const rect = el.getBoundingClientRect();
    const cur = offsetRef.current;
    const anchorLeft = rect.left - cur.x;
    const anchorTop = rect.top - cur.y;
    const minX = EDGE_MARGIN - anchorLeft;
    const maxX = window.innerWidth - EDGE_MARGIN - rect.width - anchorLeft;
    const minY = EDGE_MARGIN - anchorTop;
    const maxY = window.innerHeight - EDGE_MARGIN - rect.height - anchorTop;
    return {
      x: Math.min(Math.max(next.x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(next.y, minY), Math.max(minY, maxY)),
    };
  }, []);

  const reclamp = useCallback(() => {
    setOffset((prev) => clamp(prev));
  }, [clamp]);

  // Restore a persisted position once on mount.
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setOffset(clamp(JSON.parse(raw) as DragOffset));
    } catch {
      /* ignore malformed storage */
    }
  }, [storageKey, clamp]);

  // Keep the widget on-screen when the viewport is resized.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [reclamp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // primary button only
      const start = { x: e.clientX, y: e.clientY };
      const base = { ...offsetRef.current };
      let dragging = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (!dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          dragging = true;
          draggedRef.current = true;
          setIsDragging(true);
        }
        setOffset(clamp({ x: base.x + dx, y: base.y + dy }));
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (dragging) {
          setIsDragging(false);
          if (storageKey) {
            try {
              window.localStorage.setItem(storageKey, JSON.stringify(offsetRef.current));
            } catch {
              /* ignore quota / private-mode errors */
            }
          }
          // Reset after the click event has had a chance to fire & be guarded.
          window.setTimeout(() => {
            draggedRef.current = false;
          }, 0);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [clamp, storageKey],
  );

  const wasDragged = useCallback(() => draggedRef.current, []);

  return {
    containerRef,
    offset,
    isDragging,
    dragHandleProps: { onPointerDown, style: { touchAction: 'none' } },
    wasDragged,
    reclamp,
  };
}
