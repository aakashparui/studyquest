import type { ReactElement } from 'react';
import type { AmbientKind } from '../../types/study';
import { AMBIENT_OPTIONS, sound } from '../../lib/sound';
import { Slider } from '../ui/Controls';

export function AmbientControl({
  value,
  volume,
  onChange,
  onVolume,
  compact = false,
}: {
  value: AmbientKind;
  volume: number;
  onChange: (kind: AmbientKind) => void;
  onVolume: (volume: number) => void;
  compact?: boolean;
}): ReactElement {
  const pick = (kind: AmbientKind): void => {
    void sound.resume();
    onChange(kind);
  };

  return (
    <section
      className={compact ? '' : 'glass rounded-3xl p-5 sm:p-6'}
      aria-label="Ambient sound"
    >
      {!compact && (
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Ambient sound
        </p>
      )}
      <div role="radiogroup" aria-label="Ambient sound" className="flex flex-wrap gap-2">
        {AMBIENT_OPTIONS.map((option) => {
          const selected = option.kind === value;
          return (
            <button
              key={option.kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick(option.kind)}
              className={[
                'flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]',
                selected
                  ? 'border-brand-soft/60 bg-brand/20 text-ink'
                  : 'border-line bg-raised/50 text-ink-soft hover:border-brand-soft/40 hover:text-ink',
              ].join(' ')}
            >
              <span aria-hidden>{option.icon}</span>
              {option.label}
            </button>
          );
        })}
      </div>
      {value !== 'silent' && (
        <Slider
          label="Volume"
          value={volume}
          onChange={onVolume}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      )}
      {!compact && (
        <p className="mt-1 text-xs text-muted">
          Generated locally — nothing streams, so it works offline.
        </p>
      )}
    </section>
  );
}
