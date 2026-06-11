"use client";

import { useState } from "react";

/**
 * Small card thumbnail that reveals the full Scryfall image on hover (desktop)
 * or tap (mobile). Image is lazy-loaded.
 */
export function CardThumb({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="h-12 w-9 rounded-[3px] border border-border object-cover"
        />
      ) : (
        <div className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">
          no img
        </div>
      )}
      {show && image && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-2 sm:left-12 sm:top-1/2 sm:-translate-x-0 sm:-translate-y-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={name}
            className="w-56 max-w-[60vw] rounded-xl border border-border shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
