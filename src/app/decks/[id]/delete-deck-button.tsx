"use client";

import { useState } from "react";
import { deleteDeckAction } from "../actions";

export function DeleteDeckButton({ deckId }: { deckId: number }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-bad/60 hover:text-bad"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={deleteDeckAction} className="flex items-center gap-2">
      <input type="hidden" name="deckId" value={deckId} />
      <span className="text-sm text-bad">Delete this deck?</span>
      <button
        type="submit"
        className="rounded-md bg-bad px-3 py-1 text-sm font-semibold text-white hover:opacity-90"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-surface-2"
      >
        Cancel
      </button>
    </form>
  );
}
