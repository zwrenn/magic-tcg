import { GlitterField } from '../glitter-field';
import { LCDs } from './LCDs';
import { MascotOrb } from './MascotOrb';
import { Title } from './Title';
import { LCDProps } from './types';

export function Banner({ user, stats }: LCDProps) {
  return (
    <div className="wood glitter-base relative z-30 flex flex-wrap items-center justify-center gap-4 rounded-3xl px-4 py-3 sm:px-6 sm:py-4 md:justify-between">
      <GlitterField density={1.4} className="rounded-3xl" />
      <div className="flex items-center gap-4">
        <MascotOrb />
        <Title />
      </div>
      <LCDs user={user} stats={stats} />
    </div>
  );
}
