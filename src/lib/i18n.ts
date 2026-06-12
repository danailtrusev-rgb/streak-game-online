// ── i18n types and utilities ──────────────────────────────────────────────────

export interface Language {
  code: string;
  name: string;
  native_name: string;
  enabled: boolean;
  is_default: boolean;
  sort_order: number;
}

export type TranslationMap = Record<string, string>;

/** Substitute {var} placeholders in a translated string */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/** Pick the best matching language code from the browser's navigator.languages */
export function detectBrowserLanguage(supportedCodes: string[]): string {
  const preferred = navigator.languages ?? [navigator.language ?? 'en'];
  for (const lang of preferred) {
    const base = lang.split('-')[0].toLowerCase();
    if (supportedCodes.includes(lang.toLowerCase())) return lang.toLowerCase();
    if (supportedCodes.includes(base)) return base;
  }
  return 'en';
}

export const LANG_STORAGE_KEY = 'app_language';
export const TRANSLATIONS_CACHE_KEY = (lang: string) => `translations_cache_${lang}`;
export const TRANSLATIONS_CACHE_TS_KEY = (lang: string) => `translations_cache_ts_${lang}`;
/** Re-fetch translations if cache is older than this many ms (1 hour) */
export const CACHE_TTL_MS = 60 * 60 * 1000;
