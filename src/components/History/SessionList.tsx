import type { ReactElement } from 'react';
import { CheckCircle2, Coffee, XCircle } from 'lucide-react';
import type { SessionRecord } from '../../types/study';
import { clockTime, friendlyDay } from '../../lib/date';
import { formatDuration, pluralise } from '../../lib/format';
import { groupSessionsByDay } from '../../lib/statistics';
import { EmptyState } from '../ui/Controls';
import { SessionNotes } from './SessionNotes';

function SessionRow({
  session,
  onSaveNotes,
}: {
  session: SessionRecord;
  onSaveNotes: (notes: string) => void;
}): ReactElement {
  const isBreak = session.phase !== 'focus';
  return (
    <li className="rounded-2xl border border-line/80 bg-raised/35 p-3">
      <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
        style={{
          background: isBreak ? 'color-mix(in oklab, var(--color-mint) 16%, transparent)' : `${session.subjectColor}24`,
        }}
      >
        {isBreak ? <Coffee size={16} className="text-mint" aria-hidden /> : session.subjectIcon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="num">{session.plannedMinutes} min</span>
          <span className="text-faint">·</span>
          <span className="truncate">
            {isBreak ? (session.phase === 'longBreak' ? 'Long break' : 'Short break') : session.subjectName}
          </span>
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {session.goal ? `${session.goal} · ` : ''}
          {clockTime(session.endedAt)}
          {session.completed && !isBreak && session.pauses > 0
            ? ` · ${session.pauses} ${pluralise(session.pauses, 'pause')}`
            : ''}
          {!session.completed ? ` · ${formatDuration(session.focusedSeconds)} before stopping` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {session.completed ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-mint">
            <CheckCircle2 size={12} aria-hidden /> Completed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-faint">
            <XCircle size={12} aria-hidden /> Abandoned
          </span>
        )}
        {session.xpEarned > 0 && (
          <span className="num text-xs font-bold text-brand-soft">+{session.xpEarned} XP</span>
        )}
        </div>
      </div>

      {!isBreak && (
        <SessionNotes
          notes={session.notes}
          onSave={onSaveNotes}
          label={`${session.subjectName} at ${clockTime(session.endedAt)}`}
        />
      )}
    </li>
  );
}

export function SessionList({
  sessions,
  onSaveNotes,
}: {
  sessions: SessionRecord[];
  onSaveNotes: (sessionId: string, notes: string) => void;
}): ReactElement {
  const grouped = groupSessionsByDay(sessions);

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon="🗂"
        title="No sessions yet"
        description="Finish your first Pomodoro and it will show up here with the XP it earned."
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([day, entries]) => {
        const focusCount = entries.filter((s) => s.phase === 'focus' && s.completed).length;
        const focusSeconds = entries
          .filter((s) => s.phase === 'focus')
          .reduce((sum, s) => sum + s.focusedSeconds, 0);
        return (
          <section key={day}>
            <header className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold text-ink">{friendlyDay(day)}</h3>
              <p className="num text-xs text-muted">
                {focusCount} {pluralise(focusCount, 'Pomodoro')} · {formatDuration(focusSeconds)}
              </p>
            </header>
            <ul className="space-y-2">
              {entries.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onSaveNotes={(notes) => onSaveNotes(session.id, notes)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
