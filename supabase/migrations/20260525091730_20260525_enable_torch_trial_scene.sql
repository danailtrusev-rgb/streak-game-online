/*
  # Enable Torch Trial Scene

  ## Summary
  The torch-trial scene was published but had enabled=false, which caused
  get_or_assign_skull_gate_scene() to always return no_eligible=true because
  the eligibility query requires enabled=true.

  This migration enables the scene so it can be assigned to players when
  USE_SCENE_BASED_SKULL_GATE (or DEV_FORCE_SCENE_BASED_SKULL_GATE_PREVIEW)
  is active.

  ## Changes
  - skull_gate_scenes: torch-trial → enabled = true

  ## Notes
  - The scene is still only active when the client feature flag is on
  - Live play is unaffected while USE_SCENE_BASED_SKULL_GATE = false
*/

UPDATE skull_gate_scenes
SET enabled = true
WHERE slug = 'torch-trial'
  AND status = 'published';
