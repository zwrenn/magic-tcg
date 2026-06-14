"use client";

import { useState } from "react";

/**
 * Remove all of your copies of a card from your collection (undo an accidental
 * add). Two-step confirm so it can't fire by mistake.
 */
export function RemoveCardButton({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "done" | "empty">("idle");

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    setState("busy");
    try {
      const res = await fetch("/api/collection/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setState(data.removed > 0 ? "done" : "empty");
    } catch {
      setState("idle");
    }
    setTimeout(() => setState("idle"), 2200);
  }

  if (state === "done")
    return <span className={`text-sm text-good ${className}`}>Removed ✓</span>;
  if (state === "empty")
    return <span className={`text-sm text-muted ${className}`}>Not in your collection</span>;

  if (state === "confirm") {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={remove}
          className="rounded-lg border-2 border-bad/60 px-3 py-1.5 text-sm text-bad hover:bg-bad/10"
        >
          Remove all my copies?
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
      className={`rounded-lg border border-border bg-surface px-4 py-1.5 text-sm text-muted hover:border-bad/60 hover:text-bad ${className}`}
    >
      Remove from collection
    </button>
  );
}
