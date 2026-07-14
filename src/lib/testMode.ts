import pilotLevels from '../config/pilotLevels.json';

export interface PilotLevel {
  id: number;
  name: string;
  bg_video: string;
  objective_text: string;
  choices: {
    left: string;
    right: string;
  };
}

export interface TestModeConfig {
  active: boolean;
  levelId: number | null;
  level: PilotLevel | null;
  invalid: boolean;
}

export function parseTestMode(): TestModeConfig {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('test_level');

  if (raw === null) {
    return { active: false, levelId: null, level: null, invalid: false };
  }

  const levelId = parseInt(raw, 10);

  if (isNaN(levelId)) {
    return { active: true, levelId: null, level: null, invalid: true };
  }

  const level = (pilotLevels.levels as PilotLevel[]).find((l) => l.id === levelId) ?? null;

  return {
    active: true,
    levelId,
    level,
    invalid: level === null,
  };
}

export function resolveChoiceImages(basePath: string): {
  default: string;
  hover: string;
  pressed: string;
} {
  return {
    default: `${basePath}_default.png`,
    hover: `${basePath}_hover.png`,
    pressed: `${basePath}_pressed.png`,
  };
}

export const allLevels: PilotLevel[] = pilotLevels.levels as PilotLevel[];
