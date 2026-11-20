import type { ReactElement } from 'react';
import { Award, CalendarDays, Clock, Flame, Gauge, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useStudy } from '../store/useStudy';
import { Card, StatTile } from '../components/ui/Card';
import { BarList, SubjectBars } from '../components/Stats/BarList';
import { ACHIEVEMENTS } from '../lib/achievements';
import { formatDuration, formatNumber, pluralise } from '../lib/format';

export function StatisticsPage(): ReactElement {
  const { state, stats, level } = useStudy();

  const xpEarned = state.sessions.reduce((sum, session) => sum + session.xpEarned, 0);
  const unlockedCount = state.achievements.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total focus time"
          value={formatDuration(stats.totalFocusSeconds)}
          hint={`${stats.totalPomodoros} ${pluralise(stats.totalPomodoros, 'Pomodoro')}`}
          icon={<Clock size={13} aria-hidden />}
        />
        <StatTile
          label="Current streak"
          value={`${stats.streak} ${pluralise(stats.streak, 'day')}`}
          hint={`Longest ${stats.longest} ${pluralise(stats.longest, 'day')}`}
          icon={<Flame size={13} aria-hidden />}
          accent="rose"
        />
        <StatTile
          label="Average session"
          value={stats.averageSessionSeconds ? formatDuration(stats.averageSessionSeconds) : '—'}
          hint="Across completed focus sessions"
          icon={<Gauge size={13} aria-hidden />}
          accent="cyan"
        />
        <StatTile
          label="XP earned"
          value={formatNumber(state.xp)}
          hint={`Level ${level.level} · ${level.title}`}
          icon={<Sparkles size={13} aria-hidden />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Today"
          value={`${stats.todayPomodoros}`}
          hint={formatDuration(stats.todaySeconds)}
          icon={<Target size={13} aria-hidden />}
          accent="mint"
        />
        <StatTile
          label="This week"
          value={`${stats.weekPomodoros}`}
          hint={formatDuration(stats.weekSeconds)}
          icon={<CalendarDays size={13} aria-hidden />}
        />
        <StatTile
          label="This month"
          value={`${stats.monthPomodoros}`}
          hint={formatDuration(stats.monthSeconds)}
          icon={<TrendingUp size={13} aria-hidden />}
          accent="accent"
        />
        <StatTile
          label="Achievements"
          value={`${unlockedCount}/${ACHIEVEMENTS.length}`}
          hint={`${formatNumber(xpEarned)} XP from sessions`}
          icon={<Award size={13} aria-hidden />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Weekly focus" subtitle="Minutes of focus per day, this week">
          <BarList data={stats.weekSeries} format={(value) => formatDuration(value * 60)} />
        </Card>

        <Card title="Focus by subject" subtitle="Where your hours actually go">
          <SubjectBars
            data={stats.subjectTotals.slice(0, 6).map((entry) => ({
              key: entry.subjectId ?? entry.name,
              label: entry.name,
              icon: entry.icon,
              color: entry.color,
              value: entry.seconds,
            }))}
            format={(value) => formatDuration(value)}
          />
        </Card>

        <Card
          title="Most productive day"
          subtitle={stats.bestWeekday ? `${stats.bestWeekday} leads overall` : 'All history'}
        >
          <BarList data={stats.weekdaySeries} format={(value) => formatDuration(value * 60)} />
        </Card>

        <Card
          title="Most productive time"
          subtitle={stats.bestHourLabel ? `${stats.bestHourLabel} is your peak` : 'All history'}
        >
          <BarList data={stats.hourSeries} format={(value) => formatDuration(value * 60)} />
        </Card>
      </div>
    </div>
  );
}
