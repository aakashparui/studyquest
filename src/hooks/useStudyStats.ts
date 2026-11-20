import { useEffect, useMemo, useState } from 'react';
import type { StudyState } from '../types/study';
import { dayKey } from '../lib/date';
import { computeStats, type StudyStats } from '../lib/statistics';

/** Re-renders when the local calendar day rolls over. */
export function useDayKey(): string {
  const [key, setKey] = useState(() => dayKey());

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = dayKey();
      setKey((current) => (current === next ? current : next));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return key;
}

/** Memoised derived statistics, refreshed across midnight. */
export function useStudyStats(state: StudyState): StudyStats {
  const today = useDayKey();
  return useMemo(() => computeStats(state, today), [state, today]);
}
