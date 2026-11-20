import type { ReactElement } from 'react';
import { Lock } from 'lucide-react';
import type { StudyState } from '../../types/study';
import type { StudyStats } from '../../lib/statistics';
import { ACHIEVEMENTS, type Achievement } from '../../lib/achievements';
import { dayKey, friendlyDay } from '../../lib/date';
import { formatNumber } from '../../lib/format';

function AchievementTile({
  achievement,
  unlockedAt,
  progress,
}: {
  achievement: Achievement;
  unlockedAt: string | null;
  progress: { current: number; target: number } | null;
}): ReactElement {
  const unlocked = unlockedAt !== null;
  const pct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

  return (
    <li
      className={[
        'relative overflow-hidden rounded-2xl border p-4 transition-all duration-300',
        unlocked
          ? 'animate-pop border-amber/40 bg-gradient-to-br from-amber/15 to-transparent'
          : 'border-line bg-raised/35',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={[
            'grid size-11 shrink-0 place-items-center rounded-xl text-xl',
            unlocked ? 'bg-amber/20' : 'bg-base-2/60 opacity-45 grayscale',
          ].join(' ')}
        >
          {unlocked ? achievement.icon : <Lock size={16} className="text-faint" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${unlocked ? 'text-ink' : 'text-ink-soft'}`}>
            {achievement.title}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted">{achievement.description}</p>

          {unlocked ? (
            <p className="mt-2 text-[11px] font-semibold text-amber">
              Unlocked {friendlyDay(dayKey(new Date(unlockedAt)))}
            </p>
          ) : (
            progress && (
              <div className="mt-2.5">
                <div className="h-1.5 overflow-hidden rounded-[4px] bg-line/60">
                  <div
                    className="h-full rounded-r-[4px] bg-brand/70 transition-[width] duration-700"
                    style={{ width: `${Math.max(pct, progress.current > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <p className="num mt-1 text-[11px] text-faint">
                  {formatNumber(progress.current)} / {formatNumber(progress.target)}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </li>
  );
}

export function AchievementGrid({
  state,
  stats,
}: {
  state: StudyState;
  stats: StudyStats;
}): ReactElement {
  const unlockedMap = new Map(state.achievements.map((entry) => [entry.id, entry.unlockedAt]));
  const ctx = { state, stats };

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const aUnlocked = unlockedMap.has(a.id) ? 0 : 1;
    const bUnlocked = unlockedMap.has(b.id) ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    return a.tier - b.tier;
  });

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((achievement) => {
        let progress: { current: number; target: number } | null = null;
        if (achievement.progress) {
          try {
            progress = achievement.progress(ctx);
          } catch {
            progress = null;
          }
        }
        return (
          <AchievementTile
            key={achievement.id}
            achievement={achievement}
            unlockedAt={unlockedMap.get(achievement.id) ?? null}
            progress={progress}
          />
        );
      })}
    </ul>
  );
}
