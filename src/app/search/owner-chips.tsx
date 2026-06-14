"use client";

import { useState } from "react";

type Owner = { name: string; qty: number; foil: boolean };

/**
 * Owner chips for a search result. Each non-you owner is a button that sends
 * them a borrow request. Shows whether their copy is free or in their deck.
 */
export function SearchOwnerChips({
  cardName,
  owners,
  viewerName,
  decksByOwner,
}: {
  cardName: string;
  owners: Owner[];
  viewerName: string;
  decksByOwner: Record<string, string[]>;
}) {
  const [asked, setAsked] = useState<Set<string>>(new Set());

  async function ask(name: string) {
    setAsked((s) => new Set(s).add(name));
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUser: name, cardName }),
      });
    } catch {
      /* optimistic */
    }
  }

  if (owners.length === 0) {
    return <span className="text-xs text-muted">nobody has it</span>;
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {owners.map((o) => {
        const mine = o.name === viewerName;
        const decks = decksByOwner[o.name] ?? [];
        const committed = decks.length > 0;
        const didAsk = asked.has(o.name);

        if (mine) {
          return (
            <span key={o.name} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
              you ×{o.qty}
              {o.foil ? " ✦" : ""}
              {committed ? " · 🃏 in deck" : ""}
            </span>
          );
        }

        return (
          <button
            key={o.name}
            disabled={didAsk}
            onClick={() => ask(o.name)}
            title={
              didAsk
                ? "Request sent"
                : committed
                  ? `${o.name}'s copy is in ${decks.join(", ")} — ask anyway?`
                  : `Ask ${o.name} to borrow this`
            }
            className={`rounded-full px-2 py-0.5 text-xs transition ${
              didAsk
                ? "bg-good/20 text-[var(--green-deep)]"
                : committed
                  ? "bg-[var(--purple)]/15 text-[var(--purple-deep)] hover:brightness-95"
                  : "bg-good/15 text-[var(--green-deep)] hover:brightness-95"
            }`}
          >
            {o.name} ×{o.qty}
            {o.foil ? " ✦" : ""}
            {committed ? " · 🃏" : ""}
            {didAsk ? " ✓ asked" : " · 🙋 ask"}
          </button>
        );
      })}
    </div>
  );
}
