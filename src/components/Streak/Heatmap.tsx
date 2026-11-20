import type { ReactElement } from 'react';
import type { HeatCell } from '../../lib/streak';
import { formatDuration, pluralise } from '../../lib/format';
import { friendlyDay } from '../../lib/date';

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-raised/70 ring-line/50',
  1: 'bg-brand/25 ring-brand/30',
  2: 'bg-brand/50 ring-brand/40',
  3: 'bg-brand/75 ring-brand/50',
  4: 'bg-gradient-to-br from-brand to-accent ring-accent/50',
};

export function Heatmap({ weeks }: { weeks: HeatCell[][] }): ReactElement {
  return (
    <div>
      <div
        className="flex gap-[3px] overflow-x-auto pb-2 sm:justify-end"
        role="img"
        aria-label="Study activity over the last 22 weeks"
      >
        {weeks.map((week, weekIndex) => (
          <div key={week[0]?.key ?? weekIndex} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.key}
                title={
                  cell.future
                    ? ''
                    : `${friendlyDay(cell.key)} — ${cell.pomodoros} ${pluralise(
                        cell.pomodoros,
                        'Pomodoro',
                      )}${cell.seconds ? ` · ${formatDuration(cell.seconds)}` : ''}`
                }
                className={[
                  'size-[11px] rounded-[3px] ring-1 transition-colors sm:size-3',
                  cell.future ? 'bg-transparent ring-transparent' : LEVEL_CLASS[cell.level],
                ].join(' ')}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`size-2.5 rounded-[3px] ring-1 ${LEVEL_CLASS[level]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
