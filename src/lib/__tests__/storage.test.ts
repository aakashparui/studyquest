import { describe, expect, it } from 'vitest';
import {
  buildExport,
  createDefaultState,
  DEFAULT_TIMER,
  parseActiveTimer,
  parseImport,
  parseState,
  trimSessions,
} from '../storage';
import { makeSession, makeState } from './helpers';
import { localDay } from './helpers';

describe('parseState — rubbish in, usable state out', () => {
  it('falls back to defaults for anything that is not an object', () => {
    for (const input of [null, undefined, 42, 'nope', [], true]) {
      const state = parseState(input);
      expect(state.subjects.length).toBeGreaterThan(0);
      expect(state.xp).toBe(0);
      expect(state.sessions).toEqual([]);
    }
  });

  it('keeps a well-formed save intact', () => {
    const original = makeState({ xp: 4321, combo: 3, bestCombo: 9, dailyGoalPomodoros: 8 });
    const parsed = parseState(JSON.parse(JSON.stringify(original)));
    expect(parsed.xp).toBe(4321);
    expect(parsed.combo).toBe(3);
    expect(parsed.bestCombo).toBe(9);
    expect(parsed.dailyGoalPomodoros).toBe(8);
    expect(parsed.subjects).toHaveLength(original.subjects.length);
  });

  it('survives a save truncated halfway through', () => {
    const state = parseState({ xp: 900, subjects: undefined, sessions: null });
    expect(state.xp).toBe(900);
    expect(state.subjects.length).toBeGreaterThan(0);
    expect(state.sessions).toEqual([]);
  });

  it('clamps numbers that are out of range or not numbers at all', () => {
    const state = parseState({
      xp: -5,
      dailyGoalPomodoros: 9999,
      combo: 'lots',
      timer: { focusMinutes: 0, shortBreakMinutes: 1e9, sessionsBeforeLongBreak: -3 },
    });
    expect(state.xp).toBe(0);
    expect(state.dailyGoalPomodoros).toBeLessThanOrEqual(24);
    expect(state.combo).toBe(0);
    expect(state.timer.focusMinutes).toBeGreaterThanOrEqual(1);
    expect(state.timer.shortBreakMinutes).toBeLessThanOrEqual(60);
    expect(state.timer.sessionsBeforeLongBreak).toBeGreaterThanOrEqual(1);
  });

  it('drops broken sessions and keeps the good ones', () => {
    const good = makeSession(localDay(2026, 4, 15, 14));
    const state = parseState({
      sessions: [good, { nonsense: true }, null, 'session', { endedAt: 'not-a-date' }],
    });
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.id).toBe(good.id);
  });

  it('drops subjects with no name', () => {
    const state = parseState({
      subjects: [
        { id: 'a', name: 'Payments', icon: '📚', color: '#8b5cf6' },
        { id: 'b', name: '   ' },
        { id: 'c' },
      ],
    });
    expect(state.sessions).toEqual([]);
    expect(state.subjects).toHaveLength(1);
    expect(state.subjects[0]?.name).toBe('Payments');
  });

  it('repairs a subject with a nonsense colour', () => {
    const state = parseState({
      subjects: [{ id: 'a', name: 'Payments', icon: '📚', color: 'javascript:alert(1)' }],
    });
    expect(state.subjects[0]?.color).toMatch(/^#[0-9a-f]{3,8}$/i);
  });

  it('keeps sessions in chronological order', () => {
    const later = makeSession(localDay(2026, 4, 15, 18));
    const earlier = makeSession(localDay(2026, 4, 15, 9));
    const state = parseState({ sessions: [later, earlier] });
    expect(state.sessions[0]?.endedAt).toBe(earlier.endedAt);
  });

  it('forgets a last-used subject that no longer exists', () => {
    const state = parseState({
      subjects: [{ id: 'a', name: 'Payments', icon: '📚', color: '#8b5cf6' }],
      lastSubjectId: 'deleted-subject',
    });
    expect(state.lastSubjectId).toBeNull();
  });

  it('falls back to defaults for unknown preference values', () => {
    const state = parseState({
      prefs: { theme: 'neon', animation: 'wild', ambient: 'bagpipes', ambientVolume: 42 },
    });
    expect(state.prefs.theme).toBe('dark');
    expect(state.prefs.animation).toBe('full');
    expect(state.prefs.ambient).toBe('silent');
    expect(state.prefs.ambientVolume).toBeLessThanOrEqual(1);
  });

  it('always reports the current schema version', () => {
    expect(parseState({ version: 99 }).version).toBe(createDefaultState().version);
  });
});

describe('parseActiveTimer', () => {
  const base = {
    phase: 'focus',
    subjectId: 'sub_pay',
    goal: '',
    durationSeconds: 1500,
    endsAt: Date.now() + 100_000,
    pausedRemaining: null,
    running: true,
    startedAt: Date.now(),
    pauses: 0,
  };

  it('accepts a valid running timer', () => {
    const timer = parseActiveTimer(base);
    expect(timer?.running).toBe(true);
    expect(timer?.durationSeconds).toBe(1500);
  });

  it('accepts a valid paused timer', () => {
    const timer = parseActiveTimer({ ...base, running: false, pausedRemaining: 600 });
    expect(timer?.running).toBe(false);
    expect(timer?.pausedRemaining).toBe(600);
  });

  it('rejects a running timer with no end time', () => {
    expect(parseActiveTimer({ ...base, endsAt: 0 })).toBeNull();
  });

  it('rejects a paused timer with no remaining time', () => {
    expect(parseActiveTimer({ ...base, running: false, pausedRemaining: null })).toBeNull();
  });

  it('rejects rubbish', () => {
    for (const input of [null, undefined, 'timer', 7, {}]) {
      expect(parseActiveTimer(input)).toBeNull();
    }
  });

  it('never reports more remaining time than the session was long', () => {
    const timer = parseActiveTimer({
      ...base,
      running: false,
      pausedRemaining: 999_999,
    });
    expect(timer?.pausedRemaining).toBeLessThanOrEqual(1500);
  });
});

describe('export and import', () => {
  it('round-trips a save', () => {
    const state = makeState({ xp: 2750, sessions: [makeSession(localDay(2026, 4, 15, 14))] });
    const restored = parseImport(JSON.stringify(buildExport(state)));
    expect(restored.xp).toBe(2750);
    expect(restored.sessions).toHaveLength(1);
  });

  it('accepts a bare state as well as a wrapped export', () => {
    const state = makeState({ xp: 1200 });
    expect(parseImport(JSON.stringify(state)).xp).toBe(1200);
  });

  it('throws on text that is not JSON, so the UI can report it', () => {
    expect(() => parseImport('not json at all')).toThrow();
  });

  it('repairs a damaged import rather than refusing it', () => {
    const restored = parseImport('{"xp": 500, "sessions": "gone"}');
    expect(restored.xp).toBe(500);
    expect(restored.sessions).toEqual([]);
  });

  it('stamps the export with the app name and a timestamp', () => {
    const envelope = buildExport(makeState());
    expect(envelope.app).toBe('studyquest');
    expect(Number.isNaN(Date.parse(envelope.exportedAt))).toBe(false);
  });
});

describe('trimSessions', () => {
  it('leaves a normal history alone', () => {
    const sessions = Array.from({ length: 10 }, () => makeSession(localDay(2026, 4, 15, 14)));
    expect(trimSessions(sessions)).toHaveLength(10);
  });

  it('caps a runaway history, keeping the most recent', () => {
    const sessions = Array.from({ length: 2500 }, (_, i) =>
      makeSession(localDay(2026, 4, 15, 14), { id: `ses_${i}` }),
    );
    const trimmed = trimSessions(sessions);
    expect(trimmed.length).toBeLessThan(sessions.length);
    expect(trimmed[trimmed.length - 1]?.id).toBe('ses_2499');
  });
});

describe('defaults', () => {
  it('ships the classic pomodoro timings', () => {
    expect(DEFAULT_TIMER.focusMinutes).toBe(25);
    expect(DEFAULT_TIMER.shortBreakMinutes).toBe(5);
    expect(DEFAULT_TIMER.longBreakMinutes).toBe(15);
    expect(DEFAULT_TIMER.sessionsBeforeLongBreak).toBe(4);
  });

  it('starts a new user with subjects and no history', () => {
    const state = createDefaultState();
    expect(state.subjects.length).toBeGreaterThan(0);
    expect(state.sessions).toEqual([]);
    expect(state.achievements).toEqual([]);
    expect(state.xp).toBe(0);
  });

  it('gives every default subject a distinct id', () => {
    const ids = createDefaultState().subjects.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
