import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { StudyProvider } from './store/StudyProvider';
import { useStudy } from './store/useStudy';
import { useHashRoute } from './hooks/useHashRoute';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { sound } from './lib/sound';
import { subjectOf } from './lib/session';
import { Aurora } from './components/ui/Aurora';
import { Confetti } from './components/ui/Confetti';
import { ToastStack } from './components/ui/ToastStack';
import { AppHeader, BottomNav } from './components/Dashboard/AppHeader';
import { FocusMode } from './components/FocusMode/FocusMode';
import { SessionComplete } from './components/Timer/SessionComplete';
import { DashboardPage } from './pages/Dashboard';
import { StatisticsPage } from './pages/Statistics';
import { HistoryPage } from './pages/History';
import { AchievementsPage } from './pages/Achievements';
import { SettingsPage } from './pages/Settings';
import { MascotAvatar } from './components/Mascot/Mascot';

function Splash(): ReactElement {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-base">
      <div className="animate-fade flex flex-col items-center gap-4">
        <MascotAvatar mood="idle" size={88} />
        <p className="text-lg font-extrabold tracking-tight text-ink">
          Study<span className="text-gradient">Quest</span>
        </p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-raised">
          <div className="animate-shimmer h-full w-full rounded-full bg-gradient-to-r from-brand to-accent" />
        </div>
        <p className="text-xs text-muted">Loading your progress…</p>
      </div>
    </div>
  );
}

function AppShell(): ReactElement {
  const study = useStudy();
  const [route, navigate] = useHashRoute();

  const {
    state,
    stats,
    level,
    timer,
    phase,
    armedMinutes,
    focusMode,
    setFocusMode,
    completion,
    dismissCompletion,
    startNext,
    toasts,
    dismissToast,
    mascot,
    confettiKey,
    toggle,
    reset,
    skip,
    selectedSubjectId,
    goal,
    setSessionNotes,
  } = study;

  // The audio context can only start from a gesture; do it once, globally.
  useEffect(() => {
    const unlock = (): void => {
      void sound.resume();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const onEscape = useCallback(() => {
    if (focusMode) setFocusMode(false);
    else if (completion) dismissCompletion();
  }, [completion, dismissCompletion, focusMode, setFocusMode]);

  const handlers = useMemo(
    () => ({
      onToggle: toggle,
      onReset: reset,
      onSkip: skip,
      onToggleFocusMode: () => setFocusMode(!focusMode),
      onEscape,
    }),
    [toggle, reset, skip, setFocusMode, focusMode, onEscape],
  );

  useKeyboardShortcuts(handlers);

  const activePhase = timer.active?.phase ?? phase;
  const activeSubject = subjectOf(state, timer.active?.subjectId ?? selectedSubjectId);
  const animationsOn = state.prefs.animation !== 'off';

  return (
    <div className="min-h-screen">
      <Aurora phase={activePhase} />

      <AppHeader
        route={route}
        onNavigate={navigate}
        level={level}
        streak={stats.streak}
        todayPomodoros={stats.todayPomodoros}
        goalPomodoros={state.dailyGoalPomodoros}
      />

      <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 sm:px-6 sm:pb-10">
        {route === 'dashboard' && <DashboardPage />}
        {route === 'stats' && <StatisticsPage />}
        {route === 'history' && <HistoryPage />}
        {route === 'achievements' && <AchievementsPage />}
        {route === 'settings' && <SettingsPage />}
      </main>

      <BottomNav route={route} onNavigate={navigate} />

      {focusMode && timer.active && (
        <FocusMode
          phase={activePhase}
          seconds={timer.remaining}
          progress={timer.progress}
          isRunning={timer.isRunning}
          subjectIcon={activePhase === 'focus' ? (activeSubject?.icon ?? null) : null}
          subjectName={activePhase === 'focus' ? (activeSubject?.name ?? null) : null}
          goal={activePhase === 'focus' ? (timer.active.goal || goal) : ''}
          mascotMessage={mascot.message}
          combo={state.combo}
          bestCombo={state.bestCombo}
          onToggle={toggle}
          onExit={() => setFocusMode(false)}
        />
      )}

      {completion && (
        <SessionComplete
          summary={completion}
          mascotMessage={mascot.message}
          onDismiss={dismissCompletion}
          onStartNext={startNext}
          onSaveNotes={(notes) => setSessionNotes(completion.recordId, notes)}
          running={timer.isRunning}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {animationsOn && confettiKey > 0 && <Confetti key={confettiKey} />}

      <span className="sr-only" aria-live="polite">
        {timer.active
          ? `${Math.ceil(timer.remaining / 60)} minutes remaining`
          : `Ready to start a ${armedMinutes} minute session`}
      </span>
    </div>
  );
}

export default function App(): ReactElement {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), 450);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <StudyProvider>
      {booting && <Splash />}
      <AppShell />
    </StudyProvider>
  );
}
