import * as Localization from 'expo-localization';
import ja from '../locales/ja.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';
import ko from '../locales/ko.json';

type Language = 'ja' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ko';

interface Translations {
  [key: string]: any;
}

const translations: { [key in Language]: Translations } = {
  ja,
  en,
  es,
  fr,
  de,
  zh,
  ko,
};

const normalizeLanguageCode = (value?: string | null): Language | null => {
  if (!value) return null;
  const code = value.toLowerCase().replace('_', '-');
  if (code.startsWith('ja')) return 'ja';
  if (code.startsWith('en')) return 'en';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('fr')) return 'fr';
  if (code.startsWith('de')) return 'de';
  if (code.startsWith('zh')) return 'zh';
  if (code.startsWith('ko')) return 'ko';
  return null;
};

// Detect system language
const getSystemLanguage = (): Language => {
  const locales = Localization.getLocales();
  if (!locales || locales.length === 0) {
    return 'ja';
  }
  const preferred = locales[0];
  return (
    normalizeLanguageCode(preferred?.languageTag) ||
    normalizeLanguageCode(preferred?.languageCode) ||
    'ja'
  );
};

let currentLanguage: Language = getSystemLanguage();
const missingTranslationWarnings = new Set<string>();

// Helper to get nested translation
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
};

// Main translation function
export const t = (key: string, params?: { [k: string]: any }, defaultValue?: string): string => {
  try {
    const fallbackLanguages: Language[] = [currentLanguage, 'ja', 'en'];
    let value: any = undefined;

    for (const lang of fallbackLanguages) {
      value = getNestedValue(translations[lang], key);
      if (value !== undefined && value !== null) break;
    }

    if (value === undefined || value === null) {
      const warningKey = `${currentLanguage}:${key}`;
      if (!missingTranslationWarnings.has(warningKey)) {
        missingTranslationWarnings.add(warningKey);
        console.warn(`Translation key not found: ${key} for language: ${currentLanguage}`);
      }
      value = defaultValue || key;
    }

    let str = String(value);
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(k => {
        const re = new RegExp(`\\{${k}\\}`, 'g');
        str = str.replace(re, String(params[k]));
      });
    }
    return str;
  } catch (error) {
    console.warn(`Error translating key: ${key}`, error);
    return defaultValue || key;
  }
};

// Set language
export const setLanguage = (lang: Language): void => {
  if (translations[lang]) {
    currentLanguage = lang;
  } else {
    console.warn(`Language ${lang} not supported`);
  }
};

// Get current language
export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

export const resolveLanguage = (candidate?: string | null): Language => {
  return normalizeLanguageCode(candidate) || 'ja';
};

// Get all supported languages
export const getSupportedLanguages = (): Language[] => {
  return Object.keys(translations) as Language[];
};

export default {
  t,
  setLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  resolveLanguage,
};
