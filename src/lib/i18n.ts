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

/**
 * Static English strings used as fallback before the DB fetch completes.
 * Prevents raw keys like "common.loading" appearing during initial render.
 */
export const STATIC_FALLBACKS: Record<string, string> = {
  'common.loading':     'Loading…',
  'common.please_wait': 'Please wait…',
  'common.error':       'Something went wrong.',
  'common.retry':       'Try again',
  'common.back':        'Back',
  'common.cancel':      'Cancel',
  'common.save':        'Save',
  'common.close':       'Close',
  'common.continue':    'Continue',
  'common.confirm':     'Confirm',
  'common.done':        'Done',
  'common.next':        'Next',
  'common.skip':        'Skip',
  'game.leave_confirm':      'Leave game?',
  'game.leave_confirm_desc': 'Your progress will not be saved.',
  'game.leave_action':       'Leave',
  // Result screen — confirmed missing from every translations migration
  // (only 'result.next_gate' was actually seeded; these seven were not,
  // under any key name, in any language). Without this fallback they
  // rendered as raw keys in production. See PROJECT_CHANGELOG.md →
  // "Result Messaging Phase 1 — Audit and Hardening".
  'result.view_streak_path':   'View Streak Path',
  'result.milestone_reached':  'Milestone Reached',
  'result.milestone_conquered': 'Conquered',
  'result.survived.cashout':      'Cash Out €{amount}',
  'result.survived.cashing_out':  'Collecting…',
  'result.survived.day_badge': 'Survived',
  'result.died.games_nudge':   'While you wait, the daily games are still open.',
  // /pot page — also confirmed missing from every migration (found while
  // auditing "all new and existing cashout labels" for Cashout Experience
  // Phase 2). The ConfirmModal-only keys these replaced
  // (pot.cashout_confirm_title, pot.moves_to_wallet, pot.streak_reset_warning,
  // pot.collecting, pot.confirm_cashout, pot.keep_streak, pot.collected_label,
  // pot.collected_desc, pot.back_to_home) are no longer called anywhere —
  // that UI was replaced by the shared CashoutFlow component, which uses
  // code-based copy (src/lib/cashoutMessages.ts), not t().
  'pot.grows_desc':   'Your pot is growing — cash out anytime to secure it.',
  'pot.empty_desc':   'Survive a trial to start building your pot.',
  'pot.current_pot':  'Current Pot',
  'pot.how_it_works': 'How It Works',
  'pot.grows_title':  'Grows with your streak',
  'pot.grows_body':   'Each successful day adds to your pot.',
  'pot.cashout_anytime_title': 'Cash out anytime',
  'pot.cashout_anytime_body':  'Secure your value whenever you choose.',
  'pot.resets_title': 'Cashing out resets your streak',
  'pot.resets_body':  'Your streak returns to Day 1 after cashing out.',
  'pot.cashout_streak_warn': 'Cashing out ends your current streak.',
  'pot.face_the_gate': 'Face the Gate',
};
