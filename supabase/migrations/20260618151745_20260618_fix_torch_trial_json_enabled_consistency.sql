-- Fix: torch-trial JSON blobs had enabled=false while table column enabled=true.
-- Assignment uses table columns only; JSON enabled is cosmetic but should not contradict.
-- Also ensures templateType is consistent across both blobs.

UPDATE skull_gate_scenes
SET
  draft_config_json = jsonb_set(
    jsonb_set(draft_config_json, '{enabled}', 'true'::jsonb),
    '{templateType}', '"choice_2"'::jsonb
  ),
  published_config_json = jsonb_set(
    jsonb_set(published_config_json, '{enabled}', 'true'::jsonb),
    '{templateType}', '"choice_2"'::jsonb
  )
WHERE slug = 'torch-trial';
