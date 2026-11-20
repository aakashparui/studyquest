import type { ReactElement } from 'react';
import type { SeriesPoint } from '../../lib/statistics';

/**
 * Single-series magnitude chart: one hue, value encoded by length only.
 * Data ends are rounded, the baseline end is square, tracks stay recessive
 * and every value is also written out in text so colour is never the only
 * channel.
 */
export function BarList({
  data,
  unit = 'min',
  format,
  emptyLabel = 'No focus time logged yet.',
  highlightLabel = 'Today',
}: {
  data: SeriesPoint[];
  unit?: string;
  format?: (value: number) => string;
  emptyLabel?: string;
  highlightLabel?: string;
}): ReactElement {
  const max = data.reduce((best, point) => Math.max(best, point.value), 0);

  if (max === 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-[6px]">
      {data.map((point) => {
        const pct = (point.value / max) * 100;
        const text = format ? format(point.value) : `${point.value} ${unit}`;
        return (
          <li
            key={point.key}
            className="flex items-center gap-3"
            title={`${point.label}: ${text}${point.highlight ? ` (${highlightLabel})` : ''}`}
          >
            <span
              className={`w-10 shrink-0 text-xs font-semibold ${
                point.highlight ? 'text-ink' : 'text-muted'
              }`}
            >
              {point.label}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-[4px] bg-line/50">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.max(pct, point.value > 0 ? 2 : 0)}%`,
                  background: point.highlight
                    ? 'linear-gradient(90deg, var(--color-brand), var(--color-accent))'
                    : 'var(--color-brand)',
                  opacity: point.highlight ? 1 : 0.78,
                }}
              />
            </span>
            <span
              className={`num w-16 shrink-0 text-right text-xs font-semibold ${
                point.value > 0 ? 'text-ink-soft' : 'text-faint'
              }`}
            >
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Subject split, coloured by the subject's own identity colour. */
export function SubjectBars({
  data,
  format,
}: {
  data: { key: string; label: string; icon: string; color: string; value: number }[];
  format: (value: number) => string;
}): ReactElement {
  const max = data.reduce((best, point) => Math.max(best, point.value), 0);
  if (data.length === 0 || max === 0) {
    return <p className="py-6 text-center text-sm text-muted">No subject time logged yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((point) => (
        <li key={point.key} title={`${point.label}: ${format(point.value)}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink-soft">
              <span aria-hidden>{point.icon}</span>
              <span className="truncate">{point.label}</span>
            </span>
            <span className="num shrink-0 font-semibold text-muted">{format(point.value)}</span>
          </div>
          <span className="relative block h-2.5 overflow-hidden rounded-[4px] bg-line/50">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max((point.value / max) * 100, 2)}%`,
                background: point.color,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
