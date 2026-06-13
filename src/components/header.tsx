import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { POD_MEMBERS } from "@/lib/pod";
import { UserSwitch } from "./user-switch";
import { Nav } from "./nav";

export async function Header() {
  const user = await getCurrentUser();
  if (!user) return null; // gate page / not signed in — no chrome

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-mono text-base font-bold uppercase tracking-tight"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          <span className="hidden sm:inline">The&nbsp;Pod</span>
        </Link>
        <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
          <Nav />
        </div>
        <div className="shrink-0">
          <UserSwitch current={user.name} members={[...POD_MEMBERS]} />
        </div>
      </div>
    </header>
  );
}
