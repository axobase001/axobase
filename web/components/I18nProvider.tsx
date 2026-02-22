'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Locale, defaultLocale, locales, localeNames, localeFlags } from '@/i18n/config';
import { translations, t as translate } from '@/i18n/translations';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string | string[];
  locales: typeof locales;
  localeNames: typeof localeNames;
  localeFlags: typeof localeFlags;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * Internationalization Provider
 * Manages locale state and translation functions
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    // Store preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('feral-locale', newLocale);
    }
  }, []);

  // Load saved preference on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('feral-locale') as Locale;
      if (saved && locales.includes(saved)) {
        setLocaleState(saved);
      }
    }
  });

  const t = useCallback(
    (key: string) => translate(locale, key),
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales,
        localeNames,
        localeFlags,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

/**
 * Language Switcher Component
 */
export function LanguageSwitcher() {
  const { locale, setLocale, localeNames, localeFlags } = useI18n();

  return (
    <div className="flex items-center gap-2">
      {(['en', 'zh'] as Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            locale === loc
              ? 'bg-cyber-green text-cyber-black font-bold'
              : 'bg-cyber-gray text-cyber-green hover:bg-cyber-green/20'
          }`}
          title={localeNames[loc]}
        >
          {localeFlags[loc]} {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
