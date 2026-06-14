"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/buildable", label: "Buildable" },
  { href: "/search", label: "Search" },
  { href: "/collection", label: "My Cards" },
  { href: "/stats", label: "Stats" },
  { href: "/inbox", label: "Inbox" },
  { href: "/import", label: "Import" },
];

export function Tabs({ inboxCount = 0 }: { inboxCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar -mb-[2px] flex gap-1 overflow-x-auto px-1">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className="tab shrink-0"
          >
            {t.label}
            {t.href === "/inbox" && inboxCount > 0 && (
              <span className="ml-1 rounded-full bg-[var(--bad)] px-1.5 text-[10px] font-bold text-white">
                {inboxCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
