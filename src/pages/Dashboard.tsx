import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useStudy } from '../store/useStudy';
import { useDayKey } from '../hooks/useStudyStats';
import { pickBreakTips } from '../lib/mascot';
import { subjectOf } from '../lib/session';
import { TimerPanel } from '../components/Timer/TimerPanel';
import { MissionCard } from '../components/Dashboard/MissionCard';
import { DailyGoalCard } from '../components/Dashboard/DailyGoalCard';
import { QuoteCard } from '../components/Dashboard/QuoteCard';
import { ComboMeter } from '../components/Dashboard/ComboMeter';
import { AmbientControl } from '../components/Dashboard/AmbientControl';
import { LevelCard } from '../components/LevelCard/LevelCard';
import { StreakCard } from '../components/Streak/StreakCard';
import { Mascot } from '../components/Mascot/Mascot';

export function DashboardPage(): ReactElement {
  const {
    state,
    stats,
    level,
    timer,
    phase,
    armedMinutes,
    selectedSubjectId,
    setSelectedSubjectId,
    goal,
    setGoal,
    setSessionMinutes,
    start,
    toggle,
    reset,
    skip,
    setFocusMode,
    mascot,
    addSubject,
    updateSubject,
    deleteSubject,
    setDailyGoal,
    updatePrefs,
  } = useStudy();

  const today = useDayKey();
  // Stable per day and phase, so the tips don't shuffle on every render.
  const breakTips = useMemo(
    () => pickBreakTips(3, Number(today.replace(/-/g, '')) + phase.length),
    [today, phase],
  );

  const activePhase = timer.active?.phase ?? phase;
  const activeSubject = subjectOf(state, timer.active?.subjectId ?? selectedSubjectId);
  const activeGoal = timer.active ? timer.active.goal : goal;
  const displaySeconds = timer.active ? timer.remaining : armedMinutes * 60;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <TimerPanel
          phase={activePhase}
          seconds={displaySeconds}
          progress={timer.progress}
          isRunning={timer.isRunning}
          isPaused={timer.isPaused}
          hasActive={timer.active !== null}
          subjectIcon={activePhase === 'focus' ? (activeSubject?.icon ?? null) : null}
          subjectName={activePhase === 'focus' ? (activeSubject?.name ?? null) : null}
          goal={activePhase === 'focus' ? activeGoal : ''}
          breakTips={breakTips}
          cycleCount={state.cycleCount}
          sessionsBeforeLongBreak={state.timer.sessionsBeforeLongBreak}
          onToggle={toggle}
          onReset={reset}
          onSkip={skip}
          onEnterFocusMode={() => setFocusMode(true)}
        />
      </div>

      <div className="lg:col-span-5">
        <DailyGoalCard
          stats={stats}
          goalPomodoros={state.dailyGoalPomodoros}
          focusMinutes={state.timer.focusMinutes}
          onChangeGoal={setDailyGoal}
        />
      </div>

      <div className="lg:col-span-7">
        <MissionCard
          subjects={state.subjects}
          stats={stats}
          selectedId={selectedSubjectId}
          onSelect={setSelectedSubjectId}
          goal={goal}
          onGoalChange={setGoal}
          minutes={armedMinutes}
          defaultMinutes={state.timer.focusMinutes}
          onMinutesChange={setSessionMinutes}
          onStart={start}
          locked={timer.active !== null}
          onAddSubject={addSubject}
          onUpdateSubject={updateSubject}
          onDeleteSubject={deleteSubject}
        />
      </div>

      <div className="lg:col-span-5">
        <LevelCard level={level} />
      </div>

      <div className="lg:col-span-7">
        <StreakCard stats={stats} />
      </div>

      <div className="space-y-4 lg:col-span-5">
        <Mascot mood={mascot.mood} message={mascot.message} />
        <ComboMeter combo={state.combo} best={state.bestCombo} />
      </div>

      <div className="lg:col-span-7">
        <QuoteCard day={today} />
      </div>

      <div className="lg:col-span-5">
        <AmbientControl
          value={state.prefs.ambient}
          volume={state.prefs.ambientVolume}
          onChange={(ambient) => updatePrefs({ ambient })}
          onVolume={(ambientVolume) => updatePrefs({ ambientVolume })}
        />
      </div>
    </div>
  );
}
