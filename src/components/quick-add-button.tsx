"use client";

import { useState } from "react";

/**
 * One-click "add this card to my collection" (any printing). Used in search
 * results and the card-zoom overlay so you can add from anywhere.
 */
export function QuickAddButton({
  name,
  className = "",
  label = "+ Add",
  onAdded,
}: {
  name: string;
  className?: string;
  label?: string;
  onAdded?: () => void;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch("/api/collection/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setState("error");
      } else {
        setState("done");
        onAdded?.();
      }
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 1800);
    }
  }

  return (
    <button
      onClick={add}
      disabled={state === "busy"}
      title="Add one to my collection"
      className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        state === "done"
          ? "border-good/60 text-good"
          : state === "error"
            ? "border-bad/60 text-bad"
            : "border-border text-muted hover:border-accent/60 hover:text-accent"
      } ${className}`}
    >
      {state === "busy" ? "Adding…" : state === "done" ? "Added ✓" : state === "error" ? "Failed" : label}
    </button>
  );
}
