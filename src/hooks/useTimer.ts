import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ActiveTimer, Phase } from '../types/study';
import type { FinishedRun } from '../lib/session';
import { loadActiveTimer, removeKey, writeJson, TIMER_KEY } from '../lib/storage';

export interface TimerConfig {
  phase: Phase;
  subjectId: string | null;
  goal: string;
  durationSeconds: number;
}

/**
 * A run that ended more than this long ago (laptop slept, tab closed for
 * hours) is not credited as a completed session.
 */
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

const TICK_MS = 250;

/**
 * Called when a run reaches its end. Returning a config starts that run
 * immediately (used for auto-start breaks/focus); returning null stops.
 */
export type FinishHandler = (
  run: FinishedRun,
  meta: { stale: boolean },
) => TimerConfig | null;

export interface UseTimerResult {
  active: ActiveTimer | null;
  /** Whole seconds left on the clock. */
  remaining: number;
  /** 0..1 of the run elapsed. */
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  start: (config: TimerConfig) => void;
  pause: () => void;
  resume: () => void;
  /** Ends the run now and hands back what was done, without logging it. */
  stop: () => FinishedRun | null;
}

function remainingSeconds(timer: ActiveTimer, now: number): number {
  if (!timer.running) return Math.max(0, timer.pausedRemaining ?? 0);
  return Math.max(0, (timer.endsAt - now) / 1000);
}

/**
 * Timestamp-driven timer. The source of truth is `endsAt`, so throttled
 * intervals, background tabs, sleep and refreshes cannot drift the clock.
 */
export function useTimer(onFinish: FinishHandler): UseTimerResult {
  const [active, setActive] = useState<ActiveTimer | null>(() => loadActiveTimer());
  const [now, setNow] = useState<number>(() => Date.now());

  /** Mirror of `active` so the imperative controls can act synchronously. */
  const activeRef = useRef<ActiveTimer | null>(active);
  const finishRef = useRef<FinishHandler>(onFinish);
  const handledRef = useRef<string | null>(null);

  // Layout effects run before the passive completion effect, so the handler
  // is always current by the time a run can finish.
  useLayoutEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  const apply = useCallback((next: ActiveTimer | null): void => {
    activeRef.current = next;
    setActive(next);
  }, []);

  // Persist every change so a refresh resumes the exact same run.
  useEffect(() => {
    if (active) writeJson(TIMER_KEY, active);
    else removeKey(TIMER_KEY);
  }, [active]);

  // Tick only while a run is actually counting down.
  const running = Boolean(active?.running);
  const endsAt = active?.endsAt ?? 0;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [running, endsAt]);

  // Re-sync the moment the tab becomes visible again.
  useEffect(() => {
    const sync = (): void => setNow(Date.now());
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  const start = useCallback(
    (config: TimerConfig) => {
      const startedAt = Date.now();
      const duration = Math.max(1, Math.round(config.durationSeconds));
      handledRef.current = null;
      setNow(startedAt);
      apply({
        phase: config.phase,
        subjectId: config.subjectId,
        goal: config.goal,
        durationSeconds: duration,
        endsAt: startedAt + duration * 1000,
        pausedRemaining: null,
        running: true,
        startedAt,
        pauses: 0,
      });
    },
    [apply],
  );

  const pause = useCallback(() => {
    const current = activeRef.current;
    if (!current || !current.running) return;
    apply({
      ...current,
      running: false,
      pausedRemaining: remainingSeconds(current, Date.now()),
      pauses: current.pauses + 1,
    });
  }, [apply]);

  const resume = useCallback(() => {
    const current = activeRef.current;
    if (!current || current.running) return;
    const left = Math.max(0, current.pausedRemaining ?? 0);
    handledRef.current = null;
    const resumedAt = Date.now();
    setNow(resumedAt);
    apply({
      ...current,
      running: true,
      endsAt: resumedAt + left * 1000,
      pausedRemaining: null,
    });
  }, [apply]);

  const stop = useCallback((): FinishedRun | null => {
    const current = activeRef.current;
    if (!current) return null;
    const left = remainingSeconds(current, Date.now());
    handledRef.current = `${current.startedAt}:${current.endsAt}`;
    apply(null);
    return {
      timer: current,
      endedAt: Date.now(),
      focusedSeconds: Math.max(0, current.durationSeconds - left),
    };
  }, [apply]);

  // Fire completion exactly once per run.
  useEffect(() => {
    if (!active || !active.running) return;
    if (now < active.endsAt) return;

    const key = `${active.startedAt}:${active.endsAt}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    const stale = Date.now() - active.endsAt > STALE_AFTER_MS;
    const run: FinishedRun = {
      timer: active,
      endedAt: active.endsAt,
      focusedSeconds: active.durationSeconds,
    };
    apply(null);
    const next = finishRef.current(run, { stale });
    if (next) start(next);
  }, [active, now, apply, start]);

  const remaining = active ? remainingSeconds(active, now) : 0;
  const progress = active
    ? Math.min(1, Math.max(0, 1 - remaining / Math.max(1, active.durationSeconds)))
    : 0;

  return {
    active,
    remaining: Math.ceil(remaining),
    progress,
    isRunning: running,
    isPaused: Boolean(active && !active.running),
    start,
    pause,
    resume,
    stop,
  };
}
