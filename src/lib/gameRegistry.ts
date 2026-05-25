import { Skull, Dice6, Gem, Box, Footprints, Puzzle, TrendingUp, RotateCcw, Users, Zap, Trophy, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface GameDefinition {
  game_id: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  route: string;
  category: 'daily' | 'qualifier' | 'weekend' | 'special';
}

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  // ─── Core gate ───────────────────────────────
  daily_gate: {
    game_id: 'daily_gate',
    icon: Skull,
    color: 'text-torch-ember',
    bgClass: 'bg-moss-dark/30',
    route: '/',
    category: 'daily',
  },

  // ─── Daily microgames ────────────────────────
  daily_pick: {
    game_id: 'daily_pick',
    icon: Gem,
    color: 'text-torch-orange',
    bgClass: 'bg-torch-orange/10',
    route: '/games/pick',
    category: 'daily',
  },
  daily_safebox: {
    game_id: 'daily_safebox',
    icon: Box,
    color: 'text-gold-300',
    bgClass: 'bg-gold-500/10',
    route: '/games/safebox',
    category: 'daily',
  },
  daily_dice: {
    game_id: 'daily_dice',
    icon: Dice6,
    color: 'text-gold-300',
    bgClass: 'bg-gold-500/10',
    route: '/games/dice',
    category: 'daily',
  },
  daily_path: {
    game_id: 'daily_path',
    icon: Footprints,
    color: 'text-moss-light',
    bgClass: 'bg-moss-dark/30',
    route: '/games/path',
    category: 'daily',
  },
  daily_puzzle: {
    game_id: 'daily_puzzle',
    icon: Puzzle,
    color: 'text-bone-muted',
    bgClass: 'bg-moss-dark/20',
    route: '/games/puzzle',
    category: 'daily',
  },

  // ─── Meta games (coming soon) ─────────────────
  shake_the_streak: {
    game_id: 'shake_the_streak',
    icon: Zap,
    color: 'text-torch-ember',
    bgClass: 'bg-moss-dark/20',
    route: '/games/shake',
    category: 'special',
  },
  climb_the_streak: {
    game_id: 'climb_the_streak',
    icon: TrendingUp,
    color: 'text-gold-400',
    bgClass: 'bg-gold-500/10',
    route: '/games/climb',
    category: 'special',
  },
  multiplier_wheel: {
    game_id: 'multiplier_wheel',
    icon: RotateCcw,
    color: 'text-torch-orange',
    bgClass: 'bg-torch-orange/10',
    route: '/games/wheel',
    category: 'special',
  },
  last_survivor: {
    game_id: 'last_survivor',
    icon: Users,
    color: 'text-death-glow',
    bgClass: 'bg-death-dim/20',
    route: '/games/last-survivor',
    category: 'special',
  },

  // ─── Weekend events ───────────────────────────
  saturday_main_event: {
    game_id: 'saturday_main_event',
    icon: Trophy,
    color: 'text-gold-300',
    bgClass: 'bg-gold-500/10',
    route: '/weekend/saturday',
    category: 'weekend',
  },
  sunday_winners_event: {
    game_id: 'sunday_winners_event',
    icon: Crown,
    color: 'text-torch-ember',
    bgClass: 'bg-torch-orange/10',
    route: '/weekend/sunday',
    category: 'weekend',
  },
};

export function getGameDef(gameId: string): GameDefinition {
  return GAME_REGISTRY[gameId] ?? {
    game_id: gameId,
    icon: Skull,
    color: 'text-bone-dark',
    bgClass: 'bg-moss-dark/20',
    route: '/',
    category: 'daily',
  };
}

export const CATEGORY_LABELS: Record<string, string> = {
  daily: 'Daily',
  qualifier: 'Qualifier',
  weekend: 'Weekend',
  special: 'Special',
};
