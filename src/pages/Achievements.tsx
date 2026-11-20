import type { ReactElement } from 'react';
import { useStudy } from '../store/useStudy';
import { Card } from '../components/ui/Card';
import { AchievementGrid } from '../components/Achievements/AchievementGrid';
import { ACHIEVEMENTS } from '../lib/achievements';

export function AchievementsPage(): ReactElement {
  const { state, stats } = useStudy();
  const unlocked = state.achievements.length;
  const pct = Math.round((unlocked / ACHIEVEMENTS.length) * 100);

  return (
    <Card
      title="Achievements"
      subtitle={`${unlocked} of ${ACHIEVEMENTS.length} unlocked · ${pct}%`}
      action={
        <div className="h-2 w-24 overflow-hidden rounded-full bg-line/60" aria-hidden>
          <div
            className="h-full rounded-r-[4px] bg-gradient-to-r from-amber to-rose transition-[width] duration-700"
            style={{ width: `${Math.max(pct, unlocked > 0 ? 4 : 0)}%` }}
          />
        </div>
      }
    >
      <AchievementGrid state={state} stats={stats} />
    </Card>
  );
}
