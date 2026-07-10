import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { en } from './locales/en';

export type Language = 'ar' | 'fr';
export type TranslationKeys = keyof typeof ar;

const translations: Record<Language, Record<string, string>> = { ar, fr };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'fr';
  const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const l of langs) {
    const code = l.toLowerCase().split('-')[0];
    if (code === 'ar') return 'ar';
    if (code === 'fr') return 'fr';
  }
  // Non-Arabic / non-French browser locale → French per user rule
  return 'fr';
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'fr';
  const stored = localStorage.getItem('site_language');
  if (stored === 'ar' || stored === 'fr') return stored;
  return detectBrowserLanguage();
}



export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem('site_language', language);
    localStorage.setItem('admin_language', language);
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    const english = en as Record<string, string>;
    return translations[language]?.[key]
      || (language === 'fr' ? english[key] : translations.fr[key])
      || translations.ar[key]
      || key;
  }, [language]);


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback for components outside provider
    return {
      language: 'fr' as Language,
      setLanguage: () => {},
      t: (key: string) => fr[key as keyof typeof fr] || ar[key as keyof typeof ar] || key,
      dir: 'ltr' as const,
    };
  }
  return context;
}
