import { useEffect } from 'react';
import { useTranslation } from '@/i18n';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const LANG_MAP = {
  ar: 'ar',
  en: 'en',
  fr: 'fr',
} as const;

export default function AutoPageTranslator() {
  const { language } = useTranslation();

  useEffect(() => {
    if (window.google?.translate?.TranslateElement) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'ar',
          autoDisplay: false,
          includedLanguages: 'ar,en,fr',
        },
        'google_translate_element'
      );
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-translate="true"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.setAttribute('data-google-translate', 'true');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const targetLanguage = LANG_MAP[language];

    const applyLanguage = () => {
      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (!select) return false;

      if (select.value !== targetLanguage) {
        select.value = targetLanguage;
        select.dispatchEvent(new Event('change'));
      }
      return true;
    };

    if (applyLanguage()) return;

    const timer = window.setInterval(() => {
      if (applyLanguage()) {
        window.clearInterval(timer);
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [language]);

  return (
    <div
      id="google_translate_element"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: 1,
        height: 1,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
