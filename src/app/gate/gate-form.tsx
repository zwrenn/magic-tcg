"use client";

import { useState } from "react";

export function GateForm({
  members,
  next,
  requirePass = true,
}: {
  members: string[];
  next: string;
  requirePass?: boolean;
}) {
  const [name, setName] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name) return setError("Pick who you are first.");
    setBusy(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, passphrase }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      // Hard navigate so the new cookies are picked up by middleware.
      window.location.assign(next);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-surface p-6 shadow-xl"
    >
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
        Who are you?
      </label>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {members.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setName(m)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
              name === m
                ? "border-accent bg-accent text-black"
                : "border-border bg-surface-2 text-foreground hover:border-accent/60"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {requirePass && (
        <>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
            Passphrase
          </label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="current-password"
            className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="shared pod passphrase"
          />
        </>
      )}

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Entering…" : "Enter the pod"}
      </button>
    </form>
  );
}
