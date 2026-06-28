import { useEffect, useState, useCallback } from 'react';

export type AdminTheme = 'light' | 'dark';
const STORAGE_KEY = 'akrem-admin-theme';

function getInitial(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(getInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: AdminTheme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState(t => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, setTheme, toggle };
}
