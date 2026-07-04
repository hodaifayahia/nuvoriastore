import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { en } from './locales/en';

export type Language = 'ar' | 'fr' | 'en';
export type TranslationKeys = keyof typeof ar;

const translations: Record<Language, Record<string, string>> = { ar, fr, en };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  return 'ar';
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
    return translations.ar[key] || key;
  }, []);


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
      language: 'ar' as Language,
      setLanguage: () => {},
      t: (key: string) => ar[key as keyof typeof ar] || key,
      dir: 'rtl' as const,
    };
  }
  return context;
}
