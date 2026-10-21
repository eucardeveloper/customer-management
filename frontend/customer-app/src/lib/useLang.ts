import { usePersistedPref } from './usePersistedPref';
import type { Lang } from '../app/translations';

const LANGS: Lang[] = ['en', 'tr', 'de'];

/** The interface language (en, tr or de), remembered in this browser and shared by the sign-in pages and the app. */
export function useLang(): [Lang, (lang: Lang) => void] {
  const [stored, setStored] = usePersistedPref('customer_lang', 'en');
  const lang = (LANGS as string[]).includes(stored) ? (stored as Lang) : 'en';
  return [lang, (next: Lang) => setStored(next)];
}
