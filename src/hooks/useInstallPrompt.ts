import { useCallback, useEffect, useState } from 'react';
import { isIos, isStandalone } from '../lib/pwa';

/** The non-standard Chromium event that lets us trigger the install UI. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** A browser install prompt is available right now. */
  canInstall: boolean;
  /** Already running from the home screen. */
  installed: boolean;
  /** iOS: no prompt API, show the Share-sheet instructions instead. */
  needsManualSteps: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (event: Event): void => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      return outcome;
    } catch {
      return 'unavailable';
    }
  }, [deferred]);

  return {
    canInstall: deferred !== null && !installed,
    installed,
    needsManualSteps: !installed && deferred === null && isIos(),
    install,
  };
}
