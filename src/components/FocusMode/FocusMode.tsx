import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Minimize2, Pause, Play } from 'lucide-react';
import type { Phase } from '../../types/study';
import { formatClock } from '../../lib/format';
import { PHASE_LABEL } from '../../lib/session';
import { Button } from '../ui/Button';
import { Aurora } from '../ui/Aurora';
import { ProgressRing } from '../Timer/ProgressRing';
import { ComboMeter } from '../Dashboard/ComboMeter';

export interface FocusModeProps {
  phase: Phase;
  seconds: number;
  progress: number;
  isRunning: boolean;
  subjectIcon: string | null;
  subjectName: string | null;
  goal: string;
  mascotMessage: string;
  combo: number;
  bestCombo: number;
  onToggle: () => void;
  onExit: () => void;
}

export function FocusMode({
  phase,
  seconds,
  progress,
  isRunning,
  subjectIcon,
  subjectName,
  goal,
  mascotMessage,
  combo,
  bestCombo,
  onToggle,
  onExit,
}: FocusModeProps): ReactElement {
  // Keep the page from scrolling behind the overlay.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex flex-col bg-base"
      role="region"
      aria-label="Focus mode"
    >
      <Aurora phase={phase} intensity="strong" />

      <header className="flex items-center justify-between p-4 sm:p-6">
        <span className="rounded-full border border-line/80 bg-raised/50 px-3 py-1.5 text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase">
          {isRunning ? `${PHASE_LABEL[phase]} mode` : 'Paused'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onExit}
          aria-keyshortcuts="Escape"
          icon={<Minimize2 size={15} aria-hidden />}
        >
          Exit
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-[26rem]">
          <ProgressRing
            phase={phase}
            progress={progress}
            running={isRunning}
            thickness={8}
          >
            <div>
              <p className="num text-[4rem] leading-none font-extrabold tracking-tighter text-ink sm:text-[5.5rem]">
                {formatClock(seconds)}
              </p>
              {subjectName && (
                <p className="mt-3 flex items-center justify-center gap-2 text-base font-bold text-ink-soft">
                  <span aria-hidden>{subjectIcon}</span>
                  <span className="max-w-[12rem] truncate">{subjectName}</span>
                </p>
              )}
              {goal && (
                <p className="mx-auto mt-1 max-w-[14rem] truncate text-sm text-muted">{goal}</p>
              )}
            </div>
          </ProgressRing>
        </div>

        <p
          key={mascotMessage}
          className="animate-fade mt-8 max-w-sm text-center text-sm font-medium text-ink-soft"
          aria-live="polite"
        >
          {mascotMessage}
        </p>

        <div className="mt-7">
          <Button
            quiet
            size="xl"
            variant={isRunning ? 'secondary' : 'primary'}
            onClick={onToggle}
            aria-keyshortcuts="Space"
            className="min-w-[11rem]"
            icon={isRunning ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </Button>
        </div>

        {combo > 0 && (
          <div className="mt-6 opacity-80">
            <ComboMeter combo={combo} best={bestCombo} compact />
          </div>
        )}
      </main>
    </div>
  );
}
