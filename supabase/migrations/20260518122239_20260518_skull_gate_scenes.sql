/*
  # Skull Gate Scenes Table

  ## Summary
  Adds a `skull_gate_scenes` table for storing Skull Gate scene configurations
  managed via the admin Scene Editor. Supports a draft/publish workflow so that
  editors can iterate on scenes without affecting live gameplay.

  ## New Tables
  - `skull_gate_scenes`
    - `id`                   uuid PK
    - `slug`                 text UNIQUE NOT NULL — URL-safe identifier (e.g. "torch-trial")
    - `title`                text NOT NULL
    - `description`          text
    - `template_type`        text NOT NULL — from SkullGateTemplateType enum
    - `status`               text NOT NULL DEFAULT 'draft' — draft | published | archived
    - `enabled`              boolean NOT NULL DEFAULT false — live assignment flag
    - `weight`               integer NOT NULL DEFAULT 1 — selection weighting
    - `cooldown_days`        integer NOT NULL DEFAULT 0
    - `min_streak`           integer
    - `max_streak`           integer
    - `draft_config_json`    jsonb NOT NULL — working copy, edited by admin
    - `published_config_json` jsonb — only set after explicit Publish action
    - `created_at`           timestamptz DEFAULT now()
    - `updated_at`           timestamptz DEFAULT now()
    - `published_at`         timestamptz — set when published

  ## Security
  - RLS enabled; no public access
  - Service role (admin edge function) has full access
  - No player-facing policies — players never read from this table directly

  ## Seed
  - Torch Trial seeded idempotently via ON CONFLICT DO NOTHING on slug
  - enabled = false so it does not affect live gameplay until explicitly turned on

  ## Notes
  - `published_config_json` is NULL until first Publish; admin preview falls back to draft
  - Live gameplay integration is a future prompt task
  - updated_at is maintained by trigger
*/

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skull_gate_scenes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text        UNIQUE NOT NULL,
  title                 text        NOT NULL,
  description           text,
  template_type         text        NOT NULL DEFAULT 'choice_2',
  status                text        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'published', 'archived')),
  enabled               boolean     NOT NULL DEFAULT false,
  weight                integer     NOT NULL DEFAULT 1,
  cooldown_days         integer     NOT NULL DEFAULT 0,
  min_streak            integer,
  max_streak            integer,
  draft_config_json     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  published_config_json jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  published_at          timestamptz
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_skull_gate_scenes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skull_gate_scenes_updated_at ON skull_gate_scenes;
CREATE TRIGGER trg_skull_gate_scenes_updated_at
  BEFORE UPDATE ON skull_gate_scenes
  FOR EACH ROW EXECUTE FUNCTION update_skull_gate_scenes_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE skull_gate_scenes ENABLE ROW LEVEL SECURITY;

-- No player-facing policies. Admin edge function uses service role key which
-- bypasses RLS. If a future public read policy is needed for published configs,
-- it will be added as a separate migration.

-- ── Seed: Torch Trial ─────────────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug,
  title,
  description,
  template_type,
  status,
  enabled,
  weight,
  cooldown_days,
  min_streak,
  max_streak,
  draft_config_json,
  published_config_json,
  published_at
) VALUES (
  'torch-trial',
  'Torch Trial',
  'Choose the flame that calls to you. The gate answers.',
  'choice_2',
  'published',
  false,
  100,
  1,
  0,
  NULL,
  '{
    "id": "torch_trial",
    "slug": "torch-trial",
    "title": "Torch Trial",
    "description": "Choose the flame that calls to you. The gate answers.",
    "templateType": "choice_2",
    "status": "published",
    "enabled": false,
    "weight": 100,
    "cooldownDays": 1,
    "minStreak": 0,
    "maxStreak": null,
    "introText": "Choose the flame that calls to you.",
    "instructionText": "Select a torch, then light it.",
    "ctaText": "Light the Torch",
    "surviveText": "The gate opens. Your streak lives.",
    "failText": "The flame fades. The gate rejects you.",
    "cashoutText": "Collect Your Winnings",
    "layers": [
      {
        "id": "tt_bg", "name": "Background", "type": "image", "role": "background",
        "assetPath": "/assets/games/skull-gate/torch-trial/bg/torch_trial_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 0, "visible": true, "locked": true,
        "animationPreset": "none", "effectPreset": "none"
      },
      {
        "id": "tt_gate_frame", "name": "Gate Frame", "type": "image", "role": "gate_frame",
        "assetPath": "",
        "x": 10, "y": 5, "width": 80, "height": 75,
        "opacity": 1, "zIndex": 2, "visible": false, "locked": false,
        "animationPreset": "none", "effectPreset": "none"
      },
      {
        "id": "tt_door_left", "name": "Left Door", "type": "image", "role": "gate_door_left",
        "assetPath": "/assets/games/skull-gate/torch-trial/doors/torch_trial_left_door.png",
        "x": 2, "y": 8, "width": 46, "height": 68,
        "opacity": 1, "zIndex": 3, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none",
        "doorAnimation": {
          "preset": "slide_open", "trigger": "on_survive",
          "durationMs": 900, "delayMs": 250,
          "openTranslateX": -40, "openTranslateY": 0,
          "openRotation": -3, "openScale": 1, "openOpacity": 1,
          "easing": "cubic-bezier(0.22, 1, 0.36, 1)"
        }
      },
      {
        "id": "tt_door_right", "name": "Right Door", "type": "image", "role": "gate_door_right",
        "assetPath": "/assets/games/skull-gate/torch-trial/doors/torch_trial_right_door.png",
        "x": 52, "y": 8, "width": 46, "height": 68,
        "opacity": 1, "zIndex": 4, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none",
        "doorAnimation": {
          "preset": "slide_open", "trigger": "on_survive",
          "durationMs": 900, "delayMs": 250,
          "openTranslateX": 40, "openTranslateY": 0,
          "openRotation": 3, "openScale": 1, "openOpacity": 1,
          "easing": "cubic-bezier(0.22, 1, 0.36, 1)"
        }
      },
      {
        "id": "tt_inner_light", "name": "Inner Gate Light", "type": "effect", "role": "gate_inner_light",
        "assetPath": "",
        "x": 20, "y": 12, "width": 60, "height": 58,
        "opacity": 0, "zIndex": 5, "visible": true, "locked": false,
        "animationPreset": "inner_light_pulse", "effectPreset": "inner_light"
      },
      {
        "id": "tt_gate_glow", "name": "Gate Glow", "type": "effect", "role": "gate_glow",
        "assetPath": "",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.7, "zIndex": 6, "visible": true, "locked": false,
        "animationPreset": "pulse_glow", "effectPreset": "gate_glow"
      },
      {
        "id": "tt_choice_left", "name": "Left Torch", "type": "image", "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/torch-trial/choices/torch_trial_left_torch.png",
        "x": 5, "y": 22, "width": 35, "height": 52,
        "opacity": 1, "zIndex": 9, "visible": true, "locked": false,
        "animationPreset": "torch_flicker", "effectPreset": "none",
        "clickable": true, "clickAction": "select_choice", "choiceId": "left_torch",
        "effects": { "glow": true, "selectedGlow": true, "selectedScale": 1.06, "brightness": 0.92, "flicker": true }
      },
      {
        "id": "tt_choice_right", "name": "Right Torch", "type": "image", "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/torch-trial/choices/torch_trial_right_torch.png",
        "x": 60, "y": 22, "width": 35, "height": 52,
        "opacity": 1, "zIndex": 9, "visible": true, "locked": false,
        "animationPreset": "torch_flicker", "effectPreset": "none",
        "clickable": true, "clickAction": "select_choice", "choiceId": "right_torch",
        "effects": { "glow": true, "selectedGlow": true, "selectedScale": 1.06, "brightness": 0.92, "flicker": true }
      },
      {
        "id": "tt_flame_left", "name": "Left Torch Flame", "type": "effect", "role": "torch_flame",
        "assetPath": "/assets/games/skull-gate/torch-trial/flames/torch_trial_left_torch.png",
        "x": 5, "y": 15, "width": 35, "height": 28,
        "opacity": 0.82, "zIndex": 8, "visible": true, "locked": false,
        "animationPreset": "torch_flicker", "effectPreset": "torch_fire"
      },
      {
        "id": "tt_flame_right", "name": "Right Torch Flame", "type": "effect", "role": "torch_flame",
        "assetPath": "/assets/games/skull-gate/torch-trial/flames/torch_trial_right_torch.png",
        "x": 60, "y": 15, "width": 35, "height": 28,
        "opacity": 0.82, "zIndex": 8, "visible": true, "locked": false,
        "animationPreset": "torch_flicker", "effectPreset": "torch_fire"
      },
      {
        "id": "tt_atmosphere", "name": "Fog / Atmosphere", "type": "effect", "role": "atmosphere_effect",
        "assetPath": "",
        "x": 0, "y": 55, "width": 100, "height": 45,
        "opacity": 0.45, "zIndex": 7, "visible": true, "locked": false,
        "animationPreset": "fog_drift", "effectPreset": "fog"
      },
      {
        "id": "tt_particles", "name": "Fireflies", "type": "particle", "role": "particle_effect",
        "assetPath": "",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 10, "visible": true, "locked": true,
        "animationPreset": "firefly_random", "effectPreset": "fireflies"
      },
      {
        "id": "tt_foreground", "name": "Foreground", "type": "image", "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/torch-trial/foreground/torch_trial_foreground.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 11, "visible": true, "locked": true,
        "animationPreset": "none", "effectPreset": "none", "mobileSafeArea": false
      },
      {
        "id": "tt_instruction_text", "name": "Instruction Text", "type": "text", "role": "text",
        "x": 10, "y": 74, "width": 80, "height": 8,
        "opacity": 1, "zIndex": 20, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none", "mobileSafeArea": true
      },
      {
        "id": "tt_cta_button", "name": "CTA Button", "type": "button", "role": "button",
        "assetPath": "/assets/buttons/confirm_default.png",
        "text": "Light the Torch",
        "x": 5, "y": 84, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 21, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none", "mobileSafeArea": true,
        "clickAction": "cta"
      }
    ]
  }'::jsonb,
  '{
    "id": "torch_trial",
    "slug": "torch-trial",
    "title": "Torch Trial",
    "description": "Choose the flame that calls to you. The gate answers.",
    "templateType": "choice_2",
    "status": "published",
    "enabled": false,
    "weight": 100,
    "cooldownDays": 1,
    "minStreak": 0,
    "maxStreak": null,
    "introText": "Choose the flame that calls to you.",
    "instructionText": "Select a torch, then light it.",
    "ctaText": "Light the Torch",
    "surviveText": "The gate opens. Your streak lives.",
    "failText": "The flame fades. The gate rejects you.",
    "cashoutText": "Collect Your Winnings",
    "layers": [
      {
        "id": "tt_bg", "name": "Background", "type": "image", "role": "background",
        "assetPath": "/assets/games/skull-gate/torch-trial/bg/torch_trial_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 0, "visible": true, "locked": true,
        "animationPreset": "none", "effectPreset": "none"
      },
      {
        "id": "tt_door_left", "name": "Left Door", "type": "image", "role": "gate_door_left",
        "assetPath": "/assets/games/skull-gate/torch-trial/doors/torch_trial_left_door.png",
        "x": 2, "y": 8, "width": 46, "height": 68,
        "opacity": 1, "zIndex": 3, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none",
        "doorAnimation": {
          "preset": "slide_open", "trigger": "on_survive",
          "durationMs": 900, "delayMs": 250,
          "openTranslateX": -40, "openTranslateY": 0,
          "openRotation": -3, "openScale": 1, "openOpacity": 1,
          "easing": "cubic-bezier(0.22, 1, 0.36, 1)"
        }
      },
      {
        "id": "tt_door_right", "name": "Right Door", "type": "image", "role": "gate_door_right",
        "assetPath": "/assets/games/skull-gate/torch-trial/doors/torch_trial_right_door.png",
        "x": 52, "y": 8, "width": 46, "height": 68,
        "opacity": 1, "zIndex": 4, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none",
        "doorAnimation": {
          "preset": "slide_open", "trigger": "on_survive",
          "durationMs": 900, "delayMs": 250,
          "openTranslateX": 40, "openTranslateY": 0,
          "openRotation": 3, "openScale": 1, "openOpacity": 1,
          "easing": "cubic-bezier(0.22, 1, 0.36, 1)"
        }
      },
      {
        "id": "tt_choice_left", "name": "Left Torch", "type": "image", "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/torch-trial/choices/torch_trial_left_torch.png",
        "x": 5, "y": 22, "width": 35, "height": 52,
        "opacity": 1, "zIndex": 9, "visible": true, "locked": false,
        "animationPreset": "torch_flicker", "effectPreset": "none",
        "clickable": true, "clickAction": "select_choice", "choiceId": "left_torch",
        "effects": { "glow": true, "selectedGlow": true, "selectedScale": 1.06, "brightness": 0.92, "flicker": true }
      },
      {
        "id": "tt_choice_right", "name": "Right Torch", "type": "image", "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/torch-trial/choices/torch_trial_right_torch.png",
        "x": 60, "y": 22, "width": 35, "height": 52,
        "opacity": 1, "zIndex": 9, "visible": true, "locked": false,
        "animationPreset": "torch_flicker", "effectPreset": "none",
        "clickable": true, "clickAction": "select_choice", "choiceId": "right_torch",
        "effects": { "glow": true, "selectedGlow": true, "selectedScale": 1.06, "brightness": 0.92, "flicker": true }
      },
      {
        "id": "tt_foreground", "name": "Foreground", "type": "image", "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/torch-trial/foreground/torch_trial_foreground.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 11, "visible": true, "locked": true,
        "animationPreset": "none", "effectPreset": "none", "mobileSafeArea": false
      },
      {
        "id": "tt_instruction_text", "name": "Instruction Text", "type": "text", "role": "text",
        "x": 10, "y": 74, "width": 80, "height": 8,
        "opacity": 1, "zIndex": 20, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none", "mobileSafeArea": true
      },
      {
        "id": "tt_cta_button", "name": "CTA Button", "type": "button", "role": "button",
        "assetPath": "/assets/buttons/confirm_default.png",
        "text": "Light the Torch",
        "x": 5, "y": 84, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 21, "visible": true, "locked": false,
        "animationPreset": "none", "effectPreset": "none", "mobileSafeArea": true,
        "clickAction": "cta"
      }
    ]
  }'::jsonb,
  now()
)
ON CONFLICT (slug) DO NOTHING;
