import { useEffect } from 'react';
import { usePersistedPref } from './usePersistedPref';
import type { Lang } from '../app/translations';

const LANGS: Lang[] = ['en', 'tr', 'de'];

/**
 * The interface language (en, tr or de), remembered in this browser and shared by the sign-in pages and the app.
 * It also sets <html lang>, so that upper-case headings follow the language's own rules (Turkish "i" becomes "İ")
 * and screen readers pick the right voice.
 */
export function useLang(): [Lang, (lang: Lang) => void] {
  const [stored, setStored] = usePersistedPref('customer_lang', 'en');
  const lang = (LANGS as string[]).includes(stored) ? (stored as Lang) : 'en';
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return [lang, (next: Lang) => setStored(next)];
}
