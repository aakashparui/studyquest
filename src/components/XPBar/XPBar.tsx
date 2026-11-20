import type { ReactElement } from 'react';
import { formatNumber } from '../../lib/format';
import type { LevelInfo } from '../../lib/xpSystem';

export function XPBar({
  level,
  showNumbers = true,
  height = 'md',
}: {
  level: LevelInfo;
  showNumbers?: boolean;
  height?: 'sm' | 'md';
}): ReactElement {
  const pct = Math.round(level.progress * 100);
  return (
    <div>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-raised ring-1 ring-line/80 ${
          height === 'sm' ? 'h-2' : 'h-3'
        }`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={level.xpForLevel}
        aria-valuenow={level.xpIntoLevel}
        aria-label={`Level ${level.level} progress: ${level.xpIntoLevel} of ${level.xpForLevel} XP`}
      >
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-brand via-accent to-cyan transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(pct, level.xpIntoLevel > 0 ? 3 : 0)}%` }}
        >
          <span
            aria-hidden
            className="animate-shimmer anim-rich absolute inset-0 rounded-full opacity-60"
            style={{
              background:
                'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
              backgroundSize: '220% 100%',
            }}
          />
        </div>
      </div>
      {showNumbers && (
        <div className="num mt-2 flex items-center justify-between text-xs text-muted">
          <span>
            {formatNumber(level.xpIntoLevel)} / {formatNumber(level.xpForLevel)} XP
          </span>
          <span>{formatNumber(level.xpRemaining)} to next level</span>
        </div>
      )}
    </div>
  );
}
