import type { ReactElement } from 'react';
import { Coffee, Expand, Keyboard } from 'lucide-react';
import type { Phase } from '../../types/study';
import { formatClock } from '../../lib/format';
import { PHASE_LABEL } from '../../lib/session';
import { Button } from '../ui/Button';
import { ProgressRing } from './ProgressRing';
import { TimerControls } from './TimerControls';

export interface TimerPanelProps {
  phase: Phase;
  seconds: number;
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  hasActive: boolean;
  subjectIcon: string | null;
  subjectName: string | null;
  goal: string;
  breakTips: string[];
  cycleCount: number;
  sessionsBeforeLongBreak: number;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  onEnterFocusMode: () => void;
}

function PhasePill({ phase, paused }: { phase: Phase; paused: boolean }): ReactElement {
  const tone =
    phase === 'focus'
      ? 'border-brand/40 bg-brand/15 text-brand-soft'
      : 'border-mint/40 bg-mint/15 text-mint';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.14em] uppercase ${tone}`}
    >
      {phase !== 'focus' && <Coffee size={12} aria-hidden />}
      {paused ? 'Paused' : PHASE_LABEL[phase]}
    </span>
  );
}

export function TimerPanel({
  phase,
  seconds,
  progress,
  isRunning,
  isPaused,
  hasActive,
  subjectIcon,
  subjectName,
  goal,
  breakTips,
  cycleCount,
  sessionsBeforeLongBreak,
  onToggle,
  onReset,
  onSkip,
  onEnterFocusMode,
}: TimerPanelProps): ReactElement {
  const isBreak = phase !== 'focus';

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-7" aria-label="Timer">
      <div className="mb-3 flex items-center justify-between gap-3">
        <PhasePill phase={phase} paused={isPaused} />
        <div className="flex items-center gap-1">
          <span
            className="num hidden text-xs text-muted sm:inline"
            title="Focus sessions completed in this cycle"
          >
            {cycleCount % sessionsBeforeLongBreak}/{sessionsBeforeLongBreak} to long break
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEnterFocusMode}
            aria-keyshortcuts="F"
            aria-label="Enter focus mode"
            icon={<Expand size={15} aria-hidden />}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[22rem]">
        <ProgressRing
          phase={phase}
          progress={progress}
          idle={!hasActive}
          running={isRunning}
          thickness={11}
        >
          <div>
            {isBreak && (
              <p className="mb-1 text-2xl" aria-hidden>
                ☕
              </p>
            )}
            <p
              className="num text-[3.25rem] leading-none font-extrabold tracking-tight text-ink sm:text-6xl"
              aria-live="off"
            >
              {formatClock(seconds)}
            </p>
            {isBreak ? (
              <p className="mt-2 text-sm font-semibold text-mint">You&apos;ve earned a break</p>
            ) : (
              <div className="mt-2">
                {subjectName && (
                  <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-ink-soft">
                    <span aria-hidden>{subjectIcon}</span>
                    <span className="max-w-[11rem] truncate">{subjectName}</span>
                  </p>
                )}
                {goal && (
                  <p className="mx-auto mt-0.5 max-w-[13rem] truncate text-xs text-muted">{goal}</p>
                )}
              </div>
            )}
          </div>
        </ProgressRing>
      </div>

      <div className="mt-5">
        <TimerControls
          isRunning={isRunning}
          hasActive={hasActive}
          onToggle={onToggle}
          onReset={onReset}
          onSkip={onSkip}
          startLabel={isBreak ? 'Start break' : 'Start focus'}
        />
      </div>

      {isBreak && (
        <ul className="mt-5 grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
          {breakTips.map((tip) => (
            <li
              key={tip}
              className="rounded-2xl border border-line bg-raised/40 px-3 py-2.5 text-center text-xs font-medium"
            >
              {tip}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-faint">
        <Keyboard size={12} aria-hidden />
        Space start/pause · R reset · S skip · F focus mode
      </p>
    </section>
  );
}
