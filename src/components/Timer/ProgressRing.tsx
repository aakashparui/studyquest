import type { ReactElement, ReactNode } from 'react';
import type { Phase } from '../../types/study';

const GRADIENTS: Record<Phase, [string, string]> = {
  focus: ['var(--color-brand-soft)', 'var(--color-accent)'],
  shortBreak: ['var(--color-mint)', 'var(--color-cyan)'],
  longBreak: ['var(--color-cyan)', 'var(--color-brand-soft)'],
};

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  phase: Phase;
  children?: ReactNode;
  /** Diameter in px of the drawn circle; the element scales to its box. */
  thickness?: number;
  idle?: boolean;
  running?: boolean;
  className?: string;
}

const VIEW = 260;

export function ProgressRing({
  progress,
  phase,
  children,
  thickness = 10,
  idle = false,
  running = false,
  className = '',
}: ProgressRingProps): ReactElement {
  const radius = (VIEW - thickness) / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dash = circumference * clamped;
  const [from, to] = GRADIENTS[phase];
  const gradientId = `ring-${phase}`;

  return (
    <div className={`relative aspect-square w-full ${className}`}>
      {running && (
        <div
          aria-hidden
          className="animate-pulse-ring anim-rich absolute inset-[6%] rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${from}44, transparent 68%)`,
          }}
        />
      )}
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={thickness}
          opacity={0.55}
        />
        {!idle && (
          <circle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 300ms linear' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center px-6 text-center">{children}</div>
    </div>
  );
}
