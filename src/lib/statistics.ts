import type { SessionRecord, StudyState, Subject } from '../types/study';
import { addDays, dayKey, startOfMonth, startOfWeek, weekdayLabel } from './date';
import { buildHeatmap, currentStreak, longestStreak, streakAtRisk, type HeatCell } from './streak';

export interface DayBucket {
  pomodoros: number;
  seconds: number;
  xp: number;
}

export interface SubjectTotals {
  subject: Subject | null;
  subjectId: string | null;
  name: string;
  icon: string;
  color: string;
  seconds: number;
  sessions: number;
  xp: number;
}

export interface SeriesPoint {
  label: string;
  value: number;
  key: string;
  highlight?: boolean;
}

export interface StudyStats {
  /** Completed focus sessions only, newest first. */
  focusSessions: SessionRecord[];
  byDay: Map<string, DayBucket>;
  activeDays: Set<string>;

  totalFocusSeconds: number;
  totalPomodoros: number;
  averageSessionSeconds: number;

  todayPomodoros: number;
  todaySeconds: number;
  weekPomodoros: number;
  weekSeconds: number;
  monthPomodoros: number;
  monthSeconds: number;

  streak: number;
  longest: number;
  atRisk: boolean;

  subjectTotals: SubjectTotals[];
  topSubject: SubjectTotals | null;

  /** Last 7 days (Mon-first week containing today), focus minutes. */
  weekSeries: SeriesPoint[];
  /** Focus minutes per weekday across all history. */
  weekdaySeries: SeriesPoint[];
  /** Focus minutes per 3-hour block of the day. */
  hourSeries: SeriesPoint[];
  bestWeekday: string | null;
  bestHourLabel: string | null;

  heatmap: HeatCell[][];
  goalProgress: number;
  goalReached: boolean;
}

const EMPTY_BUCKET: DayBucket = { pomodoros: 0, seconds: 0, xp: 0 };

function bucketFor(map: Map<string, DayBucket>, key: string): DayBucket {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { ...EMPTY_BUCKET };
    map.set(key, bucket);
  }
  return bucket;
}

const HOUR_BLOCKS: { label: string; from: number; to: number }[] = [
  { label: '12–3a', from: 0, to: 3 },
  { label: '3–6a', from: 3, to: 6 },
  { label: '6–9a', from: 6, to: 9 },
  { label: '9–12p', from: 9, to: 12 },
  { label: '12–3p', from: 12, to: 15 },
  { label: '3–6p', from: 15, to: 18 },
  { label: '6–9p', from: 18, to: 21 },
  { label: '9–12a', from: 21, to: 24 },
];

export function computeStats(state: StudyState, todayKey: string = dayKey()): StudyStats {
  const focusSessions = state.sessions
    .filter((s) => s.phase === 'focus' && s.completed)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));

  const byDay = new Map<string, DayBucket>();
  const bySubject = new Map<string, SubjectTotals>();
  const weekdayTotals = new Array<number>(7).fill(0);
  const blockTotals = new Array<number>(HOUR_BLOCKS.length).fill(0);

  let totalFocusSeconds = 0;

  for (const session of focusSessions) {
    const ended = new Date(session.endedAt);
    const key = dayKey(ended);
    const bucket = bucketFor(byDay, key);
    bucket.pomodoros += 1;
    bucket.seconds += session.focusedSeconds;
    bucket.xp += session.xpEarned;
    totalFocusSeconds += session.focusedSeconds;

    const subjectKey = session.subjectId ?? '__none__';
    let totals = bySubject.get(subjectKey);
    if (!totals) {
      totals = {
        subject: state.subjects.find((s) => s.id === session.subjectId) ?? null,
        subjectId: session.subjectId,
        name: session.subjectName || 'Unassigned',
        icon: session.subjectIcon || '📘',
        color: session.subjectColor || '#8b5cf6',
        seconds: 0,
        sessions: 0,
        xp: 0,
      };
      bySubject.set(subjectKey, totals);
    }
    totals.seconds += session.focusedSeconds;
    totals.sessions += 1;
    totals.xp += session.xpEarned;

    const weekdayIndex = (ended.getDay() + 6) % 7;
    weekdayTotals[weekdayIndex] = (weekdayTotals[weekdayIndex] ?? 0) + session.focusedSeconds;

    const startedHour = new Date(session.startedAt).getHours();
    const blockIndex = HOUR_BLOCKS.findIndex((b) => startedHour >= b.from && startedHour < b.to);
    if (blockIndex >= 0) {
      blockTotals[blockIndex] = (blockTotals[blockIndex] ?? 0) + session.focusedSeconds;
    }
  }

  const activeDays = new Set(byDay.keys());
  const today = byDay.get(todayKey) ?? EMPTY_BUCKET;

  const weekStartKey = dayKey(startOfWeek());
  const monthStartKey = dayKey(startOfMonth(new Date()));
  let weekPomodoros = 0;
  let weekSeconds = 0;
  let monthPomodoros = 0;
  let monthSeconds = 0;
  for (const [key, bucket] of byDay) {
    if (key >= weekStartKey) {
      weekPomodoros += bucket.pomodoros;
      weekSeconds += bucket.seconds;
    }
    if (key >= monthStartKey) {
      monthPomodoros += bucket.pomodoros;
      monthSeconds += bucket.seconds;
    }
  }

  const weekStart = startOfWeek();
  const weekSeries: SeriesPoint[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKey(date);
    return {
      key,
      label: weekdayLabel(date),
      value: Math.round((byDay.get(key)?.seconds ?? 0) / 60),
      highlight: key === todayKey,
    };
  });

  const weekdaySeries: SeriesPoint[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
    (label, i) => ({ key: label, label, value: Math.round((weekdayTotals[i] ?? 0) / 60) }),
  );

  const hourSeries: SeriesPoint[] = HOUR_BLOCKS.map((block, i) => ({
    key: block.label,
    label: block.label,
    value: Math.round((blockTotals[i] ?? 0) / 60),
  }));

  const bestWeekdayIdx = weekdayTotals.reduce(
    (best, value, i) => (value > (weekdayTotals[best] ?? 0) ? i : best),
    0,
  );
  const bestBlockIdx = blockTotals.reduce(
    (best, value, i) => (value > (blockTotals[best] ?? 0) ? i : best),
    0,
  );

  const subjectTotals = [...bySubject.values()].sort((a, b) => b.seconds - a.seconds);

  const goalTarget = Math.max(1, state.dailyGoalPomodoros);

  return {
    focusSessions,
    byDay,
    activeDays,
    totalFocusSeconds,
    totalPomodoros: focusSessions.length,
    averageSessionSeconds: focusSessions.length
      ? Math.round(totalFocusSeconds / focusSessions.length)
      : 0,
    todayPomodoros: today.pomodoros,
    todaySeconds: today.seconds,
    weekPomodoros,
    weekSeconds,
    monthPomodoros,
    monthSeconds,
    streak: currentStreak(activeDays),
    longest: longestStreak(activeDays),
    atRisk: streakAtRisk(activeDays),
    subjectTotals,
    topSubject: subjectTotals[0] ?? null,
    weekSeries,
    weekdaySeries,
    hourSeries,
    bestWeekday: totalFocusSeconds > 0 ? (weekdaySeries[bestWeekdayIdx]?.label ?? null) : null,
    bestHourLabel: totalFocusSeconds > 0 ? (HOUR_BLOCKS[bestBlockIdx]?.label ?? null) : null,
    heatmap: buildHeatmap(byDay),
    goalProgress: Math.min(1, today.pomodoros / goalTarget),
    goalReached: today.pomodoros >= goalTarget,
  };
}

/** Groups history (all phases) by day key, newest day first. */
export function groupSessionsByDay(sessions: SessionRecord[]): [string, SessionRecord[]][] {
  const map = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const key = dayKey(new Date(session.endedAt));
    const list = map.get(key);
    if (list) list.push(session);
    else map.set(key, [session]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
