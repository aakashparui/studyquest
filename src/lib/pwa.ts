/**
 * Service worker lifecycle. Registered only in production builds: in dev the
 * worker would sit in front of Vite's module graph and serve stale code, so
 * any worker left over from a previous production visit is removed instead.
 */
export function setupServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((registration) => void registration.unregister()))
      .catch(() => {
        // Nothing to clean up.
      });
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // An unavailable worker only costs offline support; the app still runs.
    });
  });
}

/** True when the app is running from the home screen rather than a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

/** iOS has no install prompt API — those users need the Share-sheet steps. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOs;
}
