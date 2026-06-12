"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Printing } from "@/lib/scryfall";

const CONDITIONS = [
  "near_mint",
  "lightly_played",
  "moderately_played",
  "heavily_played",
  "damaged",
  "mint",
];

export function AddCardPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // name typeahead
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [active, setActive] = useState(-1);
  const reqId = useRef(0);

  // chosen card + printings
  const [chosen, setChosen] = useState<string | null>(null);
  const [prints, setPrints] = useState<Printing[]>([]);
  const [printId, setPrintId] = useState<string>("");
  const [loadingPrints, setLoadingPrints] = useState(false);

  // add options
  const [quantity, setQuantity] = useState(1);
  const [foil, setFoil] = useState(false);
  const [condition, setCondition] = useState("near_mint");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // debounced name suggestions
  useEffect(() => {
    if (chosen) return; // already picked a card
    const term = name.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/card-suggest?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (id === reqId.current) {
          setSuggestions(data.names ?? []);
          setActive(-1);
        }
      } catch {
        /* best-effort */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [name, chosen]);

  async function chooseCard(cardName: string) {
    setChosen(cardName);
    setName(cardName);
    setSuggestions([]);
    setShowSug(false);
    setLoadingPrints(true);
    setPrints([]);
    try {
      const res = await fetch(`/api/card-prints?name=${encodeURIComponent(cardName)}`);
      const data = await res.json();
      const list: Printing[] = data.printings ?? [];
      setPrints(list);
      setPrintId(list[0]?.scryfallId ?? "");
    } catch {
      setPrints([]);
    } finally {
      setLoadingPrints(false);
    }
  }

  function resetCard() {
    setChosen(null);
    setName("");
    setPrints([]);
    setPrintId("");
    setQuantity(1);
    setFoil(false);
    setCondition("near_mint");
  }

  async function add() {
    if (!printId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/collection/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scryfallId: printId, quantity, foil, condition }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? "Failed to add.");
      } else {
        setToast(`Added ${data.added}× ${data.name}${foil ? " (foil)" : ""} ✓`);
        resetCard();
        router.refresh(); // re-render the grid + totals
      }
    } catch {
      setToast("Network error.");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  const selectedPrint = prints.find((p) => p.scryfallId === printId);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent/60"
      >
        ＋ Add a card
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add a card</h3>
        <button
          onClick={() => {
            setOpen(false);
            resetCard();
          }}
          className="text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>

      {!chosen ? (
        <div className="relative">
          <input
            autoFocus
            value={name}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setShowSug(true);
            }}
            onFocus={() => setShowSug(true)}
            onKeyDown={(e) => {
              if (!showSug || suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                chooseCard(suggestions[active >= 0 ? active : 0]);
              } else if (e.key === "Escape") {
                setShowSug(false);
              }
            }}
            placeholder="Card name, e.g. Sol Ring"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {showSug && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface shadow-xl">
              {suggestions.map((s, i) => (
                <li key={s}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chooseCard(s);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      i === active ? "bg-surface-2 text-accent" : "hover:bg-surface-2"
                    }`}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* preview */}
          <div className="mx-auto w-40 shrink-0 sm:mx-0">
            {selectedPrint?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedPrint.image}
                alt={chosen}
                className="w-full rounded-lg border border-border"
              />
            ) : (
              <div className="flex aspect-[488/680] w-full items-center justify-center rounded-lg border border-border bg-surface-2 p-2 text-center text-xs text-muted">
                {loadingPrints ? "Loading…" : chosen}
              </div>
            )}
          </div>

          {/* options */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{chosen}</span>
              <button onClick={resetCard} className="text-xs text-muted hover:text-foreground">
                change card
              </button>
            </div>

            <label className="block text-xs text-muted">
              Printing
              <select
                value={printId}
                onChange={(e) => setPrintId(e.target.value)}
                disabled={loadingPrints || prints.length === 0}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                {prints.map((p) => (
                  <option key={p.scryfallId} value={p.scryfallId}>
                    {p.set} · #{p.collectorNumber} · {p.setName}
                    {p.priceUsd ? ` · $${p.priceUsd}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted">
                Qty
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-20 rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={foil}
                  onChange={(e) => setFoil(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Foil
              </label>
              <label className="text-xs text-muted">
                Condition
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={add}
              disabled={busy || !printId}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to my collection"}
            </button>
          </div>
        </div>
      )}

      {toast && <p className="mt-3 text-sm text-good">{toast}</p>}
    </div>
  );
}
