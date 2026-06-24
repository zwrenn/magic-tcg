"use client";

import { useState } from "react";
import { CardZoomButton } from "@/components/card-zoom";
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
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white bg-white shadow">
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

        {/* Fresh pulls */}
        {featured && (
          <div>
            <div className="t-label mb-2">
              ✨ Fresh from {featured.name}
              {pulls.length > 0 && (
                <span className="text-muted"> · {pulls.length} in the pod</span>
              )}
            </div>
            {pulls.length === 0 ? (
              <p className="text-sm text-muted">
                Nobody&apos;s imported anything from {featured.name} yet — be the first!
              </p>
            ) : (
              <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {pulls.map((p) => (
                  <li key={p.normalizedName} className="w-[88px] shrink-0">
                    <CardZoomButton
                      name={p.name}
                      image={p.image}
                      holo={p.foil}
                      allowEdit={false}
                      className="block w-full"
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          className={`aspect-[488/680] w-full rounded-lg border-2 border-[var(--border)] object-cover ${p.foil ? "foil-frame" : ""}`}
                        />
                      ) : (
                        <span className="flex aspect-[488/680] w-full items-center justify-center rounded-lg border-2 border-[var(--border)] bg-surface-2 p-1 text-center text-[9px] text-muted">
                          {p.name}
                        </span>
                      )}
                    </CardZoomButton>
                    <div className="mt-0.5 truncate text-center text-[10px] text-muted" title={`${p.name} — ${p.owners.join(", ")}`}>
                      {p.owners.join(", ")}
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
