import { useCallback, useEffect, useState } from 'react';
import { readJson, writeJson } from '../lib/storage';

/**
 * Small persisted value (nav tab, dismissed hints). Falls back to in-memory
 * state when storage is unavailable or the stored value is unusable.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
  validate?: (value: unknown) => T | null,
): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = readJson(key);
    if (raw === null) return initial;
    if (validate) {
      const checked = validate(raw);
      return checked === null ? initial : checked;
    }
    return raw as T;
  });

  useEffect(() => {
    writeJson(key, value);
  }, [key, value]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) =>
      typeof next === 'function' ? (next as (c: T) => T)(current) : next,
    );
  }, []);

  return [value, update];
}
