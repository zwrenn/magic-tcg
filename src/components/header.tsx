import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { POD_MEMBERS } from "@/lib/pod";
import { UserSwitch } from "./user-switch";

const NAV = [
  { href: "/", label: "Decks" },
  { href: "/search", label: "Search" },
  { href: "/collection", label: "My Cards" },
  { href: "/import", label: "Import" },
];

export async function Header() {
  const user = await getCurrentUser();
  if (!user) return null; // gate page / not signed in — no chrome

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            The&nbsp;Pod
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-2.5 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserSwitch current={user.name} members={[...POD_MEMBERS]} />
      </div>
    </header>
  );
}
