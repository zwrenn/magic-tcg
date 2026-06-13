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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-base font-bold uppercase tracking-tight"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            The&nbsp;Pod
          </Link>
          <Nav />
        </div>
        <UserSwitch current={user.name} members={[...POD_MEMBERS]} />
      </div>
    </header>
  );
}
