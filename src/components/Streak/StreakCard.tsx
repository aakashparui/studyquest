import type { ReactElement } from 'react';
import { Flame } from 'lucide-react';
import type { StudyStats } from '../../lib/statistics';
import { pluralise } from '../../lib/format';
import { Heatmap } from './Heatmap';

export function StreakCard({ stats }: { stats: StudyStats }): ReactElement {
  const { streak, longest, atRisk } = stats;

  return (
    <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Study streak">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Streak</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl leading-none" aria-hidden>
              🔥
            </span>
            <span className="num text-3xl font-extrabold text-ink">{streak}</span>
            <span className="text-sm font-semibold text-muted">
              {pluralise(streak, 'day')} streak
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {streak === 0
              ? 'Finish one focus session today to start a streak.'
              : atRisk
                ? 'Today is still open — one session keeps it alive.'
                : `Longest run so far: ${longest} ${pluralise(longest, 'day')}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-raised/60 px-3 py-1.5 text-xs font-semibold text-ink-soft">
          <Flame size={13} className={atRisk ? 'text-amber' : 'text-rose'} aria-hidden />
          <span className="num">Best {longest}</span>
        </div>
      </div>
      <div className="mt-5">
        <Heatmap weeks={stats.heatmap} />
      </div>
    </section>
  );
}
