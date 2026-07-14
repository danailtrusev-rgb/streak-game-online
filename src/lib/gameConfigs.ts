import { BACKGROUNDS, PROPS } from './assets';
import type { GameEngineConfig } from './types';

/**
 * Config-driven game definitions.
 * All game logic and layout is derived from these configs —
 * no game-specific hardcoding in page components.
 */
export const GAME_CONFIGS: Record<string, GameEngineConfig> = {

  daily_pick: {
    game_id: 'daily_pick',
    type: 'pick',
    background: BACKGROUNDS.inner_jungle,
    instruction_text: 'One relic holds the power. Pick wisely — you get one chance per day.',
    win_text: 'The relic reveals its power. You survive.',
    lose_text: 'The relic was elsewhere. Come back tomorrow.',
    winChance: '1 in 4',
    zones: [
      { id: 0, label: 'I',   x: 4,  y: 6,  width: 44, height: 40, iconSize: 72, fallbackEmoji: '🏺', hiddenImage: PROPS.chest, revealImage: PROPS.scroll_prop },
      { id: 1, label: 'II',  x: 52, y: 6,  width: 44, height: 40, iconSize: 72, fallbackEmoji: '🗡️', hiddenImage: PROPS.chest, revealImage: PROPS.scroll_prop },
      { id: 2, label: 'III', x: 4,  y: 52, width: 44, height: 40, iconSize: 72, fallbackEmoji: '🔮', hiddenImage: PROPS.chest, revealImage: PROPS.scroll_prop },
      { id: 3, label: 'IV',  x: 52, y: 52, width: 44, height: 40, iconSize: 72, fallbackEmoji: '🪄', hiddenImage: PROPS.chest, revealImage: PROPS.scroll_prop },
    ],
  },

  daily_safebox: {
    game_id: 'daily_safebox',
    type: 'safebox',
    background: BACKGROUNDS.ritual_floor,
    instruction_text: 'One safe holds the treasure. The others are empty. Choose your safe.',
    win_text: 'The safe opens. Gold gleams within.',
    lose_text: 'Empty. The treasure lies elsewhere.',
    winChance: '1 in 4',
    zones: [
      { id: 0, label: 'I',   x: 4,  y: 8,  width: 44, height: 38, iconSize: 72, fallbackEmoji: '🔒', hiddenImage: PROPS.chest, revealImage: PROPS.trophy_prop },
      { id: 1, label: 'II',  x: 52, y: 8,  width: 44, height: 38, iconSize: 72, fallbackEmoji: '🔒', hiddenImage: PROPS.chest, revealImage: PROPS.trophy_prop },
      { id: 2, label: 'III', x: 4,  y: 54, width: 44, height: 38, iconSize: 72, fallbackEmoji: '🔒', hiddenImage: PROPS.chest, revealImage: PROPS.trophy_prop },
      { id: 3, label: 'IV',  x: 52, y: 54, width: 44, height: 38, iconSize: 72, fallbackEmoji: '🔒', hiddenImage: PROPS.chest, revealImage: PROPS.trophy_prop },
    ],
  },

  daily_dice: {
    game_id: 'daily_dice',
    type: 'dice',
    background: BACKGROUNDS.gate_home,
    instruction_text: 'Roll the dice. Land on 4, 5, or 6 to win.',
    win_text: 'Fortune smiles. A high roll today.',
    lose_text: 'The dice fell low. Try again tomorrow.',
    winChance: '1 in 2',
    zones: [
      { id: 0, label: 'Roll', x: 25, y: 35, width: 50, height: 30, fallbackEmoji: '🎲' },
    ],
  },

  daily_path: {
    game_id: 'daily_path',
    type: 'path',
    background: BACKGROUNDS.inner_jungle,
    instruction_text: 'Two paths lie before you. Only one leads forward.',
    win_text: 'You chose wisely. The path opens.',
    lose_text: 'A dead end. The other path was true.',
    winChance: '1 in 2',
    zones: [
      { id: 0, label: 'Left',  x: 2,  y: 20, width: 47, height: 60, iconSize: 100, fallbackEmoji: '←', hiddenImage: PROPS.torch_left },
      { id: 1, label: 'Right', x: 51, y: 20, width: 47, height: 60, iconSize: 100, fallbackEmoji: '→', hiddenImage: PROPS.torch_right },
    ],
  },

};

export function getGameConfig(gameId: string): GameEngineConfig | null {
  return GAME_CONFIGS[gameId] ?? null;
}
