'use client';

import { useI18n } from '@/components/I18nProvider';

/**
 * Wrapper component for easy translation access in observatory components
 */
export function useObservatoryI18n() {
  const { t, locale } = useI18n();
  
  return {
    t: (key: string) => t(`observatory.${key}`) as string,
    locale,
  };
}

/**
 * Translated text component
 */
export function T({ k, fallback = '' }: { k: string; fallback?: string }) {
  const { t } = useObservatoryI18n();
  return <>{t(k) || fallback}</>;
}
