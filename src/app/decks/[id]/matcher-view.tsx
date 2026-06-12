"use client";

import { useMemo, useState } from "react";
import { CardZoomButton } from "@/components/card-zoom";
import { ManaCost, ColorDots } from "@/components/mana";
import { TYPE_BUCKETS, typeBucket, type TypeBucket } from "@/lib/card-types";
import type { DeckCardMatch } from "@/lib/matcher";

type Section = "full" | "partial" | "none";
type SortKey = "name" | "cmc";

export function MatcherView({
  cards,
  deckOwnerName,
  viewerName,
  members,
}: {
  cards: DeckCardMatch[];
  deckOwnerName: string;
  viewerName: string;
  members: string[];
}) {
  const [excludeOwner, setExcludeOwner] = useState(true);
  const [sort, setSort] = useState<SortKey>("name");
  const [filterType, setFilterType] = useState<TypeBucket | "all">("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  // Apply owner-exclusion, compute availability + section for every card once.
  const rows = useMemo(() => {
    return cards.map((c) => {
      const eff = excludeOwner
        ? c.owners.filter((o) => o.name !== deckOwnerName)
        : c.owners;
      const available = eff.reduce((s, o) => s + o.qty, 0);
      const section: Section =
        available >= c.needed ? "full" : available > 0 ? "partial" : "none";
      return { card: c, eff, available, section, bucket: typeBucket(c.typeLine) };
    });
  }, [cards, excludeOwner, deckOwnerName]);

  // Summary reflects the whole deck (independent of type/owner filters).
  const summary = useMemo(() => {
    const total = rows.length;
    const covered = rows.filter((r) => r.available > 0).length;
    const contrib = new Map<string, number>();
    for (const r of rows) {
      for (const o of r.eff) contrib.set(o.name, (contrib.get(o.name) ?? 0) + 1);
    }
    const ranked = [...contrib.entries()].sort((a, b) => b[1] - a[1]);
    return { total, covered, missing: total - covered, ranked };
  }, [rows]);

  // Visible rows after filters + sort.
  const visible = useMemo(() => {
    let v = rows;
    if (filterType !== "all") v = v.filter((r) => r.bucket === filterType);
    if (filterOwner !== "all")
      v = v.filter((r) => r.eff.some((o) => o.name === filterOwner));
    const sorter = (a: typeof rows[number], b: typeof rows[number]) =>
      sort === "name"
        ? a.card.name.localeCompare(b.card.name)
        : (a.card.cmc ?? 99) - (b.card.cmc ?? 99) ||
          a.card.name.localeCompare(b.card.name);
    return [...v].sort(sorter);
  }, [rows, filterType, filterOwner, sort]);

  const sections: { key: Section; label: string; tone: string }[] = [
    { key: "full", label: "Fully covered", tone: "text-good" },
    { key: "partial", label: "Partially covered", tone: "text-warn" },
    { key: "none", label: "Nobody has it", tone: "text-bad" },
  ];

  function copyMissing() {
    // Buylist = what the pod can't cover: shortfall per card.
    const lines = rows
      .filter((r) => r.available < r.card.needed)
      .sort((a, b) => a.card.name.localeCompare(b.card.name))
      .map((r) => `${r.card.needed - r.available} ${r.card.name}`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const label = (name: string) => (name === viewerName ? "you" : name);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-lg">
          <span className="font-semibold text-accent">{summary.covered}</span> of{" "}
          <span className="font-semibold">{summary.total}</span> cards are in the
          pod
          {summary.ranked.length > 0 && (
            <>
              {" — "}
              {summary.ranked.map(([name, n], i) => (
                <span key={name}>
                  {i > 0 && ", "}
                  <span className="font-medium">{label(name)}</span> has {n}
                </span>
              ))}
            </>
          )}
          .{" "}
          <span className={summary.missing > 0 ? "text-bad" : "text-good"}>
            {summary.missing} missing.
          </span>
        </p>
        {/* Coverage bar */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-good transition-all"
            style={{
              width: `${summary.total ? Math.round((summary.covered / summary.total) * 100) : 0}%`,
            }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          {summary.total ? Math.round((summary.covered / summary.total) * 100) : 0}% of
          the deck is covered by the pod
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={excludeOwner}
            onChange={(e) => setExcludeOwner(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Exclude {deckOwnerName}&apos;s own cards
        </label>

        <Select
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          label="Sort"
          options={[
            { value: "name", label: "Name" },
            { value: "cmc", label: "Mana value" },
          ]}
        />
        <Select
          value={filterType}
          onChange={(v) => setFilterType(v as TypeBucket | "all")}
          label="Type"
          options={[
            { value: "all", label: "All types" },
            ...TYPE_BUCKETS.map((b) => ({ value: b, label: b })),
          ]}
        />
        <Select
          value={filterOwner}
          onChange={setFilterOwner}
          label="Owner"
          options={[
            { value: "all", label: "Anyone" },
            ...members.map((m) => ({ value: m, label: label(m) })),
          ]}
        />

        <button
          onClick={copyMissing}
          className="ml-auto rounded-lg border border-border bg-surface px-3 py-1.5 hover:border-accent/60"
        >
          {copied ? "Copied ✓" : "Copy missing cards"}
        </button>
      </div>

      {/* Sections */}
      {sections.map((s) => {
        const items = visible.filter((r) => r.section === s.key);
        if (items.length === 0) return null;
        return (
          <section key={s.key}>
            <h2 className={`mb-2 text-sm font-semibold ${s.tone}`}>
              {s.label}{" "}
              <span className="text-muted">({items.length})</span>
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {items.map((r) => (
                <li
                  key={r.card.normalizedName}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <CardZoomButton
                    name={r.card.name}
                    image={r.card.image}
                    className="shrink-0"
                  >
                    {r.card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.card.image}
                        alt={r.card.name}
                        loading="lazy"
                        className="h-12 w-9 rounded-[3px] border border-border object-cover"
                      />
                    ) : (
                      <span className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">
                        no img
                      </span>
                    )}
                  </CardZoomButton>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardZoomButton
                        name={r.card.name}
                        image={r.card.image}
                        className="truncate text-left font-medium hover:text-accent"
                      >
                        {r.card.name}
                      </CardZoomButton>
                      {r.card.isCommander && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          CMDR
                        </span>
                      )}
                      {r.card.manaCost && <ManaCost cost={r.card.manaCost} />}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <ColorDots identity={r.card.colorIdentity} />
                      need {r.card.needed}
                      {r.card.typeLine ? ` · ${r.card.typeLine}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.eff.length === 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      r.eff.map((o) => (
                        <span
                          key={o.name}
                          className="rounded-full bg-surface-2 px-2 py-0.5 text-xs"
                          title={o.foil ? "has a foil copy" : undefined}
                        >
                          {label(o.name)} ×{o.qty}
                          {o.foil ? " ✦" : ""}
                        </span>
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {visible.length === 0 && (
        <p className="text-sm text-muted">No cards match these filters.</p>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-muted">
      <span className="text-xs">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
