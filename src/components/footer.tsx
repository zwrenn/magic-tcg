import { getCurrentUser } from "@/lib/auth";
import { getPodStats } from "@/lib/pod-stats";

const BADGES = [
  { label: "BEST VIEWED IN NETSCAPE", bg: "linear-gradient(180deg,#3f6f8f,#274d6a)", color: "#dff0ff" },
  { label: "VALID HTML 4.01", bg: "linear-gradient(180deg,#ffffff,#dfe6ef)", color: "#274d6a" },
  { label: "MADE WITH NOTEPAD", bg: "linear-gradient(180deg,#b7b1a4,#8d877a)", color: "#1e1a12" },
  { label: "♪ MIDI POWERED", bg: "linear-gradient(180deg,#2a2a2a,#0e0e0e)", color: "#7ccb5e" },
  { label: "✦ POD WEBRING ✦", bg: "linear-gradient(180deg,#7351c0,#4e2f92)", color: "#f0e6ff" },
];

const BLINKIES = [
  { label: "✨ 100% GLITTER ✨", bg: "linear-gradient(180deg,#ff9bc8,#ff5db5)", color: "#fff" },
  { label: "♥ POWERED BY SCRYFALL ♥", bg: "linear-gradient(180deg,#7ee06a,#4e9e2c)", color: "#fff" },
  { label: "★ EST. 2026 ★", bg: "linear-gradient(180deg,#ffe06a,#ffce3a)", color: "#5a4410" },
];

export async function Footer() {
  const user = await getCurrentUser();
  if (!user) return null;
  const stats = await getPodStats();
  // A real number, styled like the old odometer (padded to 6 digits).
  const cards = String(stats.cards).padStart(6, "0").split("");

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

        {/* Blinkies */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {BLINKIES.map((b, i) => (
            <span
              key={b.label}
              className={`pixel rounded border-2 border-white px-2 py-0.5 text-[10px] tracking-wide shadow-[0_2px_0_rgba(0,0,0,0.15)] ${i % 2 === 0 ? "blinky" : ""}`}
              style={{ background: b.bg, color: b.color }}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* Real card-count odometer */}
        <div className="flex items-center gap-2">
          <span className="pixel text-xs uppercase tracking-widest text-muted">
            Cards in the vault
          </span>
          <span className="flex gap-px">
            {cards.map((d, i) => (
              <span key={i} className="lcd lcd-green px-1 text-lg tabular-nums">
                {d}
              </span>
            ))}
          </span>
        </div>

        <p className="pixel text-xs text-subtle">
          The Pod · est. 2026 · brewed with questionable mana bases
        </p>
      </div>
    </footer>
  );
}
