"use client";

import { useRef, useState } from "react";

type Preview = {
  oldCount: number;
  newDistinct: number;
  newTotalQuantity: number;
  rawRowCount: number;
  warnings: string[];
};

type Progress =
  | { stage: "enriching"; done: number; total: number }
  | { stage: "writing" }
  | {
      stage: "done";
      oldCount: number;
      newDistinct: number;
      newTotalQuantity: number;
      unresolved: number;
    }
  | { stage: "error"; message: string };

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setProgress(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runPreview(f: File) {
    setBusy(true);
    setError(null);
    setPreview(null);
    setProgress(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't read that CSV.");
      } else {
        setPreview(data);
      }
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress({ stage: "enriching", done: 0, total: preview?.newDistinct ?? 0 });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import/commit", { method: "POST", body: fd });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Import failed.");
        setBusy(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const p = JSON.parse(line) as Progress;
          setProgress(p);
          if (p.stage === "error") setError(p.message);
        }
      }
    } catch {
      setError("Import stream interrupted. Re-run — cards already fetched are cached.");
    } finally {
      setBusy(false);
    }
  }

  const done = progress?.stage === "done" ? progress : null;
  const enriching = progress?.stage === "enriching" ? progress : null;

  return (
    <div className="space-y-5">
      {/* File picker */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface px-6 py-10 text-center transition hover:border-accent/60 ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setPreview(null);
            setProgress(null);
            setError(null);
            if (f) runPreview(f);
          }}
        />
        <span className="text-sm font-medium">
          {file ? file.name : "Choose your ManaBox CSV export"}
        </span>
        <span className="mt-1 text-xs text-muted">
          {file ? "Click to pick a different file" : "Click to browse"}
        </span>
      </label>

      {error && (
        <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}

      {/* Preview / confirm */}
      {preview && !progress && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold">Confirm full re-sync</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Your collection now" value={preview.oldCount.toLocaleString()} sub="distinct entries" />
            <Stat
              label="After import"
              value={preview.newDistinct.toLocaleString()}
              sub={`${preview.newTotalQuantity.toLocaleString()} cards total`}
              accent
            />
          </div>
          {preview.warnings.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-warn">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">
            This <strong>replaces</strong> your entire collection. The first import
            of new cards may take a bit while we fetch card data from Scryfall.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={commit}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              Replace my collection
            </button>
            <button
              onClick={reset}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && !done && progress.stage !== "error" && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">
              {enriching ? "Fetching card data from Scryfall…" : "Saving to your collection…"}
            </span>
            {enriching && enriching.total > 0 && (
              <span className="text-muted">
                {enriching.done}/{enriching.total}
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: enriching
                  ? `${enriching.total ? Math.round((enriching.done / enriching.total) * 100) : 5}%`
                  : "92%",
              }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="rounded-xl border border-good/40 bg-good/10 p-5">
          <h3 className="mb-2 text-sm font-semibold text-good">Collection updated ✓</h3>
          <p className="text-sm">
            {done.oldCount.toLocaleString()} → {done.newDistinct.toLocaleString()} distinct
            entries ({done.newTotalQuantity.toLocaleString()} cards total).
            {done.unresolved > 0 && (
              <span className="text-warn">
                {" "}
                {done.unresolved} row(s) couldn&apos;t be matched on Scryfall and were skipped.
              </span>
            )}
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="/collection"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              View my cards
            </a>
            <button
              onClick={reset}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2"
            >
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? "text-accent" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
