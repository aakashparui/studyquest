import type { ReactElement } from 'react';
import { X } from 'lucide-react';
import type { Toast } from '../../types/study';

const ACCENT: Record<Toast['kind'], string> = {
  info: 'from-cyan/20 to-transparent border-cyan/30',
  xp: 'from-brand/25 to-transparent border-brand/40',
  achievement: 'from-amber/25 to-transparent border-amber/40',
  level: 'from-accent/25 to-transparent border-accent/40',
  event: 'from-mint/25 to-transparent border-mint/40',
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}): ReactElement {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-rise glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-gradient-to-br p-3.5 pr-2.5 ${
            ACCENT[toast.kind]
          }`}
        >
          <span aria-hidden className="mt-0.5 text-xl leading-none">
            {toast.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs leading-snug text-muted">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-raised hover:text-ink"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
