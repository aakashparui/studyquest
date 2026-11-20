import { useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Narrow dialogs for confirmations, wider for forms. */
  width?: 'sm' | 'md';
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: ModalProps): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog so Tab stays somewhere sensible.
    const id = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previous;
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto overscroll-contain bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'animate-rise glass my-auto w-full rounded-t-3xl p-5 sm:rounded-3xl sm:p-6',
          width === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg',
        ].join(' ')}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close dialog"
            onClick={onClose}
            icon={<X size={16} aria-hidden />}
          />
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}): ReactElement | null {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
