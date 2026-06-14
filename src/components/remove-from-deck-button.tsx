"use client";

import { useState } from "react";

/**
 * Remove a card from a deck (owner only). Two-step confirm so it can't fire by
 * mistake. Calls onRemoved on success so the parent can refresh + close.
 */
export function RemoveFromDeckButton({
  deckId,
  normalizedName,
  onRemoved,
}: {
  deckId: number;
  normalizedName: string;
  onRemoved: () => void;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "busy">("idle");

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    setState("busy");
    try {
      const res = await fetch("/api/decks/cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, normalizedName }),
      });
      if (res.ok) {
        onRemoved();
        return;
      }
    } catch {
      /* fall through */
    }
    setState("idle");
  }

  if (state === "confirm") {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={remove}
          className="rounded-lg border-2 border-bad/60 px-3 py-1.5 text-sm text-bad hover:bg-bad/10"
        >
          Remove from deck?
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setState("idle"); }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setState("confirm"); }}
      disabled={state === "busy"}
      className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm text-muted transition hover:border-bad/60 hover:text-bad disabled:opacity-50"
    >
      {state === "busy" ? "Removing…" : "Remove from deck"}
    </button>
  );
}
