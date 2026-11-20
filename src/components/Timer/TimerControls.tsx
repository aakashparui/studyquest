import type { ReactElement } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '../ui/Button';

export interface TimerControlsProps {
  isRunning: boolean;
  hasActive: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  startLabel?: string;
  compact?: boolean;
}

export function TimerControls({
  isRunning,
  hasActive,
  onToggle,
  onReset,
  onSkip,
  startLabel = 'Start',
  compact = false,
}: TimerControlsProps): ReactElement {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
      <Button
        quiet
        variant="primary"
        size={compact ? 'lg' : 'xl'}
        onClick={onToggle}
        className="w-full sm:w-auto sm:min-w-[8.5rem]"
        aria-keyshortcuts="Space"
        icon={isRunning ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
      >
        {isRunning ? 'Pause' : hasActive ? 'Resume' : startLabel}
      </Button>
      <div className="flex gap-2 sm:gap-3">
        <Button
          quiet
          variant="secondary"
          size={compact ? 'md' : 'lg'}
          onClick={onReset}
          disabled={!hasActive}
          aria-keyshortcuts="R"
          className="flex-1 sm:flex-none"
          icon={<RotateCcw size={16} aria-hidden />}
        >
          Reset
        </Button>
        <Button
          quiet
          variant="secondary"
          size={compact ? 'md' : 'lg'}
          onClick={onSkip}
          aria-keyshortcuts="S"
          className="flex-1 sm:flex-none"
          icon={<SkipForward size={16} aria-hidden />}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
