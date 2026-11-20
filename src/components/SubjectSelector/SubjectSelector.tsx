import type { ReactElement } from 'react';
import type { Subject } from '../../types/study';

export function SubjectChip({
  subject,
  selected,
  onSelect,
}: {
  subject: Subject;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        'flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]',
        selected
          ? 'border-transparent text-ink shadow-[0_10px_28px_-18px_var(--color-brand)]'
          : 'border-line bg-raised/50 text-ink-soft hover:border-brand-soft/50 hover:text-ink',
      ].join(' ')}
      style={
        selected
          ? {
              background: `linear-gradient(135deg, ${subject.color}33, ${subject.color}14)`,
              borderColor: `${subject.color}80`,
            }
          : undefined
      }
    >
      <span aria-hidden className="text-base leading-none">
        {subject.icon}
      </span>
      <span className="max-w-[9rem] truncate">{subject.name}</span>
    </button>
  );
}

export function SubjectSelector({
  subjects,
  selectedId,
  onSelect,
  disabled = false,
}: {
  subjects: Subject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label="Study subject"
      className={`flex flex-wrap gap-2 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      {subjects.map((subject) => (
        <SubjectChip
          key={subject.id}
          subject={subject}
          selected={subject.id === selectedId}
          onSelect={() => onSelect(subject.id)}
        />
      ))}
    </div>
  );
}
