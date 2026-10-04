"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const emptyRecord = "{}";

export function useLocalStorageRecord<T extends Record<string, unknown>>(key: string) {
  const eventName = `harbour-storage:${key}`;
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(eventName, notify);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(eventName, notify);
    };
  }, [eventName, key]);
  const getSnapshot = useCallback(() => window.localStorage.getItem(key) ?? emptyRecord, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => emptyRecord);
  const value = useMemo(() => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return {} as T;
    }
  }, [raw]);
  const setValue = useCallback((next: T) => {
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(eventName));
  }, [eventName, key]);
  const clear = useCallback(() => {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(eventName));
  }, [eventName, key]);

  return [value, setValue, clear] as const;
}
