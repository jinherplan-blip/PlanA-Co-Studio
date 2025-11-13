import React, { createContext, useState, useContext, useCallback, FC, ReactNode } from 'react';
import zh from './locales/zh.json';
import en from './locales/en.json';
import { Stage } from './types';

export type Locale = 'zh' | 'en';
type Translations = typeof zh;

const translations: Record<Locale, Translations> = {
  zh,
  en,
};

// Define a type for your translation keys
type TranslationKeys = 
  | `STAGE_${'INFORMATION' | 'STRATEGY_AND_INSPIRATION' | 'MANAGEMENT' | 'PROJECT' | 'COMPARISON' | 'SETTINGS'}`
  | 'appName'
  // Add other top-level keys as needed
  | string;


interface I18nContextType {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (key: TranslationKeys, replacements?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Locale>('zh');

  const t = useCallback((key: string, replacements?: Record<string, string>): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found in current language
        let fallbackResult: any = translations['en'];
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        if (fallbackResult !== undefined) {
          result = fallbackResult;
          break;
        }
        return key; // Return key if not found in any language
      }
    }
    
    let strResult = String(result);

    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            strResult = strResult.replace(`{{${rKey}}}`, replacements[rKey]);
        });
    }

    return strResult;
  }, [language]);

  return React.createElement(I18nContext.Provider, {
    value: { language, setLanguage, t }
  }, children);
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};