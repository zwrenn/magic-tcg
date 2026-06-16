import { UserSwitch } from '../user-switch';
import { LCDProps } from './types';

function Plaque({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="brass px-2 py-1 text-center">
      <div className={`lcd ${tone} text-2xl tabular-nums`}>
        {value.toLocaleString()}
      </div>
      <div className="pixel mt-0.5 text-[10px] tracking-widest text-white/80 uppercase">
        {label}
      </div>
    </div>
  );
}

export function LCDs({ user, stats }: LCDProps) {
  return (
    <div className="relative z-[5] flex items-center gap-2">
      <Plaque value={stats.cards} label="Cards" tone="" />
      <Plaque value={stats.decks} label="Decks" tone="lcd-green" />
      <Plaque value={stats.players} label="Players" tone="lcd-gold" />
      <div className="ml-1 hidden sm:block">
        <UserSwitch current={user.name} />
      </div>
    </div>
  );
}
