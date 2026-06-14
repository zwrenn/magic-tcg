import { getCurrentUser } from "@/lib/auth";

const BADGES = [
  { label: "BEST VIEWED IN NETSCAPE", bg: "linear-gradient(180deg,#3f6f8f,#274d6a)", color: "#dff0ff" },
  { label: "VALID HTML 4.01", bg: "linear-gradient(180deg,#ffffff,#dfe6ef)", color: "#274d6a" },
  { label: "MADE WITH NOTEPAD", bg: "linear-gradient(180deg,#b7b1a4,#8d877a)", color: "#1e1a12" },
  { label: "♪ MIDI POWERED", bg: "linear-gradient(180deg,#2a2a2a,#0e0e0e)", color: "#7ccb5e" },
  { label: "✦ POD WEBRING ✦", bg: "linear-gradient(180deg,#7351c0,#4e2f92)", color: "#f0e6ff" },
];

const HITS = ["0", "0", "0", "1", "3", "3", "7", "2"];

export async function Footer() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <footer className="mx-auto mt-8 w-full max-w-6xl px-3 pb-10">
      <div className="flex flex-col items-center gap-3 border-t-2 border-dashed border-[var(--border)] pt-5">
        {/* Web badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {BADGES.map((b) => (
            <span
              key={b.label}
              className="pixel rounded border border-[#2a1c0e] px-2 py-0.5 text-[10px] tracking-wide"
              style={{ background: b.bg, color: b.color }}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* Hit counter */}
        <div className="flex items-center gap-2">
          <span className="pixel text-xs uppercase tracking-widest text-muted">
            Visitors
          </span>
          <span className="flex gap-px">
            {HITS.map((d, i) => (
              <span key={i} className="lcd lcd-green px-1 text-lg tabular-nums">
                {d}
              </span>
            ))}
          </span>
        </div>

        <p className="pixel text-xs text-subtle">
          The Pod · est. 2026 · brewed with EB Garamond &amp; questionable mana bases
        </p>
      </div>
    </footer>
  );
}
