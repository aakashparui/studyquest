import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type {
  CompletionSummary,
  Phase,
  Preferences,
  StudyState,
  Subject,
  TimerSettings,
  Toast,
} from '../types/study';
import { ACHIEVEMENTS_BY_ID } from '../lib/achievements';
import { createId } from '../lib/id';
import { mascotMessage, type MascotMood } from '../lib/mascot';
import {
  abandonRun,
  completeBreakRun,
  completeFocusRun,
  durationForPhase,
  nextPhaseAfterFocus,
  PHASE_LABEL,
} from '../lib/session';
import { sound } from '../lib/sound';
import {
  STATE_KEY,
  buildExport,
  createDefaultState,
  isStorageAvailable,
  loadActiveTimer,
  loadState,
  parseImport,
  removeKey,
  TIMER_KEY,
  writeJson,
} from '../lib/storage';
import { levelFromXp } from '../lib/xpSystem';
import { useNotifications } from '../hooks/useNotifications';
import { useStudyStats } from '../hooks/useStudyStats';
import { useTimer, type FinishHandler } from '../hooks/useTimer';
import { StudyContext, type StudyContextValue } from './StudyContext';

const PERSIST_DEBOUNCE_MS = 250;
const TOAST_MS = 5200;
const RECOVERY_TOAST_ID = 'toast_recovery';

function applyDocumentPrefs(prefs: Preferences): void {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.anim = prefs.animation;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', prefs.theme === 'light' ? '#f4f5fb' : '#080a14');
}

export function StudyProvider({ children }: { children: ReactNode }): ReactElement {
  const [initial] = useState(() => loadState());

  const [state, setStateRaw] = useState<StudyState>(initial.state);
  const stateRef = useRef<StudyState>(initial.state);

  const update = useCallback((fn: (current: StudyState) => StudyState): StudyState => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setStateRaw(next);
    return next;
  }, []);

  const [storageAvailable] = useState(() => isStorageAvailable());
  const [phase, setPhase] = useState<Phase>('focus');
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    initial.state.lastSubjectId ?? initial.state.subjects[0]?.id ?? null,
  );
  const [goal, setGoal] = useState<string>(initial.state.lastGoal);
  // A refresh in the middle of a focus run drops straight back into Focus Mode.
  const [focusMode, setFocusMode] = useState(() => {
    const persisted = loadActiveTimer();
    return persisted !== null && persisted.phase === 'focus' && persisted.running;
  });
  const [completion, setCompletion] = useState<CompletionSummary | null>(null);
  const [toasts, setToasts] = useState<Toast[]>(() =>
    initial.recovered
      ? [
          {
            id: RECOVERY_TOAST_ID,
            kind: 'info',
            icon: '🛟',
            title: 'Saved data repaired',
            description: 'Part of your save file was unreadable, so defaults were filled in.',
          },
        ]
      : [],
  );
  const [confettiKey, setConfettiKey] = useState(0);
  const [mascot, setMascot] = useState<{ mood: MascotMood; message: string }>(() => ({
    mood: 'idle',
    message: mascotMessage('idle'),
  }));

  const recentMessages = useRef<string[]>([]);
  const milestoneRef = useRef<{ key: number; step: number }>({ key: 0, step: 0 });

  const stats = useStudyStats(state);
  const level = useMemo(() => levelFromXp(state.xp), [state.xp]);
  const notifications = useNotifications(state.prefs.notifications);

  /* ----------------------------------------------------------- mascot */

  const say = useCallback((mood: MascotMood) => {
    const message = mascotMessage(mood, recentMessages.current);
    recentMessages.current = [message, ...recentMessages.current].slice(0, 6);
    setMascot({ mood, message });
  }, []);

  /* ------------------------------------------------------------ toasts */

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const entry: Toast = { ...toast, id: createId('toast') };
    setToasts((current) => [...current.slice(-3), entry]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== entry.id));
    }, TOAST_MS);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const celebrate = useCallback(() => setConfettiKey((key) => key + 1), []);

  /* ------------------------------------------------------- persistence */

  useEffect(() => {
    const id = window.setTimeout(() => {
      writeJson(STATE_KEY, state);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  useEffect(() => {
    applyDocumentPrefs(state.prefs);
  }, [state.prefs]);

  useEffect(() => {
    sound.setCuesEnabled(state.prefs.sound);
  }, [state.prefs.sound]);

  useEffect(() => {
    sound.setAmbientVolume(state.prefs.ambientVolume);
  }, [state.prefs.ambientVolume]);

  // The recovery notice is seeded into state above; just age it out.
  useEffect(() => {
    if (!initial.recovered) return;
    const id = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== RECOVERY_TOAST_ID));
    }, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [initial.recovered]);

  /* -------------------------------------------------------- completion */

  const announce = useCallback(
    (summary: CompletionSummary) => {
      if (summary.phase === 'focus') {
        sound.play('complete');
        notifications.notify(
          'Focus session complete',
          `${summary.minutes} min on ${summary.subjectName} · +${summary.totalXp} XP`,
        );
      } else {
        sound.play('breakOver');
        notifications.notify('Break over', 'Time to start the next focus session.');
      }

      if (summary.levelUp) {
        celebrate();
        window.setTimeout(() => sound.play('levelUp'), 420);
        pushToast({
          kind: 'level',
          icon: '🆙',
          title: `Level ${summary.levelUp.to} — ${summary.levelUp.title}`,
          description: 'New rank unlocked.',
        });
      }

      summary.unlocked.forEach((id, index) => {
        const achievement = ACHIEVEMENTS_BY_ID.get(id);
        if (!achievement) return;
        window.setTimeout(
          () => {
            sound.play('achievement');
            pushToast({
              kind: 'achievement',
              icon: achievement.icon,
              title: achievement.title,
              description: achievement.description,
            });
          },
          600 + index * 700,
        );
      });

      if (summary.unlocked.length > 0 && !summary.levelUp) celebrate();
    },
    [celebrate, notifications, pushToast],
  );

  /**
   * Scores the finished run and returns the next run to start, if the user
   * asked for auto-start. Returning null leaves the timer idle.
   */
  const handleFinish = useCallback<FinishHandler>(
    (run, meta) => {
      milestoneRef.current = { key: 0, step: 0 };

      if (meta.stale) {
        update((current) => abandonRun(current, run));
        // Nothing was credited, so re-arm the same phase rather than
        // advancing the cycle.
        setPhase(run.timer.phase);
        setFocusMode(false);
        pushToast({
          kind: 'info',
          icon: '💤',
          title: 'Session expired',
          description: 'That timer ended a long time ago, so it was not counted.',
        });
        return null;
      }

      if (run.timer.phase === 'focus') {
        const result = completeFocusRun(stateRef.current, run);
        stateRef.current = result.state;
        setStateRaw(result.state);
        setCompletion(result.summary);
        setPhase(result.summary.nextPhase);
        setFocusMode(false);
        say('complete');
        announce(result.summary);

        if (!result.state.timer.autoStartBreak) return null;
        return {
          phase: result.summary.nextPhase,
          subjectId: null,
          goal: '',
          durationSeconds: durationForPhase(result.state, result.summary.nextPhase),
        };
      }

      const result = completeBreakRun(stateRef.current, run);
      stateRef.current = result.state;
      setStateRaw(result.state);
      setCompletion(result.summary);
      setPhase('focus');
      say('breakEnd');
      announce(result.summary);

      if (!result.state.timer.autoStartFocus) return null;
      setFocusMode(true);
      return {
        phase: 'focus',
        subjectId: selectedSubjectId,
        goal,
        durationSeconds: (sessionMinutes ?? result.state.timer.focusMinutes) * 60,
      };
    },
    [announce, goal, pushToast, say, selectedSubjectId, sessionMinutes, update],
  );

  const timer = useTimer(handleFinish);
  const {
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    stop: stopTimer,
  } = timer;
  const activeRun = timer.active;

  /* -------------------------------------------------- timer milestones */

  const { active, progress, remaining, isRunning } = timer;

  useEffect(() => {
    if (!active || !isRunning || active.phase !== 'focus') return;
    const step = remaining <= 300 || progress >= 0.85 ? 3 : progress >= 0.5 ? 2 : progress >= 0.25 ? 1 : 0;
    const tracker = milestoneRef.current;
    if (tracker.key !== active.startedAt) {
      milestoneRef.current = { key: active.startedAt, step };
      return;
    }
    if (step <= tracker.step) return;
    milestoneRef.current = { key: active.startedAt, step };
    if (step === 1) say('quarter');
    else if (step === 2) say('half');
    else if (step === 3) say('final');
  }, [active, isRunning, progress, remaining, say]);

  /* -------------------------------------------------------- ambient mix */

  useEffect(() => {
    const wanted = state.prefs.ambient;
    if (wanted === 'silent') sound.stopAmbient();
    else sound.setAmbient(wanted);
  }, [state.prefs.ambient]);

  useEffect(() => () => sound.stopAmbient(), []);

  /* ------------------------------------------------------------ actions */

  const armedMinutes = useMemo(() => {
    if (phase === 'focus') return sessionMinutes ?? state.timer.focusMinutes;
    return Math.round(durationForPhase(state, phase) / 60);
  }, [phase, sessionMinutes, state]);

  const start = useCallback(() => {
    void sound.resume();
    sound.play('start');
    const current = stateRef.current;
    const durationSeconds =
      phase === 'focus'
        ? (sessionMinutes ?? current.timer.focusMinutes) * 60
        : durationForPhase(current, phase);

    startTimer({
      phase,
      subjectId: phase === 'focus' ? selectedSubjectId : null,
      goal: phase === 'focus' ? goal.trim() : '',
      durationSeconds,
    });

    if (phase === 'focus') {
      update((prev) => ({ ...prev, lastSubjectId: selectedSubjectId, lastGoal: goal.trim() }));
      setFocusMode(true);
      say('start');
    } else {
      say('break');
    }
    setCompletion(null);
  }, [goal, phase, say, selectedSubjectId, sessionMinutes, startTimer, update]);

  const toggle = useCallback(() => {
    void sound.resume();
    if (!activeRun) {
      start();
      return;
    }
    if (activeRun.running) {
      pauseTimer();
      sound.play('pause');
      if (activeRun.phase === 'focus') say('paused');
    } else {
      resumeTimer();
      sound.play('start');
    }
  }, [activeRun, pauseTimer, resumeTimer, say, start]);

  /** Stops the current run without crediting it. Returns the phase it was in. */
  const abandonCurrent = useCallback((): Phase | null => {
    const run = stopTimer();
    if (!run) return null;
    update((prev) => abandonRun(prev, run));
    if (run.timer.phase === 'focus' && run.focusedSeconds >= 60) say('abandoned');
    return run.timer.phase;
  }, [say, stopTimer, update]);

  const reset = useCallback(() => {
    sound.play('click');
    const abandoned = abandonCurrent();
    if (abandoned) {
      setPhase(abandoned);
      setFocusMode(false);
    }
    setCompletion(null);
  }, [abandonCurrent]);

  const skip = useCallback(() => {
    sound.play('click');
    setCompletion(null);
    const abandoned = abandonCurrent();
    const from = abandoned ?? phase;
    const next: Phase =
      from === 'focus' ? nextPhaseAfterFocus(stateRef.current, stateRef.current.cycleCount) : 'focus';
    setPhase(next);
    setFocusMode(false);
    if (next === 'focus') say('idle');
    else say('break');
  }, [abandonCurrent, phase, say]);

  const dismissCompletion = useCallback(() => {
    setCompletion(null);
    if (!activeRun) say(stats.todayPomodoros >= 3 ? 'hotStreak' : 'idle');
  }, [activeRun, say, stats.todayPomodoros]);

  const startNext = useCallback(() => {
    setCompletion(null);
    start();
  }, [start]);

  /* ------------------------------------------------------ data actions */

  const addSubject = useCallback(
    (input: { name: string; icon: string; color: string }) => {
      const name = input.name.trim().slice(0, 40);
      if (!name) return;
      const subject: Subject = {
        id: createId('sub'),
        name,
        icon: input.icon || '📘',
        color: input.color,
        createdAt: new Date().toISOString(),
      };
      update((prev) => ({ ...prev, subjects: [...prev.subjects, subject] }));
      setSelectedSubjectId(subject.id);
      sound.play('click');
    },
    [update],
  );

  const updateSubject = useCallback(
    (id: string, patch: Partial<Omit<Subject, 'id' | 'createdAt'>>) => {
      update((prev) => ({
        ...prev,
        subjects: prev.subjects.map((subject) =>
          subject.id === id
            ? {
                ...subject,
                ...patch,
                name: (patch.name ?? subject.name).trim().slice(0, 40) || subject.name,
              }
            : subject,
        ),
      }));
    },
    [update],
  );

  const deleteSubject = useCallback(
    (id: string) => {
      const next = update((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((subject) => subject.id !== id),
        lastSubjectId: prev.lastSubjectId === id ? null : prev.lastSubjectId,
      }));
      setSelectedSubjectId((current) =>
        current === id ? (next.subjects[0]?.id ?? null) : current,
      );
    },
    [update],
  );

  const setDailyGoal = useCallback(
    (pomodoros: number) => {
      update((prev) => ({
        ...prev,
        dailyGoalPomodoros: Math.min(24, Math.max(1, Math.round(pomodoros))),
      }));
    },
    [update],
  );

  const updateTimerSettings = useCallback(
    (patch: Partial<TimerSettings>) => {
      update((prev) => ({ ...prev, timer: { ...prev.timer, ...patch } }));
    },
    [update],
  );

  const updatePrefs = useCallback(
    (patch: Partial<Preferences>) => {
      update((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } }));
    },
    [update],
  );

  const resetAll = useCallback(() => {
    stopTimer();
    const fresh = createDefaultState();
    stateRef.current = fresh;
    setStateRaw(fresh);
    removeKey(TIMER_KEY);
    setSelectedSubjectId(fresh.subjects[0]?.id ?? null);
    setGoal('');
    setSessionMinutes(null);
    setPhase('focus');
    setCompletion(null);
    setFocusMode(false);
    say('idle');
    pushToast({ kind: 'info', icon: '🧹', title: 'All data cleared', description: 'Fresh start.' });
  }, [pushToast, say, stopTimer]);

  const importState = useCallback(
    (text: string): { ok: boolean; error?: string } => {
      try {
        const imported = parseImport(text);
        stopTimer();
        stateRef.current = imported;
        setStateRaw(imported);
        removeKey(TIMER_KEY);
        setSelectedSubjectId(imported.lastSubjectId ?? imported.subjects[0]?.id ?? null);
        setGoal(imported.lastGoal);
        setPhase('focus');
        setCompletion(null);
        pushToast({
          kind: 'info',
          icon: '📥',
          title: 'Study data imported',
          description: `${imported.sessions.length} sessions restored.`,
        });
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not read that file.';
        pushToast({ kind: 'info', icon: '⚠️', title: 'Import failed', description: message });
        return { ok: false, error: message };
      }
    },
    [pushToast, stopTimer],
  );

  const exportState = useCallback(() => {
    try {
      const payload = JSON.stringify(buildExport(stateRef.current), null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studyquest-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      pushToast({ kind: 'info', icon: '📤', title: 'Export ready', description: 'Saved as JSON.' });
    } catch {
      pushToast({ kind: 'info', icon: '⚠️', title: 'Export failed' });
    }
  }, [pushToast]);

  /* ---------------------------------------------------------- page title */

  useEffect(() => {
    const base = 'StudyQuest';
    if (!timer.active) {
      document.title = base;
      return;
    }
    const mins = Math.floor(timer.remaining / 60);
    const secs = `${timer.remaining % 60}`.padStart(2, '0');
    const label = PHASE_LABEL[timer.active.phase];
    document.title = `${mins}:${secs} · ${timer.isRunning ? label : 'Paused'} · ${base}`;
    return () => {
      document.title = base;
    };
  }, [timer.active, timer.remaining, timer.isRunning]);

  /* ------------------------------------------------------ leave warning */

  useEffect(() => {
    if (!timer.isRunning) return;
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [timer.isRunning]);

  const value: StudyContextValue = {
    state,
    stats,
    level,
    storageAvailable,
    timer,
    phase,
    armedMinutes,
    sessionMinutes,
    setSessionMinutes,
    selectedSubjectId,
    setSelectedSubjectId,
    goal,
    setGoal,
    start,
    toggle,
    reset,
    skip,
    focusMode,
    setFocusMode,
    completion,
    dismissCompletion,
    startNext,
    toasts,
    dismissToast,
    mascot,
    confettiKey,
    celebrate,
    addSubject,
    updateSubject,
    deleteSubject,
    setDailyGoal,
    updateTimerSettings,
    updatePrefs,
    resetAll,
    importState,
    exportState,
    notifications,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}
