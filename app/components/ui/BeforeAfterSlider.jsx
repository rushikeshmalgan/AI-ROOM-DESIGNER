'use client';

import { useCallback, useRef, useState } from 'react';

// Draggable before/after comparison. Fixed aspect-ratio wrapper avoids
// layout shift while images load; position is stored as a percentage so
// it works at any width (desktop, mobile, resized).
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className = '',
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      setPosition((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight') {
      setPosition((p) => Math.min(100, p + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[4/3] overflow-hidden rounded-lg select-none touch-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerLeave={stopDragging}
    >
      {/* After image fills the whole frame */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
        {afterLabel}
      </div>

      {/* Before image fills the same frame as After, clipped from the
          right so only the portion left of the handle shows. clip-path
          (not a shrunk wrapper) avoids needing a measured pixel width,
          so it stays correct through any resize with no layout shift. */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />
      {position > 15 && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {beforeLabel}
        </div>
      )}

      {/* Drag handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparison position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={onKeyDown}
        className="absolute bottom-0 top-0 w-0.5 cursor-ew-resize bg-white/90 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{ left: `calc(${position}% - 1px)` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
