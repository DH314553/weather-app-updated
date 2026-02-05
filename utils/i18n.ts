import * as Localization from 'expo-localization';
import ja from '../locales/ja.json';
import en from '../locales/en.json';

type Language = 'ja' | 'en';

interface Translations {
  [key: string]: any;
}

const translations: { [key in Language]: Translations } = {
  ja,
  en,
};

// Detect system language
const getSystemLanguage = (): Language => {
  const locales = Localization.getLocales();
  if (!locales || locales.length === 0) {
    return 'ja';
  }
  const langCode = locales[0]?.languageCode;
  if (langCode === 'ja') return 'ja';
  if (langCode === 'en') return 'en';
  return 'ja';
};

let currentLanguage: Language = getSystemLanguage();

// Helper to get nested translation
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
};

// Main translation function
export const t = (key: string, defaultValue?: string): string => {
  try {
    const value = getNestedValue(translations[currentLanguage], key);
    if (value === undefined || value === null) {
      console.warn(`Translation key not found: ${key} for language: ${currentLanguage}`);
      return defaultValue || key;
    }
    return String(value);
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

// Get all supported languages
export const getSupportedLanguages = (): Language[] => {
  return Object.keys(translations) as Language[];
};

export default {
  t,
  setLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
};
