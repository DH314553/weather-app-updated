import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage as setI18nLanguage } from './utils/i18n';

export type Language = 'ja' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ko';

type LanguageContextType = {
  language: Language;
  changeLanguage: (lang: Language) => void;
  initialized: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ja');
  const [initialized, setInitialized] = useState(false);

  /**
   * 言語変更（即 UI 再描画）
   */
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);        // ← React state（再描画トリガー）
    setI18nLanguage(lang);    // ← i18n 内部言語切替
    AsyncStorage.setItem('language', lang).catch(console.error);
  };

  /**
   * 初回起動時：保存済み言語を復元
   */
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem('language');
        const lang = (saved as Language) || 'ja';
        setLanguage(lang);
        setI18nLanguage(lang);
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setInitialized(true);
      }
    };
    init();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, initialized }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook
 */
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};
