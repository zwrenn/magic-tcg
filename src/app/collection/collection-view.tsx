"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CollectionRow } from "@/lib/search";
import { FavoriteStar } from "@/components/favorite-star";
import { ManaCost, ColorDots } from "@/components/mana";
import {
  COLOR_BUCKETS,
  TYPE_BUCKETS,
  colorBucket,
  typeBucket,
  type ColorBucket,
  type TypeBucket,
} from "@/lib/card-types";

type ViewMode = "grid" | "list";
type SortKey = "name" | "cmc" | "color" | "type" | "quantity" | "price" | "set";

const COLOR_ORDER: ColorBucket[] = [...COLOR_BUCKETS];
const TYPE_ORDER: TypeBucket[] = [...TYPE_BUCKETS];

export function CollectionView({
  rows,
  total,
  limit,
  query,
  favorites,
}: {
  rows: CollectionRow[];
  total: number;
  limit: number;
  query: string;
  favorites: string[];
}) {
  const [view, setView] = useState<ViewMode>("grid");
  const [color, setColor] = useState<ColorBucket | "all">("all");
  const [type, setType] = useState<TypeBucket | "all">("all");
  const [set, setSet] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(() => new Set(favorites));
  const [zoom, setZoom] = useState<number | null>(null);
  // Local editable copy so qty changes / removals reflect instantly.
  const [items, setItems] = useState<CollectionRow[]>(rows);

  useEffect(() => setItems(rows), [rows]);

  async function changeQty(itemId: number, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((r) => r.id !== itemId)
        : prev.map((r) => (r.id === itemId ? { ...r, quantity } : r)),
    );
    if (quantity <= 0) setZoom(null);
    try {
      await fetch("/api/collection/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, quantity }),
      });
    } catch {
      /* optimistic; a refresh will reconcile */
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("pod_collection_view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  function pickView(v: ViewMode) {
    setView(v);
    localStorage.setItem("pod_collection_view", v);
  }

  function onFavChange(normalized: string, favorited: boolean) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(normalized);
      else next.delete(normalized);
      return next;
    });
  }

  const decorated = useMemo(
    () =>
      items.map((r) => ({
        row: r,
        color: colorBucket(r.colorIdentity),
        type: typeBucket(r.typeLine),
        set: (r.setCode ?? "").toUpperCase(),
      })),
    [items],
  );

  // Sets you actually own, labelled with their full name, sorted alphabetically.
  const setOptions = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const d of decorated) {
      if (!d.set) continue;
      if (!byCode.has(d.set)) byCode.set(d.set, d.row.setName?.trim() || d.set);
    }
    return [...byCode.entries()]
      .map(([value, name]) => ({ value, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [decorated]);

  const visible = useMemo(() => {
    let v = decorated;
    if (favOnly) v = v.filter((d) => favs.has(d.row.normalizedName));
    if (color !== "all") v = v.filter((d) => d.color === color);
    if (type !== "all") v = v.filter((d) => d.type === type);
    if (set !== "all") v = v.filter((d) => d.set === set);
    // Ascending-by-key comparator; direction applied after.
    const base = (a: typeof v[number], b: typeof v[number]): number => {
      switch (sort) {
        case "cmc":
          return (a.row.cmc ?? 99) - (b.row.cmc ?? 99);
        case "color":
          return COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color);
        case "type":
          return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
        case "quantity":
          return a.row.quantity - b.row.quantity;
        case "price":
          return (Number(a.row.priceUsd) || 0) - (Number(b.row.priceUsd) || 0);
        case "set":
          return (a.row.setName ?? a.set).localeCompare(b.row.setName ?? b.set);
        default:
          return a.row.name.localeCompare(b.row.name);
      }
    };
    const factor = dir === "asc" ? 1 : -1;
    const sorted = [...v].sort((a, b) => {
      const primary = base(a, b) * factor;
      return primary !== 0 ? primary : a.row.name.localeCompare(b.row.name);
    });
    return sorted.map((d) => d.row);
  }, [decorated, favOnly, favs, color, type, set, sort, dir]);

  const close = useCallback(() => setZoom(null), []);
  const step = useCallback(
    (delta: number) =>
      setZoom((z) =>
        z === null ? z : Math.min(visible.length - 1, Math.max(0, z + delta)),
      ),
    [visible.length],
  );

  useEffect(() => {
    if (zoom === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom, close, step]);

  const truncated = items.length >= limit && total > items.length;
  const zoomed = zoom === null ? null : visible[zoom];

  return (
    <>
      {/* Organize controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => setFavOnly((f) => !f)}
          className={`rounded-lg border px-3 py-1 font-medium transition ${
            favOnly
              ? "border-warn bg-warn/15 text-warn"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          ★ Favorites
        </button>
        <Select label="Color" value={color} onChange={(v) => setColor(v as ColorBucket | "all")}
          options={[{ value: "all", label: "All colors" }, ...COLOR_BUCKETS.map((c) => ({ value: c, label: c }))]} />
        <Select label="Type" value={type} onChange={(v) => setType(v as TypeBucket | "all")}
          options={[{ value: "all", label: "All types" }, ...TYPE_BUCKETS.map((t) => ({ value: t, label: t }))]} />
        <Select label="Set" value={set} onChange={setSet}
          options={[{ value: "all", label: "All sets" }, ...setOptions]} />
        <Select label="Sort" value={sort} onChange={(v) => setSort(v as SortKey)}
          options={[
            { value: "name", label: "Name" },
            { value: "cmc", label: "Mana value" },
            { value: "color", label: "Color" },
            { value: "type", label: "Type" },
            { value: "set", label: "Set" },
            { value: "quantity", label: "Quantity" },
            { value: "price", label: "Price" },
          ]} />
        <button
          onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
          title={dir === "asc" ? "Ascending" : "Descending"}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-foreground hover:border-accent/60"
        >
          {dir === "asc" ? "↑" : "↓"}
        </button>
        <div className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-1 text-xs">
          <Toggle active={view === "grid"} onClick={() => pickView("grid")}>Grid</Toggle>
          <Toggle active={view === "list"} onClick={() => pickView("list")}>List</Toggle>
        </div>
      </div>

      {/* Active filter chips */}
      {(favOnly || color !== "all" || type !== "all" || set !== "all") && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {favOnly && <Chip label="★ Favorites" onClear={() => setFavOnly(false)} />}
          {color !== "all" && <Chip label={color} onClear={() => setColor("all")} />}
          {type !== "all" && <Chip label={type} onClear={() => setType("all")} />}
          {set !== "all" && (
            <Chip
              label={setOptions.find((s) => s.value === set)?.label ?? set}
              onClear={() => setSet("all")}
            />
          )}
          <button
            onClick={() => {
              setFavOnly(false);
              setColor("all");
              setType("all");
              setSet("all");
            }}
            className="text-muted underline hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      <p className="mb-3 text-xs text-muted">
        {query ? <>{visible.length} match{visible.length === 1 ? "" : "es"} for “{query}”</>
          : <>Showing {visible.length.toLocaleString()} of {total.toLocaleString()}{truncated && " — search to narrow further"}</>}
      </p>

      {view === "grid" ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {visible.map((r, i) => (
            <li key={`${r.name}-${r.foil}-${i}`} className="group relative">
              <button onClick={() => setZoom(i)} title={r.name}
                className="block w-full overflow-hidden rounded-lg border border-border bg-surface-2 transition hover:border-accent/60">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt={r.name} loading="lazy" className="aspect-[488/680] w-full object-cover" />
                ) : (
                  <span className="flex aspect-[488/680] w-full items-center justify-center p-2 text-center text-xs text-muted">{r.name}</span>
                )}
                <span className="absolute right-1 top-1 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">
                  ×{r.quantity}{r.foil && <span className="ml-0.5 text-accent">✦</span>}
                </span>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                  {r.name}
                </span>
              </button>
              <FavoriteStar
                name={r.name}
                initial={favs.has(r.normalizedName)}
                onChange={(f) => onFavChange(r.normalizedName, f)}
                className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 text-base"
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {visible.map((r, i) => (
            <li key={`${r.name}-${r.foil}-${i}`} className="flex items-center gap-3 px-3 py-2">
              <FavoriteStar
                name={r.name}
                initial={favs.has(r.normalizedName)}
                onChange={(f) => onFavChange(r.normalizedName, f)}
                className="text-lg"
              />
              <button onClick={() => setZoom(i)} className="shrink-0" aria-label={`Zoom ${r.name}`}>
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt={r.name} loading="lazy" className="h-12 w-9 rounded-[3px] border border-border object-cover" />
                ) : (
                  <span className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">no img</span>
                )}
              </button>
              <button onClick={() => setZoom(i)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <span className="font-medium hover:text-accent">{r.name}</span>
                  <ManaCost cost={r.manaCost} />
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <ColorDots identity={r.colorIdentity} />
                  {r.typeLine}
                </span>
              </button>
              <div className="text-right text-sm">
                <span className="font-medium">×{r.quantity}</span>
                {r.foil && <span className="ml-1 text-accent" title="foil">✦</span>}
                {r.priceUsd && <div className="text-[11px] text-muted">${r.priceUsd}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {visible.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          {favOnly ? "No favorites match these filters yet — tap ☆ on a card to add one." : "No cards match these filters."}
        </p>
      )}

      {/* Lightbox: ←/→ to browse the filtered view, Esc to close. */}
      {zoomed && zoom !== null && (
        <div onClick={close} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          {zoom > 0 && <ArrowButton side="left" onClick={(e) => { e.stopPropagation(); step(-1); }} />}
          {zoom < visible.length - 1 && <ArrowButton side="right" onClick={(e) => { e.stopPropagation(); step(1); }} />}
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {zoomed.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={zoomed.image} alt={zoomed.name} className="max-h-[80vh] w-auto rounded-2xl border border-border shadow-2xl" />
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">{zoomed.name}</div>
            )}
            <div className="flex items-center gap-2 text-center text-sm text-muted">
              <FavoriteStar
                name={zoomed.name}
                initial={favs.has(zoomed.normalizedName)}
                onChange={(f) => onFavChange(zoomed.normalizedName, f)}
                className="text-lg"
              />
              <span>
                {zoomed.name}{zoomed.foil ? " (foil)" : ""}{zoomed.condition ? ` · ${zoomed.condition}` : ""}
              </span>
            </div>
            {/* Quantity editor */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => changeQty(zoomed.id, zoomed.quantity - 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-lg hover:border-accent/60"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center font-mono text-lg font-semibold tabular-nums">
                {zoomed.quantity}
              </span>
              <button
                onClick={() => changeQty(zoomed.id, zoomed.quantity + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-lg hover:border-accent/60"
                aria-label="Increase quantity"
              >
                +
              </button>
              <button
                onClick={() => changeQty(zoomed.id, 0)}
                className="ml-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-bad/60 hover:text-bad"
              >
                Remove
              </button>
            </div>
            <a
              href={`https://scryfall.com/search?q=${encodeURIComponent(`!"${zoomed.name}"`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm hover:bg-surface-2"
            >
              View on Scryfall ↗
            </a>
            <div className="text-xs text-muted/70">{zoom + 1} / {visible.length} · ← → to browse · Esc to close</div>
          </div>
        </div>
      )}
    </>
  );
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} aria-label={side === "left" ? "Previous card" : "Next card"}
      className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface/90 px-3 py-2 text-lg text-foreground hover:bg-surface-2 ${side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6"}`}>
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5">
      {label}
      <button onClick={onClear} aria-label={`Clear ${label}`} className="text-muted hover:text-bad">
        ✕
      </button>
    </span>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 font-medium transition ${active ? "bg-accent text-black" : "text-muted hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-muted">
      <span className="text-xs">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-accent">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
