// Skull Gate Static Scene Configs — established Prompt 18, revised Prompt 20
//
// This file is currently static config only. Live gameplay still uses the
// hardcoded SkullGateChallenge component (src/components/game/SkullGateChallenge.tsx).
//
// Future prompts will:
//   Prompt 21 — replace SkullGateChallenge render body with SkullGateSceneRenderer.
//   Prompt 22+ — allow editing and publishing these configs via Admin Skull Gate Builder.
//   Prompt 23+ — move published configs into config_json or a skull_gate_scenes DB table.
//
// Asset path notes:
//   - Torch Trial structured paths come from TORCH_TRIAL (assets.ts).
//   - doors/, choices/, flames/ sub-folders are the structured paths used here.
//   - objects/ folder paths (legacy) are NOT used in this config.
//   - Shared gate frame / glow / seal assets do not exist yet — those layers have
//     visible: false until assets are added.

import { TORCH_TRIAL, BUTTONS } from './assets';
import type { SkullGateSceneConfig, SceneLayer } from './types';

// ── Layer z-index constants ───────────────────────────────────────────────────
const Z = {
  background:   0,
  backplate:    1,
  gateFrame:    2,
  doorLeft:     3,
  doorRight:    4,
  innerLight:   5,
  gateGlow:     6,
  atmosphere:   7,
  flames:       8,
  choices:      9,
  particles:   10,
  foreground:  11,
  text:        20,
  button:      21,
} as const;

// ── Torch Trial layers ────────────────────────────────────────────────────────

const torchTrialLayers: SceneLayer[] = [
  // 1. Background image — full-cover, locked
  {
    id:              'tt_bg',
    name:            'Background',
    type:            'image',
    role:            'background',
    assetPath:       TORCH_TRIAL.bg,
    x:               0, y: 0, width: 100, height: 100,
    opacity:         1,
    zIndex:          Z.background,
    visible:         true,
    locked:          true,
    animationPreset: 'none',
    effectPreset:    'none',
  },

  // 2. Gate frame — no dedicated asset yet, hidden
  {
    id:              'tt_gate_frame',
    name:            'Gate Frame',
    type:            'image',
    role:            'gate_frame',
    assetPath:       '',
    x:               10, y: 5, width: 80, height: 75,
    opacity:         1,
    zIndex:          Z.gateFrame,
    visible:         false,
    locked:          false,
    animationPreset: 'none',
    effectPreset:    'none',
  },

  // 3. Left gate door — slide-opens on SURVIVE
  {
    id:              'tt_door_left',
    name:            'Left Door',
    type:            'image',
    role:            'gate_door_left',
    assetPath:       TORCH_TRIAL.doors.left,
    x:               2, y: 8, width: 46, height: 68,
    opacity:         1,
    zIndex:          Z.doorLeft,
    visible:         true,
    locked:          false,
    animationPreset: 'none',
    effectPreset:    'none',
    doorAnimation: {
      preset:         'slide_open',
      trigger:        'on_survive',
      durationMs:     900,
      delayMs:        250,
      openTranslateX: -40,
      openTranslateY: 0,
      openRotation:   -3,
      openScale:      1,
      openOpacity:    1,
      easing:         'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },

  // 4. Right gate door — slide-opens on SURVIVE
  {
    id:              'tt_door_right',
    name:            'Right Door',
    type:            'image',
    role:            'gate_door_right',
    assetPath:       TORCH_TRIAL.doors.right,
    x:               52, y: 8, width: 46, height: 68,
    opacity:         1,
    zIndex:          Z.doorRight,
    visible:         true,
    locked:          false,
    animationPreset: 'none',
    effectPreset:    'none',
    doorAnimation: {
      preset:         'slide_open',
      trigger:        'on_survive',
      durationMs:     900,
      delayMs:        250,
      openTranslateX: 40,
      openTranslateY: 0,
      openRotation:   3,
      openScale:      1,
      openOpacity:    1,
      easing:         'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },

  // 5. Inner gate light — brightens on SURVIVE (no asset yet, procedural)
  {
    id:              'tt_inner_light',
    name:            'Inner Gate Light',
    type:            'effect',
    role:            'gate_inner_light',
    assetPath:       '',
    x:               20, y: 12, width: 60, height: 58,
    opacity:         0,
    zIndex:          Z.innerLight,
    visible:         true,
    locked:          false,
    animationPreset: 'inner_light_pulse',
    effectPreset:    'inner_light',
  },

  // 6. Gate glow — shifts gold/red based on outcome (procedural)
  {
    id:              'tt_gate_glow',
    name:            'Gate Glow',
    type:            'effect',
    role:            'gate_glow',
    assetPath:       '',
    x:               0, y: 0, width: 100, height: 55,
    opacity:         0.7,
    zIndex:          Z.gateGlow,
    visible:         true,
    locked:          false,
    animationPreset: 'pulse_glow',
    effectPreset:    'gate_glow',
  },

  // 7. Left torch — clickable choice
  {
    id:              'tt_choice_left',
    name:            'Left Torch',
    type:            'image',
    role:            'choice_object',
    assetPath:       TORCH_TRIAL.choices.left,
    x:               5, y: 22, width: 35, height: 52,
    opacity:         1,
    zIndex:          Z.choices,
    visible:         true,
    locked:          false,
    animationPreset: 'torch_flicker',
    effectPreset:    'none',
    clickable:       true,
    clickAction:     'select_choice',
    choiceId:        'left_torch',
    effects: {
      glow:          true,
      selectedGlow:  true,
      selectedScale: 1.06,
      brightness:    0.92,
      flicker:       true,
    },
  },

  // 8. Right torch — clickable choice
  {
    id:              'tt_choice_right',
    name:            'Right Torch',
    type:            'image',
    role:            'choice_object',
    assetPath:       TORCH_TRIAL.choices.right,
    x:               60, y: 22, width: 35, height: 52,
    opacity:         1,
    zIndex:          Z.choices,
    visible:         true,
    locked:          false,
    animationPreset: 'torch_flicker',
    effectPreset:    'none',
    clickable:       true,
    clickAction:     'select_choice',
    choiceId:        'right_torch',
    effects: {
      glow:          true,
      selectedGlow:  true,
      selectedScale: 1.06,
      brightness:    0.92,
      flicker:       true,
    },
  },

  // 9. Left torch flame — renders on top of torch, image-based
  {
    id:              'tt_flame_left',
    name:            'Left Torch Flame',
    type:            'effect',
    role:            'torch_flame',
    assetPath:       TORCH_TRIAL.flames.left,
    x:               5, y: 15, width: 35, height: 28,
    opacity:         0.82,
    zIndex:          Z.flames,
    visible:         true,
    locked:          false,
    animationPreset: 'torch_flicker',
    effectPreset:    'torch_fire',
  },

  // 10. Right torch flame
  {
    id:              'tt_flame_right',
    name:            'Right Torch Flame',
    type:            'effect',
    role:            'torch_flame',
    assetPath:       TORCH_TRIAL.flames.right,
    x:               60, y: 15, width: 35, height: 28,
    opacity:         0.82,
    zIndex:          Z.flames,
    visible:         true,
    locked:          false,
    animationPreset: 'torch_flicker',
    effectPreset:    'torch_fire',
  },

  // 11. Atmosphere / fog — procedural CSS, no static image
  {
    id:              'tt_atmosphere',
    name:            'Fog / Atmosphere',
    type:            'effect',
    role:            'atmosphere_effect',
    assetPath:       '',
    x:               0, y: 55, width: 100, height: 45,
    opacity:         0.45,
    zIndex:          Z.atmosphere,
    visible:         true,
    locked:          false,
    animationPreset: 'fog_drift',
    effectPreset:    'fog',
  },

  // 12. Fireflies — procedural AmbientFireflies, no static image
  {
    id:              'tt_particles',
    name:            'Fireflies',
    type:            'particle',
    role:            'particle_effect',
    assetPath:       '',
    x:               0, y: 0, width: 100, height: 100,
    opacity:         1,
    zIndex:          Z.particles,
    visible:         true,
    locked:          true,
    animationPreset: 'firefly_random',
    effectPreset:    'fireflies',
  },

  // 13. Foreground decoration overlay — full-cover, on top of all gameplay layers
  {
    id:              'tt_foreground',
    name:            'Foreground',
    type:            'image',
    role:            'foreground_decoration',
    assetPath:       TORCH_TRIAL.foreground,
    x:               0, y: 0, width: 100, height: 100,
    opacity:         1,
    zIndex:          Z.foreground,
    visible:         true,
    locked:          true,
    animationPreset: 'none',
    effectPreset:    'none',
    mobileSafeArea:  false,
  },

  // 14. Instruction text — dynamic per phase, safe-area aware
  {
    id:              'tt_instruction_text',
    name:            'Instruction Text',
    type:            'text',
    role:            'text',
    // text is derived from scene phase in renderer; no static text here
    x:               10, y: 74, width: 80, height: 8,
    opacity:         1,
    zIndex:          Z.text,
    visible:         true,
    locked:          false,
    animationPreset: 'none',
    effectPreset:    'none',
    mobileSafeArea:  true,
  },

  // 15. CTA button — "Light the Torch" — visible only when a choice is selected
  {
    id:              'tt_cta_button',
    name:            'CTA Button',
    type:            'button',
    role:            'button',
    // Uses confirm image button assets from BUTTONS
    assetPath:       BUTTONS.confirm_default,
    text:            'Light the Torch',
    x:               5, y: 84, width: 90, height: 10,
    opacity:         1,
    zIndex:          Z.button,
    visible:         true,
    locked:          false,
    animationPreset: 'none',
    effectPreset:    'none',
    mobileSafeArea:  true,
    clickAction:     'cta',
  },
];

// ── Torch Trial Scene Config ──────────────────────────────────────────────────

export const TORCH_TRIAL_SCENE_CONFIG: SkullGateSceneConfig = {
  id:              'torch_trial',
  slug:            'torch-trial',
  title:           'Torch Trial',
  description:     'Choose the flame that calls to you. The gate answers.',
  templateType:    'choice_2',
  status:          'published',
  enabled:         true,
  weight:          100,
  cooldownDays:    1,
  minStreak:       0,
  maxStreak:       null,
  introText:       'Choose the flame that calls to you.',
  instructionText: 'Select a torch, then light it.',
  ctaText:         'Light the Torch',
  surviveText:     'The gate opens. Your streak lives.',
  failText:        'The flame fades. The gate rejects you.',
  cashoutText:     'Collect Your Winnings',
  layers:          torchTrialLayers,
  createdAt:       '2026-05-18T00:00:00.000Z',
  updatedAt:       '2026-05-18T00:00:00.000Z',
};

// ── Product mechanic → scene template type mapping ────────────────────────────
// Reference for scene authors and the Scene Editor template selector.
// Pick/SafeBox   → choice_2 (player picks one of two hidden options)
// Pick-3         → choice_3 (player picks one of three hidden options)
// Path           → choice_2 (player chooses left or right path)
// Roll / Dice    → ritual_roll (player initiates a dice/roll mechanic)
// Wheel / Spin   → spin_reveal (spinning wheel determines outcome)
// Ladder         → sequence_reveal or timed_tap (step-by-step progression)

export const MECHANIC_TEMPLATE_MAP: Record<string, string> = {
  pick:           'choice_2',
  safebox:        'choice_2',
  pick_3:         'choice_3',
  path:           'choice_2',
  roll:           'ritual_roll',
  dice:           'ritual_roll',
  wheel:          'spin_reveal',
  spin:           'spin_reveal',
  ladder:         'sequence_reveal',
  timed:          'timed_tap',
};


// Later: this array will be supplemented by scenes fetched from the DB.

export const DEFAULT_SKULL_GATE_SCENES: SkullGateSceneConfig[] = [
  TORCH_TRIAL_SCENE_CONFIG,
];
