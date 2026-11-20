import { useState } from 'react';
import type { ReactElement } from 'react';
import { Target } from 'lucide-react';
import { formatDuration, pluralise } from '../../lib/format';
import type { StudyStats } from '../../lib/statistics';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { NumberStepper, Segmented } from '../ui/Controls';

function GoalRing({ progress, children }: { progress: number; children: ReactElement }): ReactElement {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(1, Math.max(0, progress));
  return (
    <div className="relative size-[132px] shrink-0">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="goal-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-mint)" />
            <stop offset="100%" stopColor="var(--color-cyan)" />
          </linearGradient>
        </defs>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="9"
          opacity="0.6"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#goal-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 600ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function DailyGoalCard({
  stats,
  goalPomodoros,
  focusMinutes,
  onChangeGoal,
}: {
  stats: StudyStats;
  goalPomodoros: number;
  focusMinutes: number;
  onChangeGoal: (value: number) => void;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const pct = Math.round(stats.goalProgress * 100);
  const hoursPreset = Math.max(1, Math.round(120 / Math.max(1, focusMinutes)));

  return (
    <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Daily goal">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">Today</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          icon={<Target size={14} aria-hidden />}
        >
          Goal
        </Button>
      </header>

      <div className="flex items-center gap-5">
        <GoalRing progress={stats.goalProgress}>
          <div>
            <div className="num text-2xl leading-none font-extrabold text-ink">
              {stats.todayPomodoros}
              <span className="text-base font-bold text-muted">/{goalPomodoros}</span>
            </div>
            <div className="num mt-1 text-[11px] font-semibold text-mint">{pct}%</div>
          </div>
        </GoalRing>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Focus time today
            </p>
            <p className="num text-2xl font-extrabold text-ink">
              {formatDuration(stats.todaySeconds)}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            {stats.goalReached
              ? `Goal cleared — ${stats.todayPomodoros} ${pluralise(
                  stats.todayPomodoros,
                  'Pomodoro',
                )} done. Anything more is a bonus.`
              : `${goalPomodoros - stats.todayPomodoros} more ${pluralise(
                  goalPomodoros - stats.todayPomodoros,
                  'Pomodoro',
                )} to hit today's goal.`}
          </p>
        </div>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Daily goal"
        description="How much do you want to get through on a normal day?"
        footer={
          <Button variant="primary" onClick={() => setEditing(false)}>
            Done
          </Button>
        }
      >
        <Segmented
          label="Goal presets"
          value={String(goalPomodoros)}
          onChange={(value) => onChangeGoal(Number(value))}
          options={[
            { value: String(hoursPreset), label: '≈2 hours' },
            { value: '4', label: '4 Pomodoros' },
            { value: '6', label: '6 Pomodoros' },
            { value: '8', label: '8 Pomodoros' },
          ]}
        />
        <div className="mt-2 divide-y divide-line/70">
          <NumberStepper
            label="Custom goal"
            unit="pomos"
            min={1}
            max={24}
            value={goalPomodoros}
            onChange={onChangeGoal}
            description={`About ${formatDuration(goalPomodoros * focusMinutes * 60)} of focus`}
          />
        </div>
      </Modal>
    </section>
  );
}
