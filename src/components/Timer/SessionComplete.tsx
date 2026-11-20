import type { ReactElement } from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import type { CompletionSummary } from '../../types/study';
import { PHASE_LABEL } from '../../lib/session';
import { ACHIEVEMENTS_BY_ID } from '../../lib/achievements';
import { formatNumber, pluralise } from '../../lib/format';
import { Button } from '../ui/Button';
import { MascotAvatar } from '../Mascot/Mascot';

export function SessionComplete({
  summary,
  mascotMessage,
  onDismiss,
  onStartNext,
  running,
}: {
  summary: CompletionSummary;
  mascotMessage: string;
  onDismiss: () => void;
  onStartNext: () => void;
  /** True when the next phase was auto-started behind the overlay. */
  running: boolean;
}): ReactElement {
  const isFocus = summary.phase === 'focus';
  const nextLabel = PHASE_LABEL[summary.nextPhase];

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={isFocus ? 'Session complete' : 'Break over'}
    >
      <div className="animate-pop glass my-auto w-full max-w-md rounded-3xl p-6 text-center">
        <div className="flex justify-center">
          <MascotAvatar mood={isFocus ? 'complete' : 'breakEnd'} size={88} />
        </div>

        <p className="mt-2 text-xs font-bold tracking-[0.2em] text-mint uppercase">
          {isFocus ? '🎉 Session complete' : '☕ Break over'}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
          {summary.minutes} {pluralise(summary.minutes, 'minute')}{' '}
          {isFocus ? 'focused' : 'rested'}
        </h2>

        {isFocus && (
          <p className="mt-1 flex items-center justify-center gap-2 text-sm text-ink-soft">
            <span aria-hidden>{summary.subjectIcon}</span>
            <span className="font-semibold">{summary.subjectName}</span>
            {summary.goal && <span className="truncate text-muted">· {summary.goal}</span>}
          </p>
        )}

        <p className="mt-3 text-sm text-muted">{mascotMessage}</p>

        {isFocus && (
          <>
            <div className="mt-5 rounded-2xl border border-line bg-raised/50 p-4 text-left">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink-soft">Session XP</span>
                <span className="num text-2xl font-extrabold text-gradient">
                  +{formatNumber(summary.totalXp)}
                </span>
              </div>
              <ul className="num mt-3 space-y-1.5 text-xs">
                <li className="flex justify-between text-muted">
                  <span>Base · {summary.minutes} min focus</span>
                  <span>+{summary.baseXp}</span>
                </li>
                {summary.bonuses.map((bonus) => (
                  <li key={bonus.label} className="flex justify-between text-mint">
                    <span>{bonus.label}</span>
                    <span>+{bonus.xp}</span>
                  </li>
                ))}
                {summary.events.map((event) => (
                  <li key={event.id} className="flex justify-between text-amber">
                    <span>
                      {event.icon} {event.title}
                    </span>
                    <span>+{event.xp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-raised/60 px-3 py-1.5 text-ink-soft">
                <Flame size={12} className="text-rose" aria-hidden />
                <span className="num">
                  {summary.streak} {pluralise(summary.streak, 'day')} streak
                </span>
              </span>
              {summary.combo > 1 && (
                <span className="num rounded-full border border-line bg-raised/60 px-3 py-1.5 text-ink-soft">
                  🔥 {summary.combo}x combo
                </span>
              )}
            </div>

            {summary.unlocked.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {summary.unlocked.map((id) => {
                  const achievement = ACHIEVEMENTS_BY_ID.get(id);
                  if (!achievement) return null;
                  return (
                    <p
                      key={id}
                      className="animate-pop rounded-xl border border-amber/40 bg-amber/15 px-3 py-2 text-xs font-bold text-ink"
                    >
                      {achievement.icon} Achievement unlocked — {achievement.title}
                    </p>
                  );
                })}
              </div>
            )}

            {summary.levelUp && (
              <p className="animate-pop mt-3 rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-sm font-bold text-ink">
                🆙 Level {summary.levelUp.to} — {summary.levelUp.title}
              </p>
            )}
          </>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            quiet
            variant="primary"
            size="lg"
            onClick={running ? onDismiss : onStartNext}
            icon={<ArrowRight size={18} aria-hidden />}
          >
            {running ? `${nextLabel} running — continue` : `Start ${nextLabel.toLowerCase()}`}
          </Button>
          {!running && (
            <Button variant="ghost" size="lg" onClick={onDismiss}>
              Not yet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
