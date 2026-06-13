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
          className="flex shrink-0 items-center gap-2"
          aria-label="The Pod — home"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          <span className="t-hero hidden text-lg sm:inline">The&nbsp;Pod</span>
        </Link>
        <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
          <Nav />
        </div>
        <div className="shrink-0">
          <UserSwitch current={user.name} members={[...POD_MEMBERS]} />
        </div>
      </div>
      {/* five-color pie accent */}
      <div className="wubrg-bar h-[2px] w-full opacity-70" />
    </header>
  );
}
