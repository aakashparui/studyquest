import { useEffect } from 'react';

export interface ShortcutHandlers {
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  onToggleFocusMode: () => void;
  onEscape: () => void;
}

/**
 * True when the keystroke belongs to the focused control rather than to the
 * app: text entry, and any widget where Space/Enter is its own activation.
 */
function belongsToFocusedControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true;
  if (target.isContentEditable) return true;
  const role = target.getAttribute('role');
  return role === 'textbox' || role === 'switch' || role === 'radio' || role === 'slider';
}

/** Any open dialog owns the keyboard until it closes. */
function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Space', action: 'Start / pause the timer' },
  { keys: 'R', action: 'Reset the current session' },
  { keys: 'S', action: 'Skip to the next session' },
  { keys: 'F', action: 'Toggle Focus Mode' },
  { keys: 'Esc', action: 'Exit Focus Mode or close a dialog' },
];

/** Global shortcuts; ignored while typing or holding a modifier. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (belongsToFocusedControl(event.target)) return;
      if (event.key !== 'Escape' && dialogOpen()) return;

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          handlers.onToggle();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          handlers.onReset();
          break;
        case 's':
        case 'S':
          event.preventDefault();
          handlers.onSkip();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          handlers.onToggleFocusMode();
          break;
        case 'Escape':
          handlers.onEscape();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);
}
