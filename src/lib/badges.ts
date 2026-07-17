import type { BadgeDef, BadgeKey, StreakBadgeKey, PrestigeBadgeKey } from './types';

const B = '/assets/badges';

// ── Badge definitions ─────────────────────────────────────────────────────────

export const STREAK_BADGES: BadgeDef[] = [
  {
    key:        'streak_1',
    name:       'First Ember',
    lore:       'The first spark. The gate acknowledged your presence.',
    asset:      `${B}/badge_first_ember.png`,
    milestone:  1,
    isPrestige: false,
  },
  {
    key:        'streak_3',
    name:       'Jungle Sigil',
    lore:       'Three survivals. The jungle begins to remember your face.',
    asset:      `${B}/badge_jungle_sigil.png`,
    milestone:  3,
    isPrestige: false,
  },
  {
    key:        'streak_7',
    name:       'Scarab Relic',
    lore:       'Seven gates survived. Ancient forces take notice.',
    asset:      `${B}/badge_scarab_relic.png`,
    milestone:  7,
    isPrestige: false,
  },
  {
    key:        'streak_14',
    name:       'Serpent Stone',
    lore:       'Fourteen days. The serpent knows your name.',
    asset:      `${B}/badge_serpent_stone.png`,
    milestone:  14,
    isPrestige: false,
  },
  {
    key:        'streak_30',
    name:       'Skull Gate Survivor',
    lore:       'Thirty gates. You have earned the skull\'s respect. A full cycle conquered.',
    asset:      `${B}/badge_skull_gate.png`,
    milestone:  30,
    isPrestige: false,
  },
];

export const PRESTIGE_BADGES: BadgeDef[] = [
  {
    key:        'prestige_cycle_1',
    name:       'Jade Idol',
    lore:       'One completed cycle. The idol watches over you.',
    asset:      `${B}/badge_jade_idol.png`,
    milestone:  1,
    isPrestige: true,
  },
  {
    key:        'prestige_cycle_2',
    name:       'Firefly Oath',
    lore:       'Two full cycles. The jungle spirits have bound themselves to you.',
    asset:      `${B}/badge_firefly_oath.png`,
    milestone:  2,
    isPrestige: true,
  },
  {
    key:        'prestige_cycle_3',
    name:       'Sun Moth',
    lore:       'Three cycles. You burn as bright as the jungle sun.',
    asset:      `${B}/badge_skull_gate.png`,
    milestone:  3,
    isPrestige: true,
  },
  {
    key:        'prestige_cycle_4',
    name:       'Crown of the Gate',
    lore:       'Four cycles completed. The gate crowns no higher.',
    asset:      `${B}/badge_crown_of_the_gate.png`,
    milestone:  4,
    isPrestige: true,
  },
  {
    key:        'prestige_cycle_5',
    name:       'Eternal Gate',
    lore:       'Five full cycles. The eternal flame burns in your honor.',
    asset:      `${B}/badge_eternal_gate.png`,
    milestone:  5,
    isPrestige: true,
  },
];

export const ALL_BADGES: BadgeDef[] = [...STREAK_BADGES, ...PRESTIGE_BADGES];

export function getBadgeDef(key: BadgeKey): BadgeDef | undefined {
  return ALL_BADGES.find((b) => b.key === key);
}

// ── Derive which badges are unlocked purely from streak state ─────────────────
// Used client-side when DB data isn't available yet (optimistic display).

export function getUnlockedStreakKeys(streak: number): StreakBadgeKey[] {
  return STREAK_BADGES
    .filter((b) => streak >= b.milestone)
    .map((b) => b.key as StreakBadgeKey);
}

export function getUnlockedPrestigeKeys(completedCycles: number): PrestigeBadgeKey[] {
  return PRESTIGE_BADGES
    .filter((b) => completedCycles >= b.milestone)
    .map((b) => b.key as PrestigeBadgeKey);
}

// ── Next badge a player is working toward ────────────────────────────────────

export function nextStreakBadge(streak: number): BadgeDef | null {
  return STREAK_BADGES.find((b) => streak < b.milestone) ?? null;
}

export function nextPrestigeBadge(completedCycles: number): BadgeDef | null {
  return PRESTIGE_BADGES.find((b) => completedCycles < b.milestone) ?? null;
}
