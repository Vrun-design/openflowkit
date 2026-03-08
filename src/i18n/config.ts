import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import trTranslation from './locales/tr/translation.json';
import deTranslation from './locales/de/translation.json';
import frTranslation from './locales/fr/translation.json';
import esTranslation from './locales/es/translation.json';
import zhTranslation from './locales/zh/translation.json';
import jaTranslation from './locales/ja/translation.json';

function lookupTranslationValue(source: unknown, key: string): string | undefined {
  const segments = key.split('.');
  let current: unknown = source;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

function formatMissingKeyAsEnglishLabel(key: string): string {
  const lastSegment = key.split('.').pop() ?? key;
  const withSpaces = lastSegment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  if (!withSpaces) {
    return key;
  }

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function getTranslationFallback(key: string): string {
  return lookupTranslationValue(enTranslation, key) ?? formatMissingKeyAsEnglishLabel(key);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: (key) => getTranslationFallback(key),
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: enTranslation },
      tr: { translation: trTranslation },
      de: { translation: deTranslation },
      fr: { translation: frTranslation },
      es: { translation: esTranslation },
      zh: { translation: zhTranslation },
      ja: { translation: jaTranslation },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
    load: 'languageOnly',
  });

export default i18n;
