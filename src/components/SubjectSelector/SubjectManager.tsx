import { useState } from 'react';
import type { ReactElement } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Subject } from '../../types/study';
import { SUBJECT_COLORS, SUBJECT_ICONS } from '../../lib/storage';
import { formatDuration } from '../../lib/format';
import type { StudyStats } from '../../lib/statistics';
import { Button } from '../ui/Button';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { TextField } from '../ui/Controls';

interface Draft {
  id: string | null;
  name: string;
  icon: string;
  color: string;
}

const EMPTY_DRAFT: Draft = { id: null, name: '', icon: '📘', color: SUBJECT_COLORS[0] as string };

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}): ReactElement {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">Icon</p>
      <div role="radiogroup" aria-label="Subject icon" className="flex flex-wrap gap-1.5">
        {SUBJECT_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={icon === value}
            aria-label={`Icon ${icon}`}
            onClick={() => onChange(icon)}
            className={[
              'grid size-9 place-items-center rounded-xl border text-lg transition',
              icon === value
                ? 'border-brand-soft bg-brand/20'
                : 'border-line bg-raised/50 hover:border-brand-soft/50',
            ].join(' ')}
          >
            <span aria-hidden>{icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}): ReactElement {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">Colour</p>
      <div role="radiogroup" aria-label="Subject colour" className="flex flex-wrap gap-2">
        {SUBJECT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={color === value}
            aria-label={`Colour ${color}`}
            onClick={() => onChange(color)}
            className={[
              'grid size-8 place-items-center rounded-full transition',
              color === value ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-surface' : '',
            ].join(' ')}
            style={{ background: color }}
          >
            {color === value && <Check size={14} className="text-white" aria-hidden />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SubjectManager({
  open,
  onClose,
  subjects,
  stats,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  stats: StudyStats;
  onAdd: (input: { name: string; icon: string; color: string }) => void;
  onUpdate: (id: string, patch: Partial<Omit<Subject, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}): ReactElement {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

  const totalsFor = (id: string) => stats.subjectTotals.find((entry) => entry.subjectId === id);

  const submit = (): void => {
    const name = draft.name.trim();
    if (!name) return;
    if (draft.id) onUpdate(draft.id, { name, icon: draft.icon, color: draft.color });
    else onAdd({ name, icon: draft.icon, color: draft.color });
    setDraft(EMPTY_DRAFT);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Subjects"
        description="Your study missions. Deleting a subject keeps its past sessions in history."
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <ul className="mb-5 space-y-2">
          {subjects.map((subject) => {
            const totals = totalsFor(subject.id);
            return (
              <li
                key={subject.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-raised/50 p-3"
              >
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
                  style={{ background: `${subject.color}26` }}
                >
                  {subject.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{subject.name}</p>
                  <p className="num text-xs text-muted">
                    {totals
                      ? `${formatDuration(totals.seconds)} · ${totals.sessions} sessions`
                      : 'No sessions yet'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${subject.name}`}
                  onClick={() =>
                    setDraft({
                      id: subject.id,
                      name: subject.name,
                      icon: subject.icon,
                      color: subject.color,
                    })
                  }
                  icon={<Pencil size={14} aria-hidden />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${subject.name}`}
                  onClick={() => setPendingDelete(subject)}
                  icon={<Trash2 size={14} aria-hidden />}
                />
              </li>
            );
          })}
          {subjects.length === 0 && (
            <li className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
              No subjects yet — add your first one below.
            </li>
          )}
        </ul>

        <div className="space-y-4 rounded-2xl border border-line/80 bg-base-2/40 p-4">
          <p className="text-sm font-bold text-ink">
            {draft.id ? 'Edit subject' : 'Add a subject'}
          </p>
          <TextField
            label="Name"
            id="subject-name"
            value={draft.name}
            maxLength={40}
            placeholder="e.g. ISO 20022"
            onChange={(name) => setDraft((current) => ({ ...current, name }))}
          />
          <IconPicker
            value={draft.icon}
            onChange={(icon) => setDraft((current) => ({ ...current, icon }))}
          />
          <ColorPicker
            value={draft.color}
            onChange={(color) => setDraft((current) => ({ ...current, color }))}
          />
          <div className="flex justify-end gap-2">
            {draft.id && (
              <Button variant="ghost" onClick={() => setDraft(EMPTY_DRAFT)}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              onClick={submit}
              disabled={!draft.name.trim()}
              icon={draft.id ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
            >
              {draft.id ? 'Save changes' : 'Add subject'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? ''}?`}
        description="The subject is removed from the picker. Sessions already logged against it stay in your history and statistics."
        confirmLabel="Delete subject"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
