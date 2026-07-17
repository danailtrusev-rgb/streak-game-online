// Pure post-result reminder-prompt cooldown logic. No React, no
// localStorage directly — takes an injectable storage so it's testable
// (see scripts/verify-notification-eligibility.ts) and usable by
// ResultReminderPrompt.tsx against the real browser localStorage.

export interface PromptStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function promptStorageKey(promptVersion: number): string {
  return `sts_reminder_prompt_dismissed_v${promptVersion}`;
}

export interface DismissalRecord {
  dismissedAt: number;
  version: number;
}

/**
 * True when the prompt was dismissed within the cooldown window, for the
 * SAME prompt version — a record from an old version never suppresses
 * the current prompt (bumping the version is the deliberate way to reset
 * the cooldown after a copy/behavior change).
 */
export function isWithinCooldown(
  store: PromptStore,
  promptVersion: number,
  cooldownMs: number,
  now: number = Date.now(),
): boolean {
  const raw = store.get(promptStorageKey(promptVersion));
  if (!raw) return false;
  let record: DismissalRecord;
  try {
    record = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!record || record.version !== promptVersion || typeof record.dismissedAt !== 'number') return false;
  return now - record.dismissedAt < cooldownMs;
}

export function recordDismissal(store: PromptStore, promptVersion: number, now: number = Date.now()): void {
  store.set(promptStorageKey(promptVersion), JSON.stringify({ dismissedAt: now, version: promptVersion }));
}

/**
 * Full gating decision for whether the prompt should render at all.
 * Mirrors ResultReminderPrompt.tsx's actual condition list exactly —
 * kept here so it's independently testable; the component imports and
 * uses this directly (not a duplicate).
 */
export function shouldShowReminderPrompt(input: {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  isCashoutOpen: boolean;
  resultSettled: boolean;
  store: PromptStore;
  promptVersion: number;
  cooldownMs: number;
  now?: number;
}): boolean {
  if (!input.supported) return false;
  if (input.permission === 'denied') return false;
  if (input.subscribed) return false;
  if (input.isCashoutOpen) return false;
  if (!input.resultSettled) return false;
  if (isWithinCooldown(input.store, input.promptVersion, input.cooldownMs, input.now)) return false;
  return true;
}
