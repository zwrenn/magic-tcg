"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCardZoom } from "@/components/card-zoom";
import { ManaCost, ColorDots } from "@/components/mana";
import { SetSymbol } from "@/components/set-symbol";
import { TYPE_BUCKETS, typeBucket, type TypeBucket } from "@/lib/card-types";
import type { DeckCardMatch } from "@/lib/matcher";

type Section = "full" | "partial" | "none";
type SortKey = "name" | "cmc";

export function MatcherView({
  cards,
  viewerName,
  members,
  deckId,
  canEdit,
  initialAsked = [],
}: {
  cards: DeckCardMatch[];
  deckOwnerName: string;
  viewerName: string;
  members: string[];
  deckId: number;
  canEdit: boolean;
  /** `${normalizedName}::${owner}` keys with a pending request already sent. */
  initialAsked?: string[];
}) {
  // Default: exclude the viewer's own cards, so you see what the rest of the
  // pod can contribute to you.
  const [excludeMine, setExcludeMine] = useState(true);
  const [sort, setSort] = useState<SortKey>("name");
  const [filterType, setFilterType] = useState<TypeBucket | "all">("all");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [asked, setAsked] = useState<Set<string>>(() => new Set(initialAsked));
  const [proxies, setProxies] = useState<Set<string>>(
    () => new Set(cards.filter((c) => c.isProxy).map((c) => c.normalizedName)),
  );
  // Cards removed this session (optimistic; reconciled by router.refresh()).
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [addName, setAddName] = useState("");
  const [addState, setAddState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [addError, setAddError] = useState("");
  const router = useRouter();
  const { openList } = useCardZoom();

  // Cards still in the deck after optimistic removals.
  const liveCards = useMemo(
    () => cards.filter((c) => !removed.has(c.normalizedName)),
    [cards, removed],
  );

  function handleRemovedFromDeck(normalizedName: string) {
    setRemoved((prev) => new Set(prev).add(normalizedName));
    router.refresh();
  }

  async function addCard() {
    const name = addName.trim();
    if (!name || addState === "busy") return;
    setAddState("busy");
    setAddError("");
    try {
      const res = await fetch("/api/decks/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddState("error");
        setAddError(data.error ?? "Could not add card");
        return;
      }
      setAddName("");
      setAddState("done");
      router.refresh();
      setTimeout(() => setAddState("idle"), 1500);
    } catch {
      setAddState("error");
      setAddError("Network error");
    }
  }

  // Set + persist a card's proxy flag (called from the zoom's toggle).
  function applyProxy(normalizedName: string, willBe: boolean) {
    setProxies((prev) => {
      const next = new Set(prev);
      if (willBe) next.add(normalizedName);
      else next.delete(normalizedName);
      return next;
    });
    fetch("/api/decks/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId, normalizedName, isProxy: willBe }),
    }).catch(() => {
      /* optimistic */
    });
  }

  async function requestCard(owner: string, normalizedName: string, cardName: string) {
    const key = `${normalizedName}::${owner}`;
    setAsked((s) => new Set(s).add(key));
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUser: owner, cardName, deckId }),
      });
    } catch {
      /* optimistic */
    }
  }

  // Apply exclusion, compute availability + section for every card once.
  const rows = useMemo(() => {
    return liveCards.map((c) => {
      const eff = excludeMine
        ? c.owners.filter((o) => o.name !== viewerName)
        : c.owners;
      const available = eff.reduce((s, o) => s + o.qty, 0);
      const section: Section =
        available >= c.needed ? "full" : available > 0 ? "partial" : "none";
      return { card: c, eff, available, section, bucket: typeBucket(c.typeLine) };
    });
  }, [liveCards, excludeMine, viewerName]);

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

  // Deck completeness counting kept proxies: a slot is "filled" if the pod
  // covers it (real) OR it's a proxy you're keeping. proxyOnly = proxy slots
  // not already covered by a real copy, so the bar segments don't double-count.
  const completion = useMemo(() => {
    let proxyOnly = 0;
    for (const r of rows) {
      if (r.available > 0) continue;
      if (proxies.has(r.card.normalizedName)) proxyOnly++;
    }
    return { proxyOnly };
  }, [rows, proxies]);

  // Visible rows after filters + sort.
  const visible = useMemo(() => {
    let v = rows;
    if (filterType !== "all") v = v.filter((r) => r.bucket === filterType);
    if (filterColor !== "all")
      v = v.filter((r) => {
        const cols = (r.card.colorIdentity ?? "").split(",").filter(Boolean);
        if (filterColor === "C") return cols.length === 0;
        if (filterColor === "multi") return cols.length > 1;
        return cols.includes(filterColor);
      });
    if (filterRarity !== "all")
      v = v.filter((r) => (r.card.rarity ?? "").toLowerCase() === filterRarity);
    if (filterOwner !== "all")
      v = v.filter((r) => r.eff.some((o) => o.name === filterOwner));
    const sorter = (a: typeof rows[number], b: typeof rows[number]) =>
      sort === "name"
        ? a.card.name.localeCompare(b.card.name)
        : (a.card.cmc ?? 99) - (b.card.cmc ?? 99) ||
          a.card.name.localeCompare(b.card.name);
    return [...v].sort(sorter);
  }, [rows, filterType, filterColor, filterRarity, filterOwner, sort]);

  const sections: { key: Section; label: string; tone: string }[] = [
    { key: "full", label: "Fully covered", tone: "text-good" },
    { key: "partial", label: "Partially covered", tone: "text-warn" },
    { key: "none", label: "Nobody has it", tone: "text-bad" },
  ];

  // Estimated cost to acquire everything the pod can't cover.
  const buylistValue = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const short = Math.max(0, r.card.needed - r.available);
        return sum + short * (Number(r.card.priceUsd) || 0);
      }, 0),
    [rows],
  );

  // Cards in on-screen order (full → partial → nobody) so the zoom's ←/→
  // arrows step through exactly what's visible. Indexed by name for click.
  const ordered = useMemo(
    () =>
      (["full", "partial", "none"] as Section[]).flatMap((key) =>
        visible.filter((r) => r.section === key),
      ),
    [visible],
  );
  const zoomList = useMemo(
    () =>
      ordered.map((r) => ({
        name: r.card.name,
        image: r.card.image,
        key: r.card.normalizedName,
        viewerOwns: r.card.owners.some((o) => o.name === viewerName),
        holo: r.card.owners.some((o) => o.foil),
      })),
    [ordered, viewerName],
  );
  const zoomIndex = useMemo(() => {
    const m = new Map<string, number>();
    ordered.forEach((r, i) => m.set(r.card.normalizedName, i));
    return m;
  }, [ordered]);
  const openZoom = (normalizedName: string) =>
    openList(zoomList, zoomIndex.get(normalizedName) ?? 0, {
      allowEdit: false,
      // Owners get a "mark as proxy" toggle + "remove from deck" inside the card.
      proxy: canEdit
        ? { initial: [...proxies], onToggle: applyProxy }
        : undefined,
      deck: canEdit ? { id: deckId, onRemoved: handleRemovedFromDeck } : undefined,
    });

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

  // Deck color identity → a gradient accent on the summary panel.
  const COLOR_HEX: Record<string, string> = {
    W: "#f5f0d8", U: "#9ed0ec", B: "#5a5550", R: "#f0a18a", G: "#9bd3ae",
  };
  const deckColors = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards)
      for (const x of (c.colorIdentity ?? "").split(",").filter(Boolean)) s.add(x);
    return ["W", "U", "B", "R", "G"].filter((x) => s.has(x));
  }, [cards]);
  const colorGradient =
    deckColors.length > 0
      ? `linear-gradient(90deg, ${deckColors.map((c) => COLOR_HEX[c]).join(", ")})`
      : "var(--border-strong)";

  // Stacked-bar segment widths (kept as raw fractions so green + purple meet).
  const realPct = summary.total ? (summary.covered / summary.total) * 100 : 0;
  const proxyPct = summary.total
    ? (completion.proxyOnly / summary.total) * 100
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="h-1 w-full" style={{ background: colorGradient }} />
        <div className="p-5">
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
                  <span className="font-medium">{label(name)}</span>{" "}
                  {name === viewerName ? "have" : "has"} {n}
                </span>
              ))}
            </>
          )}
          .{" "}
          <span className={summary.missing > 0 ? "text-bad" : "text-good"}>
            {summary.missing} missing.
          </span>
        </p>
        {/* Coverage bar — green = pod-owned, purple = kept proxies filling the slot */}
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-good transition-all"
            style={{ width: `${realPct}%` }}
            title={`${summary.covered} owned by the pod`}
          />
          <div
            className="h-full bg-[var(--purple)] transition-all"
            style={{ width: `${proxyPct}%` }}
            title={`${completion.proxyOnly} filled by proxies you're keeping`}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          {Math.round(realPct)}% covered by the pod
          {completion.proxyOnly > 0 && (
            <span className="text-[var(--purple-deep)]">
              {" · "}
              {Math.round(realPct + proxyPct)}% playable with proxies
            </span>
          )}
          {" · "}basic lands excluded
        </p>
        {proxies.size > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-good" />
              owned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--purple)]" />
              proxy you&apos;re keeping
            </span>
            <span className="text-[var(--purple-deep)]">
              🔁 {proxies.size} prox{proxies.size === 1 ? "y" : "ies"} tagged
            </span>
          </div>
        )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={excludeMine}
            onChange={(e) => setExcludeMine(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Exclude your own cards
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
          value={filterColor}
          onChange={setFilterColor}
          label="Color"
          options={[
            { value: "all", label: "All colors" },
            { value: "W", label: "White" },
            { value: "U", label: "Blue" },
            { value: "B", label: "Black" },
            { value: "R", label: "Red" },
            { value: "G", label: "Green" },
            { value: "multi", label: "Multicolor" },
            { value: "C", label: "Colorless" },
          ]}
        />
        <Select
          value={filterRarity}
          onChange={setFilterRarity}
          label="Rarity"
          options={[
            { value: "all", label: "All rarities" },
            { value: "common", label: "Common" },
            { value: "uncommon", label: "Uncommon" },
            { value: "rare", label: "Rare" },
            { value: "mythic", label: "Mythic" },
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

        <div className="ml-auto flex items-center gap-3">
          {buylistValue > 0 && (
            <span className="text-xs text-muted">
              ~<span className="font-mono font-semibold text-foreground">${buylistValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> to finish
            </span>
          )}
          <button
            onClick={copyMissing}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:border-accent/60"
          >
            {copied ? "Copied ✓" : "Copy missing cards"}
          </button>
        </div>
      </div>

      {/* Add a card to the deck (owner only) */}
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCard();
          }}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <input
            value={addName}
            onChange={(e) => {
              setAddName(e.target.value);
              if (addState === "error") setAddState("idle");
            }}
            placeholder="Add a card to this deck…"
            className="flex-1 min-w-[12rem] rounded-lg border border-border bg-surface px-3 py-1.5 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={addState === "busy" || !addName.trim()}
            className="rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5 font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
          >
            {addState === "busy" ? "Adding…" : addState === "done" ? "Added ✓" : "+ Add card"}
          </button>
          {addState === "error" && (
            <span className="text-xs text-bad">{addError}</span>
          )}
        </form>
      )}

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
                  <button
                    type="button"
                    title={r.card.name}
                    onClick={() => openZoom(r.card.normalizedName)}
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
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openZoom(r.card.normalizedName)}
                        className="truncate text-left font-medium hover:text-accent"
                      >
                        {r.card.name}
                      </button>
                      {r.card.isCommander && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          CMDR
                        </span>
                      )}
                      {proxies.has(r.card.normalizedName) && (
                        <span className="rounded bg-[var(--purple)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--purple-deep)]">
                          🔁 PROXY
                        </span>
                      )}
                      {r.card.manaCost && <ManaCost cost={r.card.manaCost} />}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <ColorDots identity={r.card.colorIdentity} />
                      <SetSymbol setCode={r.card.setCode} rarity={r.card.rarity} className="text-sm" />
                      need {r.card.needed}
                      {r.card.typeLine ? ` · ${r.card.typeLine}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.eff.length === 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      r.eff.map((o) => {
                        const mine = o.name === viewerName;
                        const askedKey = `${r.card.normalizedName}::${o.name}`;
                        const didAsk = asked.has(askedKey);
                        return mine ? (
                          <span
                            key={o.name}
                            className="rounded-full bg-surface-2 px-2 py-0.5 text-xs"
                            title={o.foil ? "you have a foil copy" : undefined}
                          >
                            {label(o.name)} ×{o.qty}
                            {o.foil ? " ✦" : ""}
                          </span>
                        ) : (
                          <button
                            key={o.name}
                            onClick={() => !didAsk && requestCard(o.name, r.card.normalizedName, r.card.name)}
                            disabled={didAsk}
                            title={didAsk ? "Request sent" : `Ask ${o.name} for this card`}
                            className={`rounded-full px-2 py-0.5 text-xs transition ${
                              didAsk
                                ? "bg-good/15 text-good"
                                : "bg-surface-2 hover:bg-[var(--purple)]/15 hover:text-[var(--purple-deep)]"
                            }`}
                          >
                            {o.name} ×{o.qty}
                            {o.foil ? " ✦" : ""} {didAsk ? "✓ asked" : "🙋 ask"}
                          </button>
                        );
                      })
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
