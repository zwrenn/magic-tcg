"use client";

import { useState } from "react";

export function UserSwitch({
  current,
  members,
}: {
  current: string;
  members: string[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(name: string) {
    if (name === current) return setOpen(false);
    setBusy(true);
    await fetch("/api/switch-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    window.location.reload();
  }

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
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted">
            Switch profile
          </div>
          {members.map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => pick(m)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                m === current ? "text-accent" : ""
              }`}
            >
              {m}
            </button>
          ))}
          <div className="my-1 border-t border-border" />
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
