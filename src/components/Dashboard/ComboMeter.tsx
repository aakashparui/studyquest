import type { ReactElement } from 'react';
import { comboBonus } from '../../lib/xpSystem';

const MAX_PIPS = 4;

export function ComboMeter({
  combo,
  best,
  compact = false,
}: {
  combo: number;
  best: number;
  compact?: boolean;
}): ReactElement {
  const pips = Math.min(combo, MAX_PIPS);
  const bonus = comboBonus(combo);

  return (
    <section
      className={compact ? 'flex items-center gap-2' : 'glass rounded-3xl p-5 sm:p-6'}
      aria-label="Focus combo"
    >
      {!compact && (
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Focus combo
        </p>
      )}
      <div className={compact ? 'flex items-center gap-2' : 'mt-2 flex items-center gap-3'}>
        <div className="flex items-center" aria-hidden>
          {Array.from({ length: MAX_PIPS }, (_, index) => (
            <span
              key={index}
              className={[
                'text-xl transition-all duration-300',
                index < pips ? 'opacity-100' : 'opacity-20 grayscale',
                index < pips ? 'animate-pop' : '',
              ].join(' ')}
              style={{ marginLeft: index === 0 ? 0 : '-2px' }}
            >
              🔥
            </span>
          ))}
        </div>
        <div>
          <p className="num text-base font-extrabold text-ink">{combo}x combo</p>
          {!compact && (
            <p className="text-xs text-muted">
              {combo === 0
                ? 'Finish a focus session without abandoning it.'
                : `+${bonus} XP per session · best ${best}x`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
