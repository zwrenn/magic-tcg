import { POD_MEMBERS } from "@/lib/pod";
import { UserSwitch } from "./user-switch";
import { GlitterField } from "./glitter-field";
import type { User } from "@/db/schema";
import type { PodStats } from "@/lib/pod-stats";

function Plaque({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="brass px-2 py-1 text-center">
      <div className={`lcd ${tone} text-2xl tabular-nums`}>{value.toLocaleString()}</div>
      <div className="pixel mt-0.5 text-[10px] uppercase tracking-widest text-white/80">
        {label}
      </div>
    </div>
  );
}

export function Banner({ user, stats }: { user: User; stats: PodStats }) {
  return (
    <div className="wood glitter-base relative z-30 flex flex-wrap items-center gap-4 rounded-3xl px-4 py-3 sm:px-6 sm:py-4">
      <GlitterField density={1.4} className="rounded-3xl" />
      {/* Mascot orb */}
      <div className="float relative z-[5] grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-white bg-gradient-to-b from-[#8fe87a] to-[#3f9a2c] shadow-[inset_0_3px_4px_rgba(255,255,255,0.6),0_4px_0_rgba(63,154,44,0.6)]">
        <span className="ms ms-g text-2xl text-[#10300f]" />
      </div>

      {/* Title + tagline */}
      <div className="relative z-[5] min-w-0 flex-1">
        <h1 className="t-wordart relative z-[5] text-4xl leading-none tracking-[0.06em] sm:text-5xl">
          THE&nbsp;POD
          <span className="sparkle ml-3 inline-block text-yellow-200">✦</span>
        </h1>
        <p className="mt-1 truncate text-sm font-semibold text-white/85">
          your playgroup&apos;s shared card vault ✨
        </p>
      </div>

      {/* LCD plaques */}
      <div className="relative z-[5] flex items-center gap-2">
        <Plaque value={stats.cards} label="Cards" tone="" />
        <Plaque value={stats.decks} label="Decks" tone="lcd-green" />
        <Plaque value={stats.players} label="Players" tone="lcd-gold" />
        <div className="ml-1 hidden sm:block">
          <UserSwitch current={user.name} members={[...POD_MEMBERS]} />
        </div>
      </div>
    </div>
  );
}
