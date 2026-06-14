"use client";

import { useState } from "react";

/**
 * The signed-in player chip. Intentionally does NOT let you switch to another
 * profile (that risks uploading cards under the wrong person) — to change who
 * you are, log out and re-pick at the gate.
 */
export function UserSwitch({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" });
    window.location.assign("/gate");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm hover:border-accent/60"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-black">
          {current[0]}
        </span>
        <span className="font-medium">{current}</span>
        <span className="text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted">
            Signed in as {current}
          </div>
          <button
            disabled={busy}
            onClick={logout}
            className="block w-full px-3 py-2 text-left text-sm text-bad hover:bg-surface-2"
          >
            ⎋ Log out
          </button>
        </div>
      )}
    </div>
  );
}
