// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinishedRun } from '../../lib/session';
import { TIMER_KEY } from '../../lib/storage';
import { useTimer, type TimerConfig } from '../useTimer';

const FOCUS: TimerConfig = {
  phase: 'focus',
  subjectId: 'sub_pay',
  goal: 'ISO 20022',
  durationSeconds: 1500,
};

/** Fixed wall-clock start so every assertion is arithmetic, not timing. */
const START = new Date('2026-04-15T14:00:00.000Z');

type Finished = { run: FinishedRun; stale: boolean };

/** Renders the hook with a spy that records every completion. */
function setup(onFinish?: (entry: Finished) => TimerConfig | null) {
  const finished: Finished[] = [];
  const view = renderHook(() =>
    useTimer((run, meta) => {
      const entry = { run, stale: meta.stale };
      finished.push(entry);
      return onFinish ? onFinish(entry) : null;
    }),
  );
  return { ...view, finished };
}

/** Advance both the clock and any pending intervals. */
function tick(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('starting a run', () => {
  it('is idle until something is started', () => {
    const { result } = setup();
    expect(result.current.active).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.remaining).toBe(0);
    expect(result.current.progress).toBe(0);
  });

  it('starts with the full duration on the clock', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));

    expect(result.current.isRunning).toBe(true);
    expect(result.current.remaining).toBe(1500);
    expect(result.current.progress).toBe(0);
    expect(result.current.active?.phase).toBe('focus');
    expect(result.current.active?.goal).toBe('ISO 20022');
  });

  it('derives the end time from the clock, not from a counter', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    expect(result.current.active?.endsAt).toBe(START.getTime() + 1500 * 1000);
  });

  it('counts down as time passes', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));

    tick(60_000);
    expect(result.current.remaining).toBe(1440);
    expect(result.current.progress).toBeCloseTo(60 / 1500, 3);

    tick(540_000);
    expect(result.current.remaining).toBe(900);
  });

  it('starting again replaces the previous run', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    tick(60_000);
    act(() => result.current.start({ ...FOCUS, durationSeconds: 300, phase: 'shortBreak' }));

    expect(result.current.active?.phase).toBe('shortBreak');
    expect(result.current.remaining).toBe(300);
  });
});

describe('pausing and resuming', () => {
  it('freezes the clock while paused', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    tick(300_000);
    act(() => result.current.pause());

    expect(result.current.isPaused).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.remaining).toBe(1200);

    // Ten minutes of being paused must not consume the session.
    tick(600_000);
    expect(result.current.remaining).toBe(1200);
  });

  it('counts the pause', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    act(() => result.current.pause());
    act(() => result.current.resume());
    act(() => result.current.pause());

    expect(result.current.active?.pauses).toBe(2);
  });

  it('pushes the end time out by however long you were away', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    tick(300_000);
    act(() => result.current.pause());
    tick(600_000);
    act(() => result.current.resume());

    expect(result.current.isRunning).toBe(true);
    expect(result.current.remaining).toBe(1200);
    expect(result.current.active?.endsAt).toBe(Date.now() + 1200 * 1000);
  });

  it('ignores a pause when nothing is running', () => {
    const { result } = setup();
    act(() => result.current.pause());
    expect(result.current.active).toBeNull();
  });

  it('ignores a resume when already running', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    const endsAt = result.current.active?.endsAt;
    act(() => result.current.resume());
    expect(result.current.active?.endsAt).toBe(endsAt);
  });
});

describe('completion', () => {
  it('fires once when the clock runs out', () => {
    const { result, finished } = setup();
    act(() => result.current.start(FOCUS));

    tick(1_499_000);
    expect(finished).toHaveLength(0);

    tick(2_000);
    expect(finished).toHaveLength(1);
    expect(finished[0]?.stale).toBe(false);
    expect(result.current.active).toBeNull();
  });

  it('does not fire again once the run is over', () => {
    const { result, finished } = setup();
    act(() => result.current.start(FOCUS));
    tick(1_600_000);
    tick(600_000);
    expect(finished).toHaveLength(1);
  });

  it('credits the full planned duration, not the wall-clock gap', () => {
    const { result, finished } = setup();
    act(() => result.current.start(FOCUS));
    act(() => result.current.pause());
    tick(3_600_000); // an hour paused
    act(() => result.current.resume());
    tick(1_600_000);

    expect(finished[0]?.run.focusedSeconds).toBe(1500);
    expect(finished[0]?.run.endedAt).toBe(finished[0]?.run.timer.endsAt);
  });

  it('starts the next run when the handler asks for one', () => {
    const next: TimerConfig = { ...FOCUS, phase: 'shortBreak', durationSeconds: 300 };
    const { result, finished } = setup(() => next);
    act(() => result.current.start(FOCUS));
    tick(1_600_000);

    expect(finished).toHaveLength(1);
    expect(result.current.active?.phase).toBe('shortBreak');
    expect(result.current.remaining).toBe(300);
  });

  it('stays idle when the handler returns nothing', () => {
    const { result } = setup(() => null);
    act(() => result.current.start(FOCUS));
    tick(1_600_000);
    expect(result.current.active).toBeNull();
  });
});

describe('stopping early', () => {
  it('reports how much was actually done', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    tick(420_000); // seven minutes in

    const captured: { run: FinishedRun | null } = { run: null };
    act(() => {
      captured.run = result.current.stop();
    });

    expect(captured.run).not.toBeNull();
    expect(captured.run?.focusedSeconds).toBe(420);
    expect(result.current.active).toBeNull();
  });

  it('does not count paused time as focused', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    tick(120_000);
    act(() => result.current.pause());
    tick(900_000);

    const captured: { run: FinishedRun | null } = { run: null };
    act(() => {
      captured.run = result.current.stop();
    });

    expect(captured.run?.focusedSeconds).toBe(120);
  });

  it('never fires completion for a run that was stopped', () => {
    const { result, finished } = setup();
    act(() => result.current.start(FOCUS));
    act(() => {
      result.current.stop();
    });
    tick(2_000_000);
    expect(finished).toHaveLength(0);
  });

  it('returns null when there is nothing to stop', () => {
    const { result } = setup();
    const captured: { run: FinishedRun | null } = { run: null };
    act(() => {
      captured.run = result.current.stop();
    });
    expect(captured.run).toBeNull();
  });
});

describe('surviving a refresh', () => {
  it('writes the run to storage and clears it when the run ends', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));
    expect(window.localStorage.getItem(TIMER_KEY)).not.toBeNull();

    act(() => {
      result.current.stop();
    });
    expect(window.localStorage.getItem(TIMER_KEY)).toBeNull();
  });

  it('picks a running timer back up mid-session', () => {
    const first = setup();
    act(() => first.result.current.start(FOCUS));
    tick(300_000);
    first.unmount();

    // A fresh mount, as after a page reload.
    const second = setup();
    expect(second.result.current.isRunning).toBe(true);
    expect(second.result.current.remaining).toBe(1200);
    expect(second.result.current.active?.goal).toBe('ISO 20022');
  });

  it('picks a paused timer back up', () => {
    const first = setup();
    act(() => first.result.current.start(FOCUS));
    tick(300_000);
    act(() => first.result.current.pause());
    first.unmount();

    const second = setup();
    expect(second.result.current.isPaused).toBe(true);
    expect(second.result.current.remaining).toBe(1200);
  });

  it('credits a session that finished while the tab was closed', () => {
    const first = setup();
    act(() => first.result.current.start(FOCUS));
    first.unmount();

    // Come back five minutes after it would have ended.
    vi.setSystemTime(START.getTime() + (1500 + 300) * 1000);
    const second = setup();

    expect(second.finished).toHaveLength(1);
    expect(second.finished[0]?.stale).toBe(false);
    expect(second.finished[0]?.run.focusedSeconds).toBe(1500);
    expect(second.result.current.active).toBeNull();
  });

  it('marks a run that ended hours ago as stale instead of crediting it', () => {
    const first = setup();
    act(() => first.result.current.start(FOCUS));
    first.unmount();

    vi.setSystemTime(START.getTime() + 5 * 60 * 60 * 1000);
    const second = setup();

    expect(second.finished).toHaveLength(1);
    expect(second.finished[0]?.stale).toBe(true);
  });

  it('credits an expired stored run exactly once under StrictMode', () => {
    // StrictMode mounts, tears down and remounts effects. Without the
    // fire-once guard the session would be scored twice — double XP, double
    // streak credit — on every reload that lands after the timer ended.
    const first = setup();
    act(() => first.result.current.start(FOCUS));
    first.unmount();

    vi.setSystemTime(START.getTime() + (1500 + 120) * 1000);

    const finished: Finished[] = [];
    renderHook(
      () =>
        useTimer((run, meta) => {
          finished.push({ run, stale: meta.stale });
          return null;
        }),
      { wrapper: StrictMode },
    );

    expect(finished).toHaveLength(1);
  });

  it('ignores a corrupted stored timer rather than throwing', () => {
    window.localStorage.setItem(TIMER_KEY, '{"phase":"focus","running":true}');
    const { result } = setup();
    expect(result.current.active).toBeNull();
  });

  it('ignores stored rubbish that is not even JSON', () => {
    window.localStorage.setItem(TIMER_KEY, 'not json');
    const { result } = setup();
    expect(result.current.active).toBeNull();
  });
});

describe('background tabs', () => {
  it('reports the right time after the tab was throttled', () => {
    const { result } = setup();
    act(() => result.current.start(FOCUS));

    // Simulate a throttled tab: the clock moves but no interval fires.
    act(() => {
      vi.setSystemTime(START.getTime() + 600_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.remaining).toBe(900);
  });

  it('completes a run that elapsed entirely while hidden', () => {
    const { result, finished } = setup();
    act(() => result.current.start(FOCUS));

    act(() => {
      vi.setSystemTime(START.getTime() + 1_600_000);
      window.dispatchEvent(new Event('focus'));
    });

    expect(finished).toHaveLength(1);
    expect(result.current.active).toBeNull();
  });
});
