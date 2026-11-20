import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { Phase } from '../../types/study';

const PALETTES: Record<Phase, string[]> = {
  focus: ['var(--color-brand)', 'var(--color-accent)', 'var(--color-cyan)'],
  shortBreak: ['var(--color-mint)', 'var(--color-cyan)', 'var(--color-brand-soft)'],
  longBreak: ['var(--color-cyan)', 'var(--color-brand-soft)', 'var(--color-mint)'],
};

/**
 * Slow-moving background wash. Deliberately low contrast: it should read as
 * atmosphere, never as motion competing with the timer.
 */
export function Aurora({
  phase = 'focus',
  intensity = 'soft',
}: {
  phase?: Phase;
  intensity?: 'soft' | 'strong';
}): ReactElement {
  const colors = PALETTES[phase];
  const blobs = useMemo(
    () => [
      { top: '-12%', left: '-8%', size: '46vw', delay: '0s' },
      { top: '38%', left: '62%', size: '52vw', delay: '-9s' },
      { top: '68%', left: '8%', size: '40vw', delay: '-17s' },
    ],
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {blobs.map((blob, index) => (
        <div
          key={index}
          className="animate-drift anim-rich absolute rounded-full blur-[90px]"
          style={{
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            animationDelay: blob.delay,
            background: `radial-gradient(circle at 50% 50%, ${colors[index] ?? colors[0]}, transparent 70%)`,
            opacity: intensity === 'strong' ? 0.3 : 0.17,
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, transparent, color-mix(in oklab, var(--color-base) 70%, transparent) 75%)',
        }}
      />
    </div>
  );
}
