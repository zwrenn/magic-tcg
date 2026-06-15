"use client";

import { useState } from "react";
import Link from "next/link";
import { ColorDots } from "./mana";
import { GlitterField } from "./glitter-field";
import type { BuildableDeck } from "@/lib/decks";

// Title-bar gradients matched to the design mock.
const BAR: Record<string, string> = {
  W: "linear-gradient(180deg,#e1d0a8,#c9b58a)",
  U: "linear-gradient(180deg,#3f6f8f,#274d6a)",
  B: "linear-gradient(180deg,#5a5550,#332f2b)",
  R: "linear-gradient(180deg,#c4503a,#8a2f1e)",
  G: "linear-gradient(180deg,#56823f,#345226)",
  GOLD: "linear-gradient(180deg,#c9a44c,#9a7a2e)",
  WOOD: "linear-gradient(180deg,#3c2b16,#2c1f10)",
};

/** A deck's representative title color from its identity (mono → its color;
    multicolor-with-white → gold; else first of U·G·R·B; colorless → wood). */
function barGradient(colors: string): string {
  const p = colors.split(",").filter(Boolean);
  if (p.length === 0) return BAR.WOOD;
  if (p.length === 1) return BAR[p[0]] ?? BAR.WOOD;
  if (p.includes("W")) return BAR.GOLD;
  for (const c of ["U", "G", "R", "B"]) if (p.includes(c)) return BAR[c];
  return BAR.GOLD;
}

type Sort = "recent" | "az" | "owned";

export function DeckGrid({ decks }: { decks: BuildableDeck[] }) {
  const [sort, setSort] = useState<Sort>("recent");

  const sorted = [...decks].sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name);
    if (sort === "owned") return b.coveragePct - a.coveragePct;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-hero text-3xl">
          Your Decks{" "}
          <span className="lcd lcd-green ml-1 align-middle text-xl">×{decks.length}</span>
        </h2>
        <div className="flex items-center gap-1">
          <span className="t-label mr-1">Sort</span>
          {(["recent", "az", "owned"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              aria-current={sort === s ? "page" : undefined}
              className={`rounded-full border-[3px] px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
                sort === s
                  ? "border-white bg-[linear-gradient(180deg,#b48bff,#9b6cff)] text-white shadow-[0_3px_0_rgba(122,79,224,0.5)]"
                  : "border-[var(--border)] bg-surface text-muted hover:border-[var(--purple)] hover:-translate-y-0.5"
              }`}
            >
              {s === "az" ? "A–Z" : s}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {sorted.map((d) => (
          <li key={d.id}>
            <DeckCard deck={d} />
          </li>
        ))}
        <li>
          <Link
            href="/decks/new"
            className="hover-pop flex h-full min-h-[260px] flex-col items-center justify-center gap-2 rounded-[18px] border-[3px] border-dashed border-[var(--purple)] bg-[var(--surface)]/60 text-center transition hover:bg-[var(--surface-2)]"
          >
            <span className="float text-4xl text-[var(--purple)]">✨</span>
            <span className="t-hero text-xl text-[var(--purple-deep)]">Build a New Deck</span>
            <span className="text-sm text-muted">Paste · Archidekt · Commander</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function DeckCard({ deck: d }: { deck: BuildableDeck }) {
  return (
    <div className="card hover-pop flex h-full flex-col overflow-hidden !p-0">
      {/* Title bar (mana-colored) */}
      <div
        className="glitter-base relative flex items-center justify-between gap-2 overflow-hidden border-b-[3px] border-white px-3 py-2"
        style={{ background: barGradient(d.colors) }}
      >
        <GlitterField density={1.6} />
        <h3
          className="relative z-[5] flex min-w-0 items-center gap-1.5 truncate text-base text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
          title={d.name}
        >
          <span className="truncate">{d.name}</span>
          {d.coveragePct >= 90 && (
            <span className="pixel shrink-0 rounded bg-[#d23a1e] px-1 text-[10px] text-white">
              HOT
            </span>
          )}
        </h3>
        <ColorDots identity={d.colors} className="relative z-[5] shrink-0 text-base" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        {/* Art */}
        <Link href={`/decks/${d.id}`} className="block">
          {d.commanderImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.commanderImage}
              alt={d.commander ?? d.name}
              loading="lazy"
              className="aspect-[16/10] w-full rounded-lg border-2 border-[var(--border)] object-cover object-top"
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border-[3px] border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] text-sm text-muted">
              ✨ no commander art ✨
            </div>
          )}
        </Link>

        {/* Subtitle */}
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="truncate text-sm italic text-muted">
            {d.commander ?? "—"}
          </span>
          <span className="pixel shrink-0 text-xs uppercase text-subtle">{d.source}</span>
        </div>

        {/* Pod owns progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="t-label">Pod owns</span>
            <span className="font-bold text-[var(--accent)]">
              {d.covered}/{d.total}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full border-2 border-[var(--border-strong)] bg-[#e3d3a4]">
            <div
              className="h-full rounded-full bg-gradient-to-b from-[#7cce4e] to-[#4e9e2c]"
              style={{ width: `${d.coveragePct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/decks/${d.id}`} className="gel gel-green flex-1">
            View Deck →
          </Link>
        </div>
      </div>
    </div>
  );
}
