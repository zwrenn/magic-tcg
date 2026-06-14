import Link from "next/link";
import { getRoster } from "@/lib/pod-stats";

export async function Sidebar({
  currentUser,
  randomHref,
}: {
  currentUser: string;
  randomHref: string;
}) {
  const roster = await getRoster();

  return (
    <aside className="space-y-4">
      {/* Quick links */}
      <div className="module overflow-hidden">
        <div className="module-head m-2 mb-0">❖ Quick Links</div>
        <div className="space-y-2 p-3">
          <Link href="/decks/new" className="gel gel-green w-full">
            ✚ New Deck
          </Link>
          <Link href="/import" className="gel gel-gold w-full">
            ⇧ Import List
          </Link>
          <Link href={randomHref} className="gel gel-purple w-full">
            ⚄ Random Deck
          </Link>
        </div>
      </div>

      {/* Roster */}
      <div className="module overflow-hidden">
        <div className="module-head m-2 mb-0">⚔ The Pod Roster</div>
        <ul className="space-y-1.5 p-3">
          {roster.map((r) => {
            const isYou = r.name === currentUser;
            return (
              <li
                key={r.name}
                className={`hover-pop flex items-center gap-2 rounded-xl border-[3px] px-2 py-1.5 ${
                  isYou
                    ? "border-[var(--accent)] bg-[#eafbe4]"
                    : "border-[var(--border)] bg-white"
                }`}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-gradient-to-b from-[#8fe87a] to-[#3f9a2c] text-xs font-bold text-[#10300f] shadow-[0_2px_0_rgba(63,154,44,0.5)]">
                  {r.name[0]}
                </span>
                <span className="flex-1 font-semibold">
                  {r.name}
                  {isYou && <span className="ml-1 text-xs text-muted">(you)</span>}
                </span>
                <span className="lcd lcd-gold text-base tabular-nums">
                  {r.count.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Tip */}
      <div className="module p-3">
        <div className="t-label mb-1 text-[var(--accent)]">✦ Did you know?</div>
        <p className="text-sm italic leading-snug text-muted">
          A glowing green bar means the pod already owns most of that deck — basic
          lands are free, so we don&apos;t count them.
        </p>
      </div>
    </aside>
  );
}
