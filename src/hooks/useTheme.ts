import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'akrem-theme';
const EVENT = 'akrem-theme-change';

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

function getSnapshot(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'light';
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => 'light' as Theme,
  );

  useEffect(() => {
    apply(theme);
  }, [theme]);

  // Ensure initial theme is set on first mount
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const initial = getInitial();
      localStorage.setItem(STORAGE_KEY, initial);
      apply(initial);
      window.dispatchEvent(new Event(EVENT));
    } else {
      apply((localStorage.getItem(STORAGE_KEY) as Theme) || 'light');
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    apply(t);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = (localStorage.getItem(STORAGE_KEY) as Theme) === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
