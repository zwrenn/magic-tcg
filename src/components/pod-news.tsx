"use client";

import { useMemo, useState } from "react";
import { useCardZoom } from "@/components/card-zoom";
import type { FeaturedSet, FreshPull } from "@/lib/news";

type EventItem = { emoji: string; title: string; detail: string };

export function PodNews({
  featured,
  events,
  pulls,
  newsId,
  seen,
}: {
  featured: FeaturedSet | null;
  events: EventItem[];
  pulls: FreshPull[];
  newsId: string;
  seen: boolean;
}) {
  const [open, setOpen] = useState(!seen);
  const { openList } = useCardZoom();
  const zoomList = useMemo(
    () =>
      pulls.map((p) => ({
        name: p.name,
        image: p.image,
        key: p.normalizedName,
        holo: p.foil,
      })),
    [pulls],
  );

  function dismiss() {
    setOpen(false);
    document.cookie = `pod_news_seen=${newsId}; path=/; max-age=31536000; samesite=lax`;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="gel gel-pink mb-4 w-full !justify-start"
      >
        📣 Pod News — tap to open
      </button>
    );
  }

  const released = featured?.releasedAt
    ? new Date(featured.releasedAt + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="module mb-4 overflow-hidden">
      <div className="module-head m-2 mb-0 flex items-center justify-between">
        <span className="blinky">📣 Pod News</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss news"
          title="Got it — hide until there's new news"
          className="rounded-full bg-white/25 px-2 leading-none hover:bg-white/40"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* New set */}
        {featured && (
          <div className="flex items-center gap-3 rounded-xl border-2 border-[var(--border)] bg-surface-2 p-3">
            {featured.icon && (
              // explicit white (not bg-white, which the dark theme overrides) so
              // the black set symbol stays visible on every skin
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white shadow"
                style={{ background: "#ffffff" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.icon} alt="" className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <div className="t-label text-[var(--purple-deep)]">🆕 Newest set</div>
              <div className="truncate text-lg font-semibold">{featured.name}</div>
              {released && <div className="text-xs text-muted">Released {released}</div>}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.title} className="flex gap-2 rounded-xl border-2 border-[var(--border)] bg-surface p-3">
                <span className="text-xl">{e.emoji}</span>
                <div className="min-w-0">
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-sm text-muted">{e.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Fresh pulls — best hits */}
        {featured && (
          <div>
            <div className="t-label mb-2 flex flex-wrap items-baseline gap-x-2">
              <span>✨ Best hits from {featured.name}</span>
              {pulls.length > 0 && (
                <span className="font-normal normal-case tracking-normal text-muted">
                  click a card · ← → to browse
                </span>
              )}
            </div>
            {pulls.length === 0 ? (
              <p className="text-sm text-muted">
                Nobody&apos;s imported anything from {featured.name} yet — be the first!
              </p>
            ) : (
              <ul className="no-scrollbar flex gap-3 overflow-x-auto px-0.5 pb-1 pt-2.5">
                {pulls.map((p, i) => (
                  <li key={p.normalizedName} className="w-[104px] shrink-0">
                    <button
                      type="button"
                      onClick={() => openList(zoomList, i)}
                      title={`${p.name} — ${p.owners.join(", ")}`}
                      className={`hover-pop relative block w-full rounded-xl ${p.isNew ? "fresh-new" : ""}`}
                    >
                      {p.isNew && (
                        <span className="pixel blinky absolute right-1 top-1 z-10 rotate-6 rounded bg-[var(--pink)] px-1 text-[9px] font-bold text-white shadow">
                          NEW!
                        </span>
                      )}
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          className={`aspect-[488/680] w-full rounded-xl border-2 border-[var(--border-strong)] object-cover shadow-md ${p.foil ? "foil-frame" : ""}`}
                        />
                      ) : (
                        <span className="flex aspect-[488/680] w-full items-center justify-center rounded-xl border-2 border-[var(--border-strong)] bg-surface-2 p-1 text-center text-[10px] text-muted">
                          {p.name}
                        </span>
                      )}
                    </button>
                    <div className="mt-1 flex items-center justify-between gap-1 px-0.5 text-[10px]">
                      <span className="truncate text-muted" title={p.owners.join(", ")}>
                        {p.owners.join(", ")}
                      </span>
                      {p.price != null && p.price >= 1 && (
                        <span className="shrink-0 font-semibold text-good">
                          ${p.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
