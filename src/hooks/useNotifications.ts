import { useCallback, useEffect, useState } from 'react';

export type NotificationSupport = 'unsupported' | 'default' | 'granted' | 'denied';

export interface UseNotificationsResult {
  support: NotificationSupport;
  canNotify: boolean;
  request: () => Promise<NotificationSupport>;
  notify: (title: string, body: string) => void;
}

function currentSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationSupport;
}

/**
 * Browser notifications, degrading quietly: if the API is missing or the user
 * has blocked it, the app simply relies on sound and the in-page overlay.
 */
export function useNotifications(enabled: boolean): UseNotificationsResult {
  const [support, setSupport] = useState<NotificationSupport>(() => currentSupport());

  // The user can change the site permission in the browser UI at any time;
  // re-read it whenever the tab comes back into focus.
  useEffect(() => {
    const sync = (): void => {
      const next = currentSupport();
      setSupport((current) => (current === next ? current : next));
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const request = useCallback(async (): Promise<NotificationSupport> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setSupport('unsupported');
      return 'unsupported';
    }
    try {
      const result = (await Notification.requestPermission()) as NotificationSupport;
      setSupport(result);
      return result;
    } catch {
      const fallback = currentSupport();
      setSupport(fallback);
      return fallback;
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      if (!enabled) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      try {
        const notification = new Notification(title, {
          body,
          tag: 'studyquest-session',
          icon: undefined,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Some browsers throw when notifications are constructed outside a
        // service worker; the overlay already covers this case.
      }
    },
    [enabled],
  );

  return {
    support,
    canNotify: enabled && support === 'granted',
    request,
    notify,
  };
}
