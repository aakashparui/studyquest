import { BarChart3, History, LayoutDashboard, Settings, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Route } from '../../hooks/useHashRoute';

export interface NavItem {
  route: Route;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  short?: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { route: 'stats', label: 'Statistics', short: 'Stats', icon: BarChart3 },
  { route: 'history', label: 'History', icon: History },
  { route: 'achievements', label: 'Achievements', short: 'Awards', icon: Trophy },
  { route: 'settings', label: 'Settings', icon: Settings },
];
