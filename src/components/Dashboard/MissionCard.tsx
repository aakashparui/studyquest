import { useState } from 'react';
import type { ReactElement } from 'react';
import { Rocket, Settings2 } from 'lucide-react';
import type { Subject } from '../../types/study';
import type { StudyStats } from '../../lib/statistics';
import { Button } from '../ui/Button';
import { EmptyState, Segmented, TextField } from '../ui/Controls';
import { SubjectSelector } from '../SubjectSelector/SubjectSelector';
import { SubjectManager } from '../SubjectSelector/SubjectManager';

export interface MissionCardProps {
  subjects: Subject[];
  stats: StudyStats;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  goal: string;
  onGoalChange: (goal: string) => void;
  minutes: number;
  defaultMinutes: number;
  onMinutesChange: (minutes: number | null) => void;
  onStart: () => void;
  /** Hide the controls while a session is already running. */
  locked: boolean;
  onAddSubject: (input: { name: string; icon: string; color: string }) => void;
  onUpdateSubject: (id: string, patch: Partial<Omit<Subject, 'id' | 'createdAt'>>) => void;
  onDeleteSubject: (id: string) => void;
}

function lengthOptions(defaultMinutes: number): number[] {
  return [...new Set([15, 25, 50, defaultMinutes])].sort((a, b) => a - b);
}

export function MissionCard({
  subjects,
  stats,
  selectedId,
  onSelect,
  goal,
  onGoalChange,
  minutes,
  defaultMinutes,
  onMinutesChange,
  onStart,
  locked,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
}: MissionCardProps): ReactElement {
  const [managing, setManaging] = useState(false);
  const selected = subjects.find((subject) => subject.id === selectedId) ?? null;

  return (
    <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Session setup">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {locked ? 'Current mission' : 'Session setup'}
          </h2>
          <p className="mt-1 flex items-center gap-2 truncate text-lg font-bold text-ink">
            <span aria-hidden>{selected?.icon ?? '🎯'}</span>
            <span className="truncate">{goal.trim() || selected?.name || 'Pick a subject'}</span>
          </p>
          {goal.trim() && selected && (
            <p className="mt-0.5 truncate text-xs text-muted">
              {selected.name} · {minutes} min
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setManaging(true)}
          icon={<Settings2 size={14} aria-hidden />}
        >
          Subjects
        </Button>
      </header>

      {subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No subjects yet"
          description="Add a subject so your focus time gets credited somewhere."
          action={
            <Button variant="primary" onClick={() => setManaging(true)}>
              Add a subject
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
              Subject
            </p>
            <SubjectSelector
              subjects={subjects}
              selectedId={selectedId}
              onSelect={onSelect}
              disabled={locked}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
              Session length
            </p>
            <Segmented
              label="Session length"
              value={String(minutes)}
              onChange={(value) => {
                const next = Number(value);
                onMinutesChange(next === defaultMinutes ? null : next);
              }}
              className={locked ? 'pointer-events-none opacity-60' : ''}
              options={lengthOptions(defaultMinutes).map((value) => ({
                value: String(value),
                label: `${value} min`,
              }))}
            />
          </div>

          <TextField
            label="Goal for this session"
            id="session-goal"
            optional
            value={goal}
            maxLength={120}
            placeholder="e.g. ISO 20022 message types"
            onChange={onGoalChange}
          />

          {!locked && (
            <Button
              quiet
              block
              size="lg"
              variant="primary"
              onClick={onStart}
              icon={<Rocket size={18} aria-hidden />}
            >
              Start focus · {minutes} min
            </Button>
          )}
        </div>
      )}

      <SubjectManager
        open={managing}
        onClose={() => setManaging(false)}
        subjects={subjects}
        stats={stats}
        onAdd={onAddSubject}
        onUpdate={onUpdateSubject}
        onDelete={onDeleteSubject}
      />
    </section>
  );
}
