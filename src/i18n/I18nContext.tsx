import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { en, type Translations } from './en';
import { ar } from './ar';

type Language = 'en' | 'ar';

interface I18nContextType {
  lang: Language;
  t: Translations;
  toggleLang: () => void;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = lang === 'ar' ? ar : en;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang, dir }}>
      <div dir={dir}>{children}</div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
