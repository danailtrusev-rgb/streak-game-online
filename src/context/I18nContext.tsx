import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  interpolate, detectBrowserLanguage,
  LANG_STORAGE_KEY, TRANSLATIONS_CACHE_KEY, TRANSLATIONS_CACHE_TS_KEY, CACHE_TTL_MS,
  STATIC_FALLBACKS,
  type Language, type TranslationMap,
} from '../lib/i18n';

interface I18nContextValue {
  language: string;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  languages: Language[];
  loading: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => STATIC_FALLBACKS[key] ?? key,
  languages: [],
  loading: true,
});

export function useI18n() {
  return useContext(I18nContext);
}

function readCache(lang: string): TranslationMap | null {
  try {
    const ts = localStorage.getItem(TRANSLATIONS_CACHE_TS_KEY(lang));
    if (!ts) return null;
    if (Date.now() - Number(ts) > CACHE_TTL_MS) return null;
    const raw = localStorage.getItem(TRANSLATIONS_CACHE_KEY(lang));
    if (!raw) return null;
    return JSON.parse(raw) as TranslationMap;
  } catch {
    return null;
  }
}

function writeCache(lang: string, map: TranslationMap) {
  try {
    localStorage.setItem(TRANSLATIONS_CACHE_KEY(lang), JSON.stringify(map));
    localStorage.setItem(TRANSLATIONS_CACHE_TS_KEY(lang), String(Date.now()));
  } catch {
    // storage quota — not fatal
  }
}

async function fetchTranslations(lang: string): Promise<TranslationMap> {
  const { data, error } = await supabase
    .from('translations')
    .select('key, value')
    .eq('language_code', lang);

  if (error || !data) return {};
  const map: TranslationMap = {};
  for (const row of data) map[row.key] = row.value;
  return map;
}

async function fetchLanguages(): Promise<Language[]> {
  const { data } = await supabase
    .from('app_languages')
    .select('*')
    .eq('enabled', true)
    .order('sort_order');
  return (data as Language[]) ?? [];
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguageState] = useState<string>(() =>
    localStorage.getItem(LANG_STORAGE_KEY) ?? 'en',
  );
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [fallback, setFallback] = useState<TranslationMap>({});
  const [loading, setLoading] = useState(true);

  const loadTranslations = useCallback(async (lang: string) => {
    // Try cache first
    let map = readCache(lang);
    if (!map) {
      map = await fetchTranslations(lang);
      if (Object.keys(map).length > 0) writeCache(lang, map);
    }
    setTranslations(map);

    // Also load English fallback if not English
    if (lang !== 'en') {
      let fb = readCache('en');
      if (!fb) {
        fb = await fetchTranslations('en');
        if (Object.keys(fb).length > 0) writeCache('en', fb);
      }
      setFallback(fb);
    } else {
      setFallback({});
    }
  }, []);

  const setLanguage = useCallback(async (code: string) => {
    localStorage.setItem(LANG_STORAGE_KEY, code);
    setLanguageState(code);
    await loadTranslations(code);
  }, [loadTranslations]);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const raw = translations[key] ?? fallback[key] ?? STATIC_FALLBACKS[key] ?? key;
    return interpolate(raw, vars);
  }, [translations, fallback]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const langs = await fetchLanguages();
      if (cancelled) return;
      setLanguages(langs);

      // Detect language if not stored yet
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      let lang = stored;
      if (!lang) {
        const supported = langs.map((l) => l.code);
        lang = detectBrowserLanguage(supported);
        localStorage.setItem(LANG_STORAGE_KEY, lang);
        setLanguageState(lang);
      }

      await loadTranslations(lang ?? 'en');
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [loadTranslations]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, languages, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Utility: invalidate the translation cache for a language (called after admin edits) */
export function invalidateTranslationCache(lang?: string) {
  if (lang) {
    localStorage.removeItem(TRANSLATIONS_CACHE_KEY(lang));
    localStorage.removeItem(TRANSLATIONS_CACHE_TS_KEY(lang));
  } else {
    // Invalidate all
    Object.keys(localStorage)
      .filter((k) => k.startsWith('translations_cache_'))
      .forEach((k) => localStorage.removeItem(k));
  }
}
