import type { ReactElement } from 'react';
import type { MascotMood } from '../../lib/mascot';

type EyeStyle = 'open' | 'happy' | 'closed' | 'determined' | 'wide';

const MOOD_LOOK: Record<MascotMood, { eyes: EyeStyle; hue: string; tint: string }> = {
  idle: { eyes: 'open', hue: 'var(--color-brand-soft)', tint: 'var(--color-accent)' },
  start: { eyes: 'determined', hue: 'var(--color-brand)', tint: 'var(--color-accent)' },
  quarter: { eyes: 'open', hue: 'var(--color-brand-soft)', tint: 'var(--color-cyan)' },
  half: { eyes: 'determined', hue: 'var(--color-amber)', tint: 'var(--color-rose)' },
  final: { eyes: 'wide', hue: 'var(--color-rose)', tint: 'var(--color-amber)' },
  paused: { eyes: 'closed', hue: 'var(--color-faint)', tint: 'var(--color-muted)' },
  complete: { eyes: 'happy', hue: 'var(--color-mint)', tint: 'var(--color-cyan)' },
  break: { eyes: 'closed', hue: 'var(--color-cyan)', tint: 'var(--color-mint)' },
  breakEnd: { eyes: 'open', hue: 'var(--color-cyan)', tint: 'var(--color-brand-soft)' },
  hotStreak: { eyes: 'happy', hue: 'var(--color-amber)', tint: 'var(--color-rose)' },
  abandoned: { eyes: 'closed', hue: 'var(--color-muted)', tint: 'var(--color-faint)' },
  levelUp: { eyes: 'happy', hue: 'var(--color-accent)', tint: 'var(--color-brand-soft)' },
};

function Eyes({ kind }: { kind: EyeStyle }): ReactElement {
  if (kind === 'closed') {
    return (
      <g stroke="#0b0d18" strokeWidth={3.4} strokeLinecap="round" fill="none">
        <path d="M30 44 q7 5 14 0" />
        <path d="M56 44 q7 5 14 0" />
      </g>
    );
  }
  if (kind === 'happy') {
    return (
      <g stroke="#0b0d18" strokeWidth={3.4} strokeLinecap="round" fill="none">
        <path d="M30 46 q7 -8 14 0" />
        <path d="M56 46 q7 -8 14 0" />
      </g>
    );
  }
  const ry = kind === 'wide' ? 8.5 : kind === 'determined' ? 5 : 7;
  return (
    <g>
      <ellipse cx={37} cy={45} rx={5.6} ry={ry} fill="#0b0d18" />
      <ellipse cx={63} cy={45} rx={5.6} ry={ry} fill="#0b0d18" />
      <circle cx={39} cy={42.5} r={1.9} fill="#ffffff" opacity={0.92} />
      <circle cx={65} cy={42.5} r={1.9} fill="#ffffff" opacity={0.92} />
      {kind === 'determined' && (
        <g stroke="#0b0d18" strokeWidth={3} strokeLinecap="round">
          <path d="M31 34 l11 3.5" />
          <path d="M69 34 l-11 3.5" />
        </g>
      )}
    </g>
  );
}

export function MascotAvatar({
  mood,
  size = 96,
  animate = true,
}: {
  mood: MascotMood;
  size?: number;
  animate?: boolean;
}): ReactElement {
  const look = MOOD_LOOK[mood] ?? MOOD_LOOK.idle;
  const smile = mood === 'complete' || mood === 'hotStreak' || mood === 'levelUp';

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={animate ? 'animate-bob anim-rich shrink-0' : 'shrink-0'}
      role="img"
      aria-label="Focus companion"
    >
      <defs>
        <radialGradient id="mascot-body" cx="38%" cy="28%" r="78%">
          <stop offset="0%" stopColor={look.hue} />
          <stop offset="100%" stopColor={look.tint} />
        </radialGradient>
      </defs>
      <ellipse cx={50} cy={92} rx={24} ry={4.5} fill="#000" opacity={0.18} />
      {/* antenna */}
      <path
        d="M50 20 C50 12, 58 10, 57 4"
        stroke={look.tint}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={57.5} cy={3.5} r={4} fill={look.tint} />
      {/* body */}
      <path
        d="M50 18 C72 18, 84 34, 84 54 C84 74, 70 87, 50 87 C30 87, 16 74, 16 54 C16 34, 28 18, 50 18 Z"
        fill="url(#mascot-body)"
      />
      <path
        d="M50 18 C72 18, 84 34, 84 54 C84 74, 70 87, 50 87 C30 87, 16 74, 16 54 C16 34, 28 18, 50 18 Z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.22}
        strokeWidth={1.5}
      />
      {/* face plate */}
      <ellipse cx={50} cy={48} rx={30} ry={24} fill="#f7f8ff" opacity={0.95} />
      <Eyes kind={look.eyes} />
      {smile ? (
        <path d="M41 60 q9 9 18 0" stroke="#0b0d18" strokeWidth={3.2} fill="none" strokeLinecap="round" />
      ) : (
        <path d="M44 61 q6 4 12 0" stroke="#0b0d18" strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
      {/* cheeks */}
      <circle cx={28} cy={54} r={4.2} fill={look.tint} opacity={0.35} />
      <circle cx={72} cy={54} r={4.2} fill={look.tint} opacity={0.35} />
    </svg>
  );
}

export function Mascot({
  mood,
  message,
  compact = false,
}: {
  mood: MascotMood;
  message: string;
  compact?: boolean;
}): ReactElement {
  return (
    <div
      className={`flex items-center gap-3 ${compact ? '' : 'glass rounded-3xl p-4 sm:p-5'}`}
      aria-live="polite"
    >
      <MascotAvatar mood={mood} size={compact ? 56 : 76} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Pip says</p>
        <p
          key={message}
          className="animate-fade mt-1 text-sm leading-snug font-medium text-ink sm:text-[0.95rem]"
        >
          {message}
        </p>
      </div>
    </div>
  );
}
