import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useStudy } from '../store/useStudy';
import { Card } from '../components/ui/Card';
import { Segmented } from '../components/ui/Controls';
import { SessionList } from '../components/History/SessionList';
import { formatDuration, pluralise } from '../lib/format';

type Filter = 'all' | 'focus' | 'subject';

export function HistoryPage(): ReactElement {
  const { state, stats, selectedSubjectId, setSessionNotes } = useStudy();
  const [filter, setFilter] = useState<Filter>('focus');

  const sessions = useMemo(() => {
    const all = [...state.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
    if (filter === 'focus') return all.filter((session) => session.phase === 'focus');
    if (filter === 'subject')
      return all.filter(
        (session) => session.phase === 'focus' && session.subjectId === selectedSubjectId,
      );
    return all;
  }, [state.sessions, filter, selectedSubjectId]);

  const subjectName =
    state.subjects.find((subject) => subject.id === selectedSubjectId)?.name ?? 'Current subject';

  return (
    <Card
      title="Study history"
      subtitle={`${stats.totalPomodoros} completed ${pluralise(
        stats.totalPomodoros,
        'Pomodoro',
      )} · ${formatDuration(stats.totalFocusSeconds)} of focus`}
    >
      <div className="mb-5">
        <Segmented<Filter>
          label="History filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'focus', label: 'Focus sessions' },
            { value: 'all', label: 'Everything' },
            { value: 'subject', label: subjectName, title: `Only ${subjectName}` },
          ]}
        />
      </div>
      <SessionList sessions={sessions} onSaveNotes={setSessionNotes} />
    </Card>
  );
}
