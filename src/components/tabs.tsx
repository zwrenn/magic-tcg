"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/buildable", label: "Buildable" },
  { href: "/search", label: "Search" },
  { href: "/collection", label: "My Cards" },
  { href: "/stats", label: "Stats" },
  { href: "/import", label: "Import" },
];

export function Tabs() {
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
          </Link>
        );
      })}
    </nav>
  );
}
