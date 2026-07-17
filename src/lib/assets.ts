// ── Base paths ─────────────────────────────────────────────────────────────

const A    = '/assets';
const IC   = `${A}/icons`;
const BTN  = `${A}/buttons`;
const PROP = `${A}/props`;
const BG   = `${A}/bg`;
const UI   = `${A}/ui`;
const BDGE = `${A}/badges`;

// Game-specific roots
const G_DICE      = `${A}/games/dice-of-faith`;
const G_RELICS    = `${A}/games/hidden-relics`;
const G_CROSS     = `${A}/games/crossroads`;
const G_SAFE      = `${A}/games/safebox`;
const G_GLYPH     = `${A}/games/glyph-gate`;
const G_SKULL     = `${A}/games/skull-gate`;
const G_SKULL_SH  = `${G_SKULL}/shared`;
const G_SKULL_TT  = `${G_SKULL}/torch-trial`;

// Legacy root (kept for backward compatibility while original files remain)
const GAME = `${A}/games`;

// ── Global icons ────────────────────────────────────────────────────────────

export const ICONS = {
  skull:        `${IC}/skull.png`,
  flame:        `${IC}/fire.png`,
  trophy:       `${IC}/trophy.png`,
  crown:        `${IC}/crown.png`,
  wallet:       `${IC}/wallet.png`,
  gamepad:      `${IC}/gamepad.png`,
  settings:     `${IC}/settings.png`,
  gem:          `${IC}/gem.png`,
  zap:          `${IC}/zap.png`,
  lock:         `${IC}/lock.png`,
  star:         `${IC}/star.png`,
  shield:       `${IC}/shield.png`,
  scroll:       `${IC}/scroll.png`,
  check_circle: `${IC}/check_circle.png`,
  arrow_up:     `${IC}/arrow_up.png`,
  arrow_down:   `${IC}/arrow_down.png`,
  sparkles:     `${IC}/sparkles.png`,
  refresh:      `${IC}/refresh.png`,
  coin:         `${IC}/coin.png`,
  user:         `${IC}/user.png`,
  back:         `${IC}/back.png`,
  filter:       `${IC}/filter.png`,
  info:         `${IC}/info.png`,
  bell:         `${IC}/bell.png`,
  help:         `${IC}/help.png`,
  ban:          `${IC}/ban.png`,
  search:       `${IC}/search.png`,
  puzzle:       `${IC}/puzzle.png`,
  dice:         `${IC}/dice.png`,
  calendar:     `${IC}/calendar.png`,
  image_icon:   `${IC}/image_icon.png`,
  close:        `${IC}/close.png`,
  arrow_left:   `${IC}/arrow_left.png`,
} as const;

// ── Buttons ─────────────────────────────────────────────────────────────────

export const BUTTONS = {
  play_default:    `${BTN}/play_default.png`,
  play_hover:      `${BTN}/play_hover.png`,
  play_pressed:    `${BTN}/play_pressed.png`,

  cashout_default: `${BTN}/cashout_default.png`,
  cashout_hover:   `${BTN}/cashout_hover.png`,
  cashout_pressed: `${BTN}/cashout_pressed.png`,

  confirm_default: `${BTN}/confirm_default.png`,
  confirm_hover:   `${BTN}/confirm_hover.png`,
  confirm_pressed: `${BTN}/confirm_pressed.png`,

  back_default:    `${BTN}/back_default.png`,
  back_hover:      `${BTN}/back_hover.png`,
  back_pressed:    `${BTN}/back_pressed.png`,

  return_default:  `${BTN}/return_default.png`,
  return_hover:    `${BTN}/return_hover.png`,
  return_pressed:  `${BTN}/return_pressed.png`,

  enter_default:   `${BTN}/enter_default.png`,
  enter_hover:     `${BTN}/enter_hover.png`,
  enter_pressed:   `${BTN}/enter_pressed.png`,

  topup_default:   `${BTN}/topup_default.png`,
  topup_hover:     `${BTN}/topup_hover.png`,
  topup_pressed:   `${BTN}/topup_pressed.png`,

  roll_default:    `${BTN}/roll_default.png`,
  roll_hover:      `${BTN}/roll_hover.png`,
  roll_pressed:    `${BTN}/roll_pressed.png`,

  submit_default:  `${BTN}/submit_default.png`,
  submit_hover:    `${BTN}/submit_hover.png`,
  submit_pressed:  `${BTN}/submit_pressed.png`,
} as const;

// ── Props ────────────────────────────────────────────────────────────────────

export const PROPS = {
  skull_main:       `${PROP}/skull_main.png`,
  skull_idle:       `${PROP}/skull_idle.png`,
  skull_won:        `${PROP}/skull_won.png`,
  skull_lost:       `${PROP}/skull_lost.png`,
  skull_gate_icon:  `${PROP}/skull_gate_icon.png`,
  torch_left:       `${PROP}/torch_left.png`,
  torch_right:      `${PROP}/torch_right.png`,
  chest:            `${PROP}/chest.png`,
  crown_prop:       `${PROP}/crown_prop.png`,
  trophy_prop:      `${PROP}/trophy_prop.png`,
  scroll_prop:      `${PROP}/scroll_prop.png`,
} as const;

// ── Backgrounds ──────────────────────────────────────────────────────────────

export const BACKGROUNDS = {
  gate_home:    `${BG}/jungle_gate_home.jpg`,
  inner_jungle: `${BG}/inner_jungle.jpg`,
  ritual_floor: `${BG}/ritual_floor.jpg`,
  saturday:     `${BG}/saturday.jpg`,
  sunday:       `${BG}/sunday.jpg`,
} as const;

// ── UI chrome ─────────────────────────────────────────────────────────────────

export const UI_ASSETS = {
  nav_bg:          `${UI}/nav_bg.png`,
  hud_bg:          `${UI}/hud_bg.png`,
  card_frame:      `${UI}/card_frame.png`,
  modal_frame:     `${UI}/modal_frame.png`,
  progress_track:  `${UI}/progress_track.png`,
  progress_fill:   `${UI}/progress_fill.png`,
  divider_ornate:  `${UI}/divider_ornate.png`,
  badge_gold:      `${UI}/badge_gold.png`,
  badge_bronze:    `${UI}/badge_bronze.png`,
  tile_frame:      `${UI}/tile_frame.png`,
  stake_frame:     `${UI}/stake_frame.png`,
  leaderboard_row: `${UI}/leaderboard_row.png`,
  winner_badge:    `${UI}/winner_badge.png`,
} as const;

// ── Badges ────────────────────────────────────────────────────────────────────

export const BADGE_ASSETS = {
  first_ember:     `${BDGE}/badge_first_ember.png`,
  skull_gate:      `${BDGE}/badge_skull_gate.png`,
  jade_idol:       `${BDGE}/badge_jade_idol.png`,
  scarab_relic:    `${BDGE}/badge_scarab_relic.png`,
  serpent_stone:   `${BDGE}/badge_serpent_stone.png`,
  firefly_oath:    `${BDGE}/badge_firefly_oath.png`,
  jungle_sigil:    `${BDGE}/badge_jungle_sigil.png`,
  eternal_gate:    `${BDGE}/badge_eternal_gate.png`,
  crown_of_gate:   `${BDGE}/badge_crown_of_the_gate.png`,
} as const;

// ── Grouped game assets ───────────────────────────────────────────────────────

export const GAME_ASSETS = {
  // ── Legacy flat keys — kept for backward compatibility ───────────────────
  // These resolve to the original /assets/games/ location which still exists.
  // New code should use the grouped sub-objects below.
  dice_face_1: `${GAME}/dice_face_1.png`,
  dice_face_2: `${GAME}/dice_face_2.png`,
  dice_face_3: `${GAME}/dice_face_3.png`,
  dice_face_4: `${GAME}/dice_face_4.png`,
  dice_face_5: `${GAME}/dice_face_5.png`,
  dice_face_6: `${GAME}/dice_face_6.png`,
  pick_vessel:  `${GAME}/pick_vessel.png`,
  pick_blade:   `${GAME}/pick_blade.png`,
  pick_orb:     `${GAME}/pick_orb.png`,
  pick_wand:    `${GAME}/pick_wand.png`,
  pick_hidden:  `${GAME}/pick_hidden.png`,
  pick_correct: `${GAME}/pick_correct.png`,
  pick_wrong:   `${GAME}/pick_wrong.png`,

  // ── Dice of Faith ─────────────────────────────────────────────────────────
  diceOfFaith: {
    dice: {
      face_1: `${G_DICE}/dice/dice_face_1.png`,
      face_2: `${G_DICE}/dice/dice_face_2.png`,
      face_3: `${G_DICE}/dice/dice_face_3.png`,
      face_4: `${G_DICE}/dice/dice_face_4.png`,
      face_5: `${G_DICE}/dice/dice_face_5.png`,
      face_6: `${G_DICE}/dice/dice_face_6.png`,
    },
    ui: {} as Record<string, string>,
  },

  // ── Hidden Relics (Pick game) ─────────────────────────────────────────────
  hiddenRelics: {
    items: {
      vessel:  `${G_RELICS}/items/pick_vessel.png`,
      blade:   `${G_RELICS}/items/pick_blade.png`,
      orb:     `${G_RELICS}/items/pick_orb.png`,
      wand:    `${G_RELICS}/items/pick_wand.png`,
      hidden:  `${G_RELICS}/items/pick_hidden.png`,
      correct: `${G_RELICS}/items/pick_correct.png`,
      wrong:   `${G_RELICS}/items/pick_wrong.png`,
    },
    ui: {} as Record<string, string>,
  },

  // ── Crossroads ────────────────────────────────────────────────────────────
  crossroads: {
    ui: {} as Record<string, string>,
  },

  // ── Safe Box ──────────────────────────────────────────────────────────────
  safebox: {
    ui: {} as Record<string, string>,
  },

  // ── Glyph Gate ────────────────────────────────────────────────────────────
  glyphGate: {
    // Tiles: normal / partial (close) / correct
    tiles: {
      normal_01:  `${G_GLYPH}/tiles/glyph_tile_normal_01.png`,
      normal_02:  `${G_GLYPH}/tiles/glyph_tile_normal_02.png`,
      normal_03:  `${G_GLYPH}/tiles/glyph_tile_normal_03.png`,
      normal_04:  `${G_GLYPH}/tiles/glyph_tile_normal_04.png`,
      normal_05:  `${G_GLYPH}/tiles/glyph_tile_normal_05.png`,
      partial_01: `${G_GLYPH}/tiles/glyph_tile_partial_01.png`,
      partial_02: `${G_GLYPH}/tiles/glyph_tile_partial_02.png`,
      partial_03: `${G_GLYPH}/tiles/glyph_tile_partial_03.png`,
      partial_04: `${G_GLYPH}/tiles/glyph_tile_partial_04.png`,
      partial_05: `${G_GLYPH}/tiles/glyph_tile_partial_05.png`,
      correct_01: `${G_GLYPH}/tiles/glyph_tile_correct_01.png`,
      correct_02: `${G_GLYPH}/tiles/glyph_tile_correct_02.png`,
      correct_03: `${G_GLYPH}/tiles/glyph_tile_correct_03.png`,
      correct_04: `${G_GLYPH}/tiles/glyph_tile_correct_04.png`,
      correct_05: `${G_GLYPH}/tiles/glyph_tile_correct_05.png`,
    },
    bg:      {} as Record<string, string>,
    effects: {} as Record<string, string>,
    ui:      {} as Record<string, string>,
  },

  // ── Skull Gate ────────────────────────────────────────────────────────────
  skullGate: {
    // Shared assets used across all skull-gate challenge types
    shared: {
      sourcePlates: {} as Record<string, string>,
      backgrounds:  {} as Record<string, string>,
      backplates:   {} as Record<string, string>,
      gateFrames:   {} as Record<string, string>,
      gateDoors:    {} as Record<string, string>,
      overlays:     {} as Record<string, string>,
      icons:        {} as Record<string, string>,
      buttons:      {} as Record<string, string>,
      particles:    {} as Record<string, string>,
      frames:       {} as Record<string, string>,
      result:       {} as Record<string, string>,
      foreground:   {} as Record<string, string>,
      effects:      {} as Record<string, string>,
    },
    // Torch Trial sub-game
    torchTrial: {
      // Current live assets (originals in objects/ folder)
      bg:          `${G_SKULL_TT}/bg/torch_trial_bg.png`,
      foreground:  `${G_SKULL_TT}/foreground/torch_trial_foreground.png`,
      leftDoor:    `${G_SKULL_TT}/objects/torch_trial_left_door.png`,
      rightDoor:   `${G_SKULL_TT}/objects/torch_trial_right_door.png`,
      leftTorch:   `${G_SKULL_TT}/objects/torch_trial_left_torch.png`,
      rightTorch:  `${G_SKULL_TT}/objects/torch_trial_right_torch.png`,
      // Structured folder mirrors (populated as more assets are added)
      sourcePlates: {} as Record<string, string>,
      backplates:   {} as Record<string, string>,
      gate:         {} as Record<string, string>,
      doors: {
        left:  `${G_SKULL_TT}/doors/torch_trial_left_door.png`,
        right: `${G_SKULL_TT}/doors/torch_trial_right_door.png`,
      },
      choices: {
        left:  `${G_SKULL_TT}/choices/torch_trial_left_torch.png`,
        right: `${G_SKULL_TT}/choices/torch_trial_right_torch.png`,
      },
      flames: {
        left:  `${G_SKULL_TT}/flames/torch_trial_left_torch.png`,
        right: `${G_SKULL_TT}/flames/torch_trial_right_torch.png`,
      },
      effects:    {} as Record<string, string>,
      ui:         {} as Record<string, string>,
    },
  },
} as const;

// ── Convenience re-exports for common game assets ──────────────────────────
// These keep existing call sites working without changes.

/** Dice face image array indexed 0–5 (value 1–6) */
export const DICE_FACES = [
  GAME_ASSETS.diceOfFaith.dice.face_1,
  GAME_ASSETS.diceOfFaith.dice.face_2,
  GAME_ASSETS.diceOfFaith.dice.face_3,
  GAME_ASSETS.diceOfFaith.dice.face_4,
  GAME_ASSETS.diceOfFaith.dice.face_5,
  GAME_ASSETS.diceOfFaith.dice.face_6,
] as const;

/** All 15 glyph tile paths (5 normal + 5 partial + 5 correct) */
export const GLYPH_TILES = GAME_ASSETS.glyphGate.tiles;

/** Skull Gate Torch Trial current live paths */
export const TORCH_TRIAL = GAME_ASSETS.skullGate.torchTrial;
