/** mm:ss, or h:mm:ss past an hour. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = `${minutes}`.padStart(2, '0');
  const ss = `${seconds}`.padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "2h 15m" / "45m" / "0m" — for totals. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.round((s % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return s > 0 ? `${s}s` : '0m';
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
