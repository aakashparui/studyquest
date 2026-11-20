import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { NotebookPen } from 'lucide-react';

/**
 * The note on a logged session: shown as plain text, editable in place.
 * Saves on blur rather than on each keystroke, so a long history doesn't
 * re-derive its statistics while you type.
 */
export function SessionNotes({
  notes,
  onSave,
  label,
}: {
  notes: string;
  onSave: (notes: string) => void;
  /** Used for the accessible name, e.g. the subject and time. */
  label: string;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) fieldRef.current?.focus();
  }, [editing]);

  // Seeded here rather than synced from a prop in an effect.
  const startEditing = (): void => {
    setDraft(notes);
    setEditing(true);
  };

  const commit = (): void => {
    setEditing(false);
    if (draft.trim() !== notes) onSave(draft.trim());
  };

  if (editing) {
    return (
      <textarea
        ref={fieldRef}
        rows={2}
        value={draft}
        maxLength={500}
        aria-label={`Notes for ${label}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setDraft(notes);
            setEditing(false);
          }
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) commit();
        }}
        placeholder="What did you cover?"
        className="mt-2 w-full resize-none rounded-lg border border-line bg-base-2/60 px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-brand-soft/70 focus:outline-none"
      />
    );
  }

  if (!notes) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-faint transition hover:text-ink-soft"
      >
        <NotebookPen size={11} aria-hidden />
        Add a note
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={`Edit notes for ${label}`}
      className="mt-2 block w-full rounded-lg border-l-2 border-brand/50 bg-base-2/40 px-2.5 py-1.5 text-left text-xs leading-relaxed text-ink-soft transition hover:border-brand hover:text-ink"
    >
      {notes}
    </button>
  );
}
