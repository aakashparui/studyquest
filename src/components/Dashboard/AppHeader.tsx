import type { ReactElement } from 'react';
import { Flame } from 'lucide-react';
import type { Route } from '../../hooks/useHashRoute';
import type { LevelInfo } from '../../lib/xpSystem';
import { formatNumber } from '../../lib/format';
import { LevelBadge } from '../LevelCard/LevelCard';
import { XPBar } from '../XPBar/XPBar';
import { sound } from '../../lib/sound';
import { NAV_ITEMS, type NavItem } from './navItems';

function NavLink({
  item,
  active,
  onSelect,
  variant,
}: {
  item: NavItem;
  active: boolean;
  onSelect: () => void;
  variant: 'top' | 'bottom';
}): ReactElement {
  const Icon = item.icon;
  if (variant === 'bottom') {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        className={[
          'flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-colors',
          active ? 'text-brand-soft' : 'text-muted',
        ].join(' ')}
      >
        <Icon size={19} aria-hidden />
        <span>{item.short ?? item.label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200',
        active
          ? 'bg-raised text-ink shadow-[inset_0_0_0_1px_var(--color-line)]'
          : 'text-muted hover:text-ink',
      ].join(' ')}
    >
      <Icon size={16} aria-hidden />
      {item.label}
    </button>
  );
}

export function AppHeader({
  route,
  onNavigate,
  level,
  streak,
  todayPomodoros,
  goalPomodoros,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  level: LevelInfo;
  streak: number;
  todayPomodoros: number;
  goalPomodoros: number;
}): ReactElement {
  const go = (next: Route): void => {
    sound.play('click');
    onNavigate(next);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <LevelBadge level={level.level} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-extrabold tracking-tight text-ink">
                Study<span className="text-gradient">Quest</span>
              </p>
              <p className="num truncate text-[11px] leading-tight text-muted">
                Lv {level.level} · {level.title} · {formatNumber(level.totalXp)} XP
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-full border border-line bg-raised/60 px-2.5 py-1.5 text-xs font-bold text-ink-soft"
              title={`${streak} day streak`}
            >
              <Flame size={13} className={streak > 0 ? 'text-rose' : 'text-faint'} aria-hidden />
              <span className="num">{streak}</span>
            </span>
            <span
              className="num rounded-full border border-line bg-raised/60 px-2.5 py-1.5 text-xs font-bold text-ink-soft"
              title="Pomodoros today versus your daily goal"
            >
              {todayPomodoros}/{goalPomodoros}
            </span>
          </div>
        </div>

        <div className="hidden w-full max-w-xs sm:block">
          <XPBar level={level} showNumbers={false} height="sm" />
        </div>

        <nav aria-label="Main" className="-mx-1 hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.route}
              item={item}
              active={route === item.route}
              onSelect={() => go(item.route)}
              variant="top"
            />
          ))}
        </nav>
      </div>
    </header>
  );
}

export function BottomNav({
  route,
  onNavigate,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
}): ReactElement {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 border-t border-line/70 bg-base/90 px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.route}
          item={item}
          active={route === item.route}
          onSelect={() => {
            sound.play('click');
            onNavigate(item.route);
          }}
          variant="bottom"
        />
      ))}
    </nav>
  );
}
