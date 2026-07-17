/*
  # i18n: Languages and Translations Tables

  ## app_languages
  Master list of supported languages. Admin can add/enable/disable.
  - code: BCP-47 language code (en, es, pt, id, vi, th, fr, ...)
  - name: English name
  - native_name: Name in the language itself
  - enabled: Whether players can select it
  - is_default: Only one row should have true (English)
  - sort_order: Display order

  ## translations
  Key-value store per language. The frontend loads all rows for the
  current language on startup and caches them in localStorage.
  - language_code: FK to app_languages.code
  - key: Dot-notation key, e.g. "nav.home"
  - value: Translated string (may contain {var} placeholders)
  - updated_at: For cache invalidation

  ## Security
  - RLS: Anyone can read enabled languages and translations (needed for player UI)
  - Only service role (admin Edge Function) can write
*/

-- ── app_languages ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_languages (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  native_name text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 99,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read languages"
  ON public.app_languages FOR SELECT USING (true);

-- ── translations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.translations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL REFERENCES public.app_languages(code) ON DELETE CASCADE,
  key           text NOT NULL,
  value         text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT translations_lang_key_unique UNIQUE (language_code, key)
);

CREATE INDEX IF NOT EXISTS idx_translations_lang ON public.translations (language_code);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON public.translations FOR SELECT USING (true);

-- ── Seed languages ────────────────────────────────────────────────────────────

INSERT INTO public.app_languages (code, name, native_name, enabled, is_default, sort_order) VALUES
  ('en', 'English',    'English',    true,  true,  1),
  ('es', 'Spanish',    'Español',    true,  false, 2),
  ('pt', 'Portuguese', 'Português',  true,  false, 3),
  ('fr', 'French',     'Français',   false, false, 4),
  ('id', 'Indonesian', 'Bahasa Indonesia', false, false, 5),
  ('vi', 'Vietnamese', 'Tiếng Việt', false, false, 6),
  ('th', 'Thai',       'ภาษาไทย',    false, false, 7)
ON CONFLICT (code) DO NOTHING;

-- ── translations_cache_version: a simple settings key for cache busting ───────
-- We reuse the existing settings table if it exists, otherwise skip.
-- The frontend uses translations.updated_at max to detect staleness.
