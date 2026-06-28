import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'akrem-theme';
const listeners = new Set<(t: Theme) => void>();

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
}


export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = getInitial();
    apply(t);
    return t;
  });

  useEffect(() => {
    const cb = (t: Theme) => setThemeState(t);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    apply(t);
    listeners.forEach(l => l(t));
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
