import type { ReactElement } from 'react';
import { Sparkles } from 'lucide-react';
import { formatNumber } from '../../lib/format';
import type { LevelInfo } from '../../lib/xpSystem';
import { XPBar } from '../XPBar/XPBar';

export function LevelBadge({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' }): ReactElement {
  return (
    <div
      className={[
        'relative grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent font-black text-white',
        'shadow-[0_14px_36px_-16px_var(--color-brand)]',
        size === 'md' ? 'size-14 text-xl' : 'size-10 text-base',
      ].join(' ')}
    >
      <span className="absolute inset-0 rounded-2xl ring-1 ring-white/25 ring-inset" aria-hidden />
      {level}
    </div>
  );
}

export function LevelCard({ level }: { level: LevelInfo }): ReactElement {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Level progress">
      <div className="flex items-center gap-4">
        <LevelBadge level={level.level} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Level {level.level}
          </p>
          <h2 className="text-gradient truncate text-xl font-extrabold tracking-tight sm:text-2xl">
            {level.title}
          </h2>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised/60 px-3 py-1.5 text-xs font-semibold text-ink-soft sm:flex">
          <Sparkles size={13} className="text-amber" aria-hidden />
          <span className="num">{formatNumber(level.totalXp)} XP</span>
        </div>
      </div>
      <div className="mt-4">
        <XPBar level={level} />
      </div>
    </section>
  );
}
