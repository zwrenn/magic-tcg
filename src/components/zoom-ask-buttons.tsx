"use client";

import { useState } from "react";

type Owner = { name: string; qty: number; foil: boolean };

/**
 * Borrow-ask buttons for the zoomed card. Shows each owner; the viewer's own
 * copy is a plain badge, everyone else is an "ask" button that sends a request
 * (de-duped server-side). Seeds "✓ asked" from pending requests.
 */
export function ZoomAskButtons({
  owners,
  viewerName,
  cardName,
  deckId,
  initialAsked = [],
}: {
  owners: Owner[];
  viewerName: string;
  cardName: string;
  deckId?: number;
  initialAsked?: string[];
}) {
  const [asked, setAsked] = useState<Set<string>>(() => new Set(initialAsked));
  if (!owners.length) return null;

  async function ask(name: string) {
    setAsked((s) => new Set(s).add(name));
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUser: name, cardName, deckId }),
      });
    } catch {
      /* optimistic */
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {owners.map((o) => {
        if (o.name === viewerName) {
          return (
            <span key={o.name} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-foreground">
              you ×{o.qty}
              {o.foil ? " ✦" : ""}
            </span>
          );
        }
        const didAsk = asked.has(o.name);
        return (
          <button
            key={o.name}
            disabled={didAsk}
            onClick={(e) => { e.stopPropagation(); if (!didAsk) ask(o.name); }}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              didAsk
                ? "bg-good/20 text-[var(--green-deep)]"
                : "bg-[var(--purple)]/15 text-[var(--purple-deep)] hover:brightness-95"
            }`}
          >
            {o.name} ×{o.qty}
            {o.foil ? " ✦" : ""} {didAsk ? "✓ asked" : "🙋 ask"}
          </button>
        );
      })}
    </div>
  );
}
