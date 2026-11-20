/** Short, collision-safe enough id for local-only records. */
export function createId(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return prefix ? `${prefix}_${rand}` : rand;
}
