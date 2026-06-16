import type { User } from '@/db/schema';
import type { PodStats } from '@/lib/pod-stats';

export interface LCDProps {
  user: User;
  stats: PodStats;
}
