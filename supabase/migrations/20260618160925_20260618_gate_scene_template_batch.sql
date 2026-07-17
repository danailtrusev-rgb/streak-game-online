-- ── Gate Scene Template Validation Batch ──────────────────────────────────────
--
-- Creates 8 new Gate Scenes, one per major templateType, for renderer validation.
-- All scenes are published (so they appear in editor/library) but enabled=false
-- (so they cannot be assigned to players until deliberately enabled).
--
-- Renderer support summary as of this migration:
--   FULL:    choice_2, choice_3 (layer-driven, validated, Torch Trial proven)
--   PARTIAL: ritual_roll (stored + displayed; no special roll animation in renderer)
--   TYPE ONLY (safe as disabled stubs): tap_reveal, hold_reveal, drag_to_target,
--             spin_reveal, swipe_reveal, sequence_reveal
--
-- Asset paths use placeholder convention:
--   /assets/games/skull-gate/{slug}/...
-- Missing images are silently hidden by the renderer (img onError handler).

-- ── 1. Three Skull Doors (choice_3) ──────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'three-skull-doors',
  'Three Skull Doors',
  'Three skull doors wait in silence. One carries fate, two carry ruin.',
  'choice_3',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "three-skull-doors",
    "slug": "three-skull-doors",
    "title": "Three Skull Doors",
    "description": "Three skull doors wait in silence. One carries fate, two carry ruin.",
    "templateType": "choice_3",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "Three skull doors wait in silence.",
    "instructionText": "Choose a door, then open your fate.",
    "ctaText": "Open the Door",
    "surviveText": "The chosen door opens. Your streak survives.",
    "failText": "The skull door locks shut. Your streak falls.",
    "layers": [
      {
        "id": "tsd_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/bg/three-skull-doors_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "tsd_door_left",
        "name": "Left Door",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/choices/three-skull-doors_left.png",
        "x": 5, "y": 28, "width": 28, "height": 42,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "left_door",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "tsd_door_center",
        "name": "Center Door",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/choices/three-skull-doors_center.png",
        "x": 36, "y": 25, "width": 28, "height": 46,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "center_door",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "tsd_door_right",
        "name": "Right Door",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/choices/three-skull-doors_right.png",
        "x": 67, "y": 28, "width": 28, "height": 42,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "right_door",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "tsd_foreground",
        "name": "Foreground",
        "type": "image",
        "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/foreground/three-skull-doors_foreground.png",
        "x": 0, "y": 70, "width": 100, "height": 30,
        "opacity": 0.9, "zIndex": 20, "visible": true
      },
      {
        "id": "tsd_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.6, "zIndex": 5, "visible": true
      },
      {
        "id": "tsd_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "tsd_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "Three skull doors wait in silence.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "tsd_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "three-skull-doors",
    "slug": "three-skull-doors",
    "title": "Three Skull Doors",
    "description": "Three skull doors wait in silence. One carries fate, two carry ruin.",
    "templateType": "choice_3",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "Three skull doors wait in silence.",
    "instructionText": "Choose a door, then open your fate.",
    "ctaText": "Open the Door",
    "surviveText": "The chosen door opens. Your streak survives.",
    "failText": "The skull door locks shut. Your streak falls.",
    "layers": [
      {
        "id": "tsd_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/bg/three-skull-doors_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "tsd_door_left",
        "name": "Left Door",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/choices/three-skull-doors_left.png",
        "x": 5, "y": 28, "width": 28, "height": 42,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "left_door",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "tsd_door_center",
        "name": "Center Door",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/choices/three-skull-doors_center.png",
        "x": 36, "y": 25, "width": 28, "height": 46,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "center_door",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "tsd_door_right",
        "name": "Right Door",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/choices/three-skull-doors_right.png",
        "x": 67, "y": 28, "width": 28, "height": 42,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "right_door",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "tsd_foreground",
        "name": "Foreground",
        "type": "image",
        "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/three-skull-doors/foreground/three-skull-doors_foreground.png",
        "x": 0, "y": 70, "width": 100, "height": 30,
        "opacity": 0.9, "zIndex": 20, "visible": true
      },
      {
        "id": "tsd_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.6, "zIndex": 5, "visible": true
      },
      {
        "id": "tsd_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "tsd_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "Three skull doors wait in silence.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "tsd_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 2. Ancient Seal (tap_reveal) ──────────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'ancient-seal',
  'Ancient Seal',
  'An ancient seal blocks the gate. Break it to know your fate.',
  'tap_reveal',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "ancient-seal",
    "slug": "ancient-seal",
    "title": "Ancient Seal",
    "description": "An ancient seal blocks the gate. Break it to know your fate.",
    "templateType": "tap_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "An ancient seal blocks the gate.",
    "instructionText": "Tap the seal to reveal your fate.",
    "ctaText": "Break the Seal",
    "surviveText": "The seal breaks open. Your streak survives.",
    "failText": "The seal burns cold. Your streak falls.",
    "layers": [
      {
        "id": "as_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/ancient-seal/bg/ancient-seal_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "as_seal",
        "name": "Seal",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/ancient-seal/objects/ancient-seal_main.png",
        "x": 20, "y": 25, "width": 60, "height": 50,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "seal",
        "effects": { "selectedScale": 1.04 }
      },
      {
        "id": "as_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.55, "zIndex": 5, "visible": true
      },
      {
        "id": "as_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "as_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "An ancient seal blocks the gate.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "as_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "ancient-seal",
    "slug": "ancient-seal",
    "title": "Ancient Seal",
    "description": "An ancient seal blocks the gate. Break it to know your fate.",
    "templateType": "tap_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "An ancient seal blocks the gate.",
    "instructionText": "Tap the seal to reveal your fate.",
    "ctaText": "Break the Seal",
    "surviveText": "The seal breaks open. Your streak survives.",
    "failText": "The seal burns cold. Your streak falls.",
    "layers": [
      {
        "id": "as_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/ancient-seal/bg/ancient-seal_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "as_seal",
        "name": "Seal",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/ancient-seal/objects/ancient-seal_main.png",
        "x": 20, "y": 25, "width": 60, "height": 50,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "seal",
        "effects": { "selectedScale": 1.04 }
      },
      {
        "id": "as_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.55, "zIndex": 5, "visible": true
      },
      {
        "id": "as_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "as_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "An ancient seal blocks the gate.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "as_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 3. Blood Moon Relic (hold_reveal) ────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'blood-moon-relic',
  'Blood Moon Relic',
  'A relic pulses under the blood moon. Hold it until it answers.',
  'hold_reveal',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "blood-moon-relic",
    "slug": "blood-moon-relic",
    "title": "Blood Moon Relic",
    "description": "A relic pulses under the blood moon. Hold it until it answers.",
    "templateType": "hold_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "A relic pulses under the blood moon.",
    "instructionText": "Hold the relic until it answers.",
    "ctaText": "Hold the Relic",
    "surviveText": "The relic accepts your touch. Your streak survives.",
    "failText": "The relic rejects you. Your streak falls.",
    "layers": [
      {
        "id": "bmr_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/blood-moon-relic/bg/blood-moon-relic_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "bmr_relic",
        "name": "Relic",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/blood-moon-relic/objects/blood-moon-relic_main.png",
        "x": 25, "y": 28, "width": 50, "height": 44,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "relic",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "bmr_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.6, "zIndex": 5, "visible": true
      },
      {
        "id": "bmr_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "bmr_fog",
        "name": "Fog",
        "type": "effect",
        "role": "atmosphere_effect",
        "x": 0, "y": 60, "width": 100, "height": 40,
        "opacity": 0.4, "zIndex": 8, "visible": true
      },
      {
        "id": "bmr_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "A relic pulses under the blood moon.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "bmr_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "blood-moon-relic",
    "slug": "blood-moon-relic",
    "title": "Blood Moon Relic",
    "description": "A relic pulses under the blood moon. Hold it until it answers.",
    "templateType": "hold_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "A relic pulses under the blood moon.",
    "instructionText": "Hold the relic until it answers.",
    "ctaText": "Hold the Relic",
    "surviveText": "The relic accepts your touch. Your streak survives.",
    "failText": "The relic rejects you. Your streak falls.",
    "layers": [
      {
        "id": "bmr_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/blood-moon-relic/bg/blood-moon-relic_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "bmr_relic",
        "name": "Relic",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/blood-moon-relic/objects/blood-moon-relic_main.png",
        "x": 25, "y": 28, "width": 50, "height": 44,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "relic",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "bmr_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.6, "zIndex": 5, "visible": true
      },
      {
        "id": "bmr_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "bmr_fog",
        "name": "Fog",
        "type": "effect",
        "role": "atmosphere_effect",
        "x": 0, "y": 60, "width": 100, "height": 40,
        "opacity": 0.4, "zIndex": 8, "visible": true
      },
      {
        "id": "bmr_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "A relic pulses under the blood moon.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "bmr_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 4. Relic Offering (drag_to_target) ────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'relic-offering',
  'Relic Offering',
  'The altar demands an offering. Drag the relic to complete the ritual.',
  'drag_to_target',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "relic-offering",
    "slug": "relic-offering",
    "title": "Relic Offering",
    "description": "The altar demands an offering. Drag the relic to complete the ritual.",
    "templateType": "drag_to_target",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "The altar demands an offering.",
    "instructionText": "Drag the relic to the altar.",
    "ctaText": "Offer the Relic",
    "surviveText": "The altar awakens. Your streak survives.",
    "failText": "The altar crumbles. Your streak falls.",
    "layers": [
      {
        "id": "ro_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/relic-offering/bg/relic-offering_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "ro_relic",
        "name": "Relic (draggable)",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/relic-offering/objects/relic-offering_main.png",
        "x": 35, "y": 55, "width": 30, "height": 28,
        "opacity": 1, "zIndex": 15, "visible": true,
        "clickable": true,
        "choiceId": "relic",
        "effects": { "selectedScale": 1.08 }
      },
      {
        "id": "ro_altar",
        "name": "Altar (target)",
        "type": "image",
        "role": "gate_frame",
        "assetPath": "/assets/games/skull-gate/relic-offering/objects/relic-offering_main.png",
        "x": 30, "y": 25, "width": 40, "height": 30,
        "opacity": 0.8, "zIndex": 8, "visible": true
      },
      {
        "id": "ro_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.55, "zIndex": 5, "visible": true
      },
      {
        "id": "ro_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "ro_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "The altar demands an offering.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "ro_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "relic-offering",
    "slug": "relic-offering",
    "title": "Relic Offering",
    "description": "The altar demands an offering. Drag the relic to complete the ritual.",
    "templateType": "drag_to_target",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "The altar demands an offering.",
    "instructionText": "Drag the relic to the altar.",
    "ctaText": "Offer the Relic",
    "surviveText": "The altar awakens. Your streak survives.",
    "failText": "The altar crumbles. Your streak falls.",
    "layers": [
      {
        "id": "ro_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/relic-offering/bg/relic-offering_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "ro_relic",
        "name": "Relic (draggable)",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/relic-offering/objects/relic-offering_main.png",
        "x": 35, "y": 55, "width": 30, "height": 28,
        "opacity": 1, "zIndex": 15, "visible": true,
        "clickable": true,
        "choiceId": "relic",
        "effects": { "selectedScale": 1.08 }
      },
      {
        "id": "ro_altar",
        "name": "Altar (target)",
        "type": "image",
        "role": "gate_frame",
        "assetPath": "/assets/games/skull-gate/relic-offering/objects/relic-offering_main.png",
        "x": 30, "y": 25, "width": 40, "height": 30,
        "opacity": 0.8, "zIndex": 8, "visible": true
      },
      {
        "id": "ro_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.55, "zIndex": 5, "visible": true
      },
      {
        "id": "ro_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "ro_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "The altar demands an offering.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "ro_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 5. Bone Dice Gate (ritual_roll) ───────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'bone-dice-gate',
  'Bone Dice Gate',
  'The bones are ready to roll. Your fate spins with them.',
  'ritual_roll',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "bone-dice-gate",
    "slug": "bone-dice-gate",
    "title": "Bone Dice Gate",
    "description": "The bones are ready to roll. Your fate spins with them.",
    "templateType": "ritual_roll",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "The bones are ready to roll.",
    "instructionText": "Roll the bones and face the gate.",
    "ctaText": "Roll the Bones",
    "surviveText": "The bones land in your favor. Your streak survives.",
    "failText": "The bones turn against you. Your streak falls.",
    "layers": [
      {
        "id": "bdg_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/bone-dice-gate/bg/bone-dice-gate_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "bdg_dice",
        "name": "Bone Dice",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/bone-dice-gate/objects/bone-dice-gate_main.png",
        "x": 30, "y": 30, "width": 40, "height": 38,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "bone_dice",
        "animationPreset": "torch_flicker",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "bdg_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.65, "zIndex": 5, "visible": true
      },
      {
        "id": "bdg_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "bdg_fog",
        "name": "Fog",
        "type": "effect",
        "role": "atmosphere_effect",
        "x": 0, "y": 65, "width": 100, "height": 35,
        "opacity": 0.35, "zIndex": 8, "visible": true
      },
      {
        "id": "bdg_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "The bones are ready to roll.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "bdg_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "bone-dice-gate",
    "slug": "bone-dice-gate",
    "title": "Bone Dice Gate",
    "description": "The bones are ready to roll. Your fate spins with them.",
    "templateType": "ritual_roll",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "The bones are ready to roll.",
    "instructionText": "Roll the bones and face the gate.",
    "ctaText": "Roll the Bones",
    "surviveText": "The bones land in your favor. Your streak survives.",
    "failText": "The bones turn against you. Your streak falls.",
    "layers": [
      {
        "id": "bdg_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/bone-dice-gate/bg/bone-dice-gate_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "bdg_dice",
        "name": "Bone Dice",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/bone-dice-gate/objects/bone-dice-gate_main.png",
        "x": 30, "y": 30, "width": 40, "height": 38,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "bone_dice",
        "animationPreset": "torch_flicker",
        "effects": { "selectedScale": 1.06 }
      },
      {
        "id": "bdg_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.65, "zIndex": 5, "visible": true
      },
      {
        "id": "bdg_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "bdg_fog",
        "name": "Fog",
        "type": "effect",
        "role": "atmosphere_effect",
        "x": 0, "y": 65, "width": 100, "height": 35,
        "opacity": 0.35, "zIndex": 8, "visible": true
      },
      {
        "id": "bdg_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "The bones are ready to roll.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "bdg_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 6. Fate Compass (spin_reveal) ─────────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'fate-compass',
  'Fate Compass',
  'The compass spins between life and ruin. Your path is hidden until it stops.',
  'spin_reveal',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "fate-compass",
    "slug": "fate-compass",
    "title": "Fate Compass",
    "description": "The compass spins between life and ruin. Your path is hidden until it stops.",
    "templateType": "spin_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "The compass spins between life and ruin.",
    "instructionText": "Spin the compass to reveal your path.",
    "ctaText": "Spin the Compass",
    "surviveText": "The compass points forward. Your streak survives.",
    "failText": "The compass points into darkness. Your streak falls.",
    "layers": [
      {
        "id": "fc_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/fate-compass/bg/fate-compass_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "fc_compass",
        "name": "Compass",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/fate-compass/objects/fate-compass_main.png",
        "x": 20, "y": 25, "width": 60, "height": 50,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "compass",
        "effects": { "selectedScale": 1.04 }
      },
      {
        "id": "fc_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.55, "zIndex": 5, "visible": true
      },
      {
        "id": "fc_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "fc_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "The compass spins between life and ruin.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "fc_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "fate-compass",
    "slug": "fate-compass",
    "title": "Fate Compass",
    "description": "The compass spins between life and ruin. Your path is hidden until it stops.",
    "templateType": "spin_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "The compass spins between life and ruin.",
    "instructionText": "Spin the compass to reveal your path.",
    "ctaText": "Spin the Compass",
    "surviveText": "The compass points forward. Your streak survives.",
    "failText": "The compass points into darkness. Your streak falls.",
    "layers": [
      {
        "id": "fc_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/fate-compass/bg/fate-compass_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "fc_compass",
        "name": "Compass",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/fate-compass/objects/fate-compass_main.png",
        "x": 20, "y": 25, "width": 60, "height": 50,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "compass",
        "effects": { "selectedScale": 1.04 }
      },
      {
        "id": "fc_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.55, "zIndex": 5, "visible": true
      },
      {
        "id": "fc_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "fc_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "The compass spins between life and ruin.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "fc_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 7. Rope Bridge (swipe_reveal) ─────────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'rope-bridge',
  'Rope Bridge',
  'A broken rope bridge crosses the abyss. One step forward is all it takes.',
  'swipe_reveal',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "rope-bridge",
    "slug": "rope-bridge",
    "title": "Rope Bridge",
    "description": "A broken rope bridge crosses the abyss. One step forward is all it takes.",
    "templateType": "swipe_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "A broken rope bridge crosses the abyss.",
    "instructionText": "Swipe forward to cross.",
    "ctaText": "Cross the Bridge",
    "surviveText": "The bridge holds. Your streak survives.",
    "failText": "The bridge snaps. Your streak falls.",
    "layers": [
      {
        "id": "rb_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/rope-bridge/bg/rope-bridge_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "rb_bridge",
        "name": "Bridge",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/rope-bridge/objects/rope-bridge_main.png",
        "x": 10, "y": 35, "width": 80, "height": 30,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "bridge",
        "effects": { "selectedScale": 1.03 }
      },
      {
        "id": "rb_foreground",
        "name": "Foreground",
        "type": "image",
        "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/rope-bridge/foreground/rope-bridge_foreground.png",
        "x": 0, "y": 75, "width": 100, "height": 25,
        "opacity": 0.85, "zIndex": 20, "visible": true
      },
      {
        "id": "rb_fog",
        "name": "Fog",
        "type": "effect",
        "role": "atmosphere_effect",
        "x": 0, "y": 55, "width": 100, "height": 45,
        "opacity": 0.5, "zIndex": 8, "visible": true
      },
      {
        "id": "rb_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.5, "zIndex": 5, "visible": true
      },
      {
        "id": "rb_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "rb_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "A broken rope bridge crosses the abyss.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "rb_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "rope-bridge",
    "slug": "rope-bridge",
    "title": "Rope Bridge",
    "description": "A broken rope bridge crosses the abyss. One step forward is all it takes.",
    "templateType": "swipe_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "A broken rope bridge crosses the abyss.",
    "instructionText": "Swipe forward to cross.",
    "ctaText": "Cross the Bridge",
    "surviveText": "The bridge holds. Your streak survives.",
    "failText": "The bridge snaps. Your streak falls.",
    "layers": [
      {
        "id": "rb_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/rope-bridge/bg/rope-bridge_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "rb_bridge",
        "name": "Bridge",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/rope-bridge/objects/rope-bridge_main.png",
        "x": 10, "y": 35, "width": 80, "height": 30,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "bridge",
        "effects": { "selectedScale": 1.03 }
      },
      {
        "id": "rb_foreground",
        "name": "Foreground",
        "type": "image",
        "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/rope-bridge/foreground/rope-bridge_foreground.png",
        "x": 0, "y": 75, "width": 100, "height": 25,
        "opacity": 0.85, "zIndex": 20, "visible": true
      },
      {
        "id": "rb_fog",
        "name": "Fog",
        "type": "effect",
        "role": "atmosphere_effect",
        "x": 0, "y": 55, "width": 100, "height": 45,
        "opacity": 0.5, "zIndex": 8, "visible": true
      },
      {
        "id": "rb_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.5, "zIndex": 5, "visible": true
      },
      {
        "id": "rb_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "rb_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "A broken rope bridge crosses the abyss.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "rb_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── 8. Temple Steps (sequence_reveal) ────────────────────────────────────────

INSERT INTO skull_gate_scenes (
  slug, title, description, template_type, status, enabled, weight,
  cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, published_at
) VALUES (
  'temple-steps',
  'Temple Steps',
  'Ancient steps rise toward the gate. Follow them in order or fall.',
  'sequence_reveal',
  'published',
  false,
  50,
  1,
  null,
  null,
  '{
    "id": "temple-steps",
    "slug": "temple-steps",
    "title": "Temple Steps",
    "description": "Ancient steps rise toward the gate. Follow them in order or fall.",
    "templateType": "sequence_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "Ancient steps rise toward the gate.",
    "instructionText": "Follow the steps in order.",
    "ctaText": "Climb the Steps",
    "surviveText": "The steps carry you upward. Your streak survives.",
    "failText": "The steps collapse beneath you. Your streak falls.",
    "layers": [
      {
        "id": "ts_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/temple-steps/bg/temple-steps_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "ts_step1",
        "name": "Step 1",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/temple-steps/choices/temple-steps_left.png",
        "x": 10, "y": 65, "width": 25, "height": 20,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "step_1",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "ts_step2",
        "name": "Step 2",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/temple-steps/choices/temple-steps_center.png",
        "x": 37, "y": 50, "width": 26, "height": 20,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "step_2",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "ts_step3",
        "name": "Step 3",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/temple-steps/choices/temple-steps_right.png",
        "x": 65, "y": 35, "width": 25, "height": 20,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "step_3",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "ts_foreground",
        "name": "Foreground",
        "type": "image",
        "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/temple-steps/foreground/temple-steps_foreground.png",
        "x": 0, "y": 78, "width": 100, "height": 22,
        "opacity": 0.9, "zIndex": 20, "visible": true
      },
      {
        "id": "ts_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.6, "zIndex": 5, "visible": true
      },
      {
        "id": "ts_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "ts_inner_light",
        "name": "Inner Light",
        "type": "effect",
        "role": "gate_inner_light",
        "x": 20, "y": 12, "width": 60, "height": 55,
        "opacity": 0.65, "zIndex": 6, "visible": true
      },
      {
        "id": "ts_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "Ancient steps rise toward the gate.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "ts_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  '{
    "id": "temple-steps",
    "slug": "temple-steps",
    "title": "Temple Steps",
    "description": "Ancient steps rise toward the gate. Follow them in order or fall.",
    "templateType": "sequence_reveal",
    "status": "published",
    "enabled": false,
    "weight": 50,
    "cooldownDays": 1,
    "introText": "Ancient steps rise toward the gate.",
    "instructionText": "Follow the steps in order.",
    "ctaText": "Climb the Steps",
    "surviveText": "The steps carry you upward. Your streak survives.",
    "failText": "The steps collapse beneath you. Your streak falls.",
    "layers": [
      {
        "id": "ts_bg",
        "name": "Background",
        "type": "image",
        "role": "background",
        "assetPath": "/assets/games/skull-gate/temple-steps/bg/temple-steps_bg.png",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 1, "visible": true
      },
      {
        "id": "ts_step1",
        "name": "Step 1",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/temple-steps/choices/temple-steps_left.png",
        "x": 10, "y": 65, "width": 25, "height": 20,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "step_1",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "ts_step2",
        "name": "Step 2",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/temple-steps/choices/temple-steps_center.png",
        "x": 37, "y": 50, "width": 26, "height": 20,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "step_2",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "ts_step3",
        "name": "Step 3",
        "type": "image",
        "role": "choice_object",
        "assetPath": "/assets/games/skull-gate/temple-steps/choices/temple-steps_right.png",
        "x": 65, "y": 35, "width": 25, "height": 20,
        "opacity": 1, "zIndex": 10, "visible": true,
        "clickable": true,
        "choiceId": "step_3",
        "effects": { "selectedScale": 1.05 }
      },
      {
        "id": "ts_foreground",
        "name": "Foreground",
        "type": "image",
        "role": "foreground_decoration",
        "assetPath": "/assets/games/skull-gate/temple-steps/foreground/temple-steps_foreground.png",
        "x": 0, "y": 78, "width": 100, "height": 22,
        "opacity": 0.9, "zIndex": 20, "visible": true
      },
      {
        "id": "ts_glow",
        "name": "Gate Glow",
        "type": "effect",
        "role": "gate_glow",
        "x": 0, "y": 0, "width": 100, "height": 55,
        "opacity": 0.6, "zIndex": 5, "visible": true
      },
      {
        "id": "ts_particles",
        "name": "Fireflies",
        "type": "effect",
        "role": "particle_effect",
        "x": 0, "y": 0, "width": 100, "height": 100,
        "opacity": 1, "zIndex": 25, "visible": true
      },
      {
        "id": "ts_inner_light",
        "name": "Inner Light",
        "type": "effect",
        "role": "gate_inner_light",
        "x": 20, "y": 12, "width": 60, "height": 55,
        "opacity": 0.65, "zIndex": 6, "visible": true
      },
      {
        "id": "ts_intro",
        "name": "Intro Text",
        "type": "text",
        "role": "text",
        "text": "Ancient steps rise toward the gate.",
        "x": 5, "y": 8, "width": 90, "height": 10,
        "opacity": 1, "zIndex": 30, "visible": true
      },
      {
        "id": "ts_cta",
        "name": "CTA Button",
        "type": "button",
        "role": "button",
        "clickAction": "cta",
        "x": 5, "y": 84, "width": 90,
        "opacity": 1, "zIndex": 35, "visible": true
      }
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;
