"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Decks" },
  { href: "/buildable", label: "Buildable" },
  { href: "/search", label: "Search" },
  { href: "/collection", label: "My Cards" },
  { href: "/stats", label: "Stats" },
  { href: "/import", label: "Import" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-max items-center gap-0.5 font-mono text-[11px] font-medium uppercase tracking-wider">
      {NAV.map((n) => {
        const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-2.5 py-1.5 transition ${
              active
                ? "bg-surface-2 text-accent"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
