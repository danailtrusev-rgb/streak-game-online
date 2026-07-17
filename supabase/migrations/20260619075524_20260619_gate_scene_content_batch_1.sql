-- ── Gate Scene Content Batch 1 ──────────────────────────────────────────────
-- 10 new Gate Scenes using fully-supported templates: choice_2, choice_3, tap_reveal.
-- All scenes: status=published, enabled=false.
-- Placeholder asset paths used throughout (renderer silently hides missing images).

-- ── CHOICE_2: Twin Relics ─────────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'twin-relics','Twin Relics','Two relics wait in the dark. Only one holds safe power.',
  'choice_2','published',false,50,1,null,null,
  '{
    "id":"twin-relics","slug":"twin-relics","title":"Twin Relics",
    "description":"Two relics wait in the dark. Only one holds safe power.",
    "templateType":"choice_2","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Two relics wait in the dark.",
    "instructionText":"Choose a relic, then awaken it.",
    "ctaText":"Awaken the Relic",
    "surviveText":"The relic hums with life. Your streak survives.",
    "failText":"The relic cracks. The gate rejects you.",
    "layers":[
      {"id":"tr_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/twin-relics/bg/twin-relics_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tr_left","name":"Left Relic","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/twin-relics/choices/twin-relics_left.png","x":5,"y":28,"width":40,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_relic","effects":{"selectedScale":1.06}},
      {"id":"tr_right","name":"Right Relic","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/twin-relics/choices/twin-relics_right.png","x":55,"y":28,"width":40,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_relic","effects":{"selectedScale":1.06}},
      {"id":"tr_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/twin-relics/foreground/twin-relics_foreground.png","x":0,"y":70,"width":100,"height":30,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"tr_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"tr_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tr_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":60,"width":100,"height":40,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"tr_text","name":"Intro Text","type":"text","role":"text","text":"Two relics wait in the dark.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tr_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Awaken the Relic","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"twin-relics","slug":"twin-relics","title":"Twin Relics",
    "description":"Two relics wait in the dark. Only one holds safe power.",
    "templateType":"choice_2","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Two relics wait in the dark.",
    "instructionText":"Choose a relic, then awaken it.",
    "ctaText":"Awaken the Relic",
    "surviveText":"The relic hums with life. Your streak survives.",
    "failText":"The relic cracks. The gate rejects you.",
    "layers":[
      {"id":"tr_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/twin-relics/bg/twin-relics_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tr_left","name":"Left Relic","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/twin-relics/choices/twin-relics_left.png","x":5,"y":28,"width":40,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_relic","effects":{"selectedScale":1.06}},
      {"id":"tr_right","name":"Right Relic","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/twin-relics/choices/twin-relics_right.png","x":55,"y":28,"width":40,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_relic","effects":{"selectedScale":1.06}},
      {"id":"tr_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/twin-relics/foreground/twin-relics_foreground.png","x":0,"y":70,"width":100,"height":30,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"tr_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"tr_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tr_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":60,"width":100,"height":40,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"tr_text","name":"Intro Text","type":"text","role":"text","text":"Two relics wait in the dark.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tr_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Awaken the Relic","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── CHOICE_2: River Crossing ─────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'river-crossing','River Crossing','Two crossings cut through the river mist. Choose your path.',
  'choice_2','published',false,50,1,null,null,
  '{
    "id":"river-crossing","slug":"river-crossing","title":"River Crossing",
    "description":"Two crossings cut through the river mist. Choose your path.",
    "templateType":"choice_2","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Two crossings cut through the river mist.",
    "instructionText":"Choose a crossing, then step forward.",
    "ctaText":"Cross the River",
    "surviveText":"The river lets you pass. Your streak survives.",
    "failText":"The current pulls you under. The gate rejects you.",
    "layers":[
      {"id":"rc_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/river-crossing/bg/river-crossing_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"rc_left","name":"Left Crossing","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/river-crossing/choices/river-crossing_left.png","x":5,"y":30,"width":38,"height":42,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_crossing","effects":{"selectedScale":1.06}},
      {"id":"rc_right","name":"Right Crossing","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/river-crossing/choices/river-crossing_right.png","x":57,"y":30,"width":38,"height":42,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_crossing","effects":{"selectedScale":1.06}},
      {"id":"rc_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/river-crossing/foreground/river-crossing_foreground.png","x":0,"y":72,"width":100,"height":28,"opacity":0.85,"zIndex":20,"visible":true},
      {"id":"rc_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.55,"zIndex":5,"visible":true},
      {"id":"rc_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"rc_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":55,"width":100,"height":45,"opacity":0.5,"zIndex":8,"visible":true},
      {"id":"rc_text","name":"Intro Text","type":"text","role":"text","text":"Two crossings cut through the river mist.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"rc_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Cross the River","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"river-crossing","slug":"river-crossing","title":"River Crossing",
    "description":"Two crossings cut through the river mist. Choose your path.",
    "templateType":"choice_2","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Two crossings cut through the river mist.",
    "instructionText":"Choose a crossing, then step forward.",
    "ctaText":"Cross the River",
    "surviveText":"The river lets you pass. Your streak survives.",
    "failText":"The current pulls you under. The gate rejects you.",
    "layers":[
      {"id":"rc_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/river-crossing/bg/river-crossing_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"rc_left","name":"Left Crossing","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/river-crossing/choices/river-crossing_left.png","x":5,"y":30,"width":38,"height":42,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_crossing","effects":{"selectedScale":1.06}},
      {"id":"rc_right","name":"Right Crossing","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/river-crossing/choices/river-crossing_right.png","x":57,"y":30,"width":38,"height":42,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_crossing","effects":{"selectedScale":1.06}},
      {"id":"rc_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/river-crossing/foreground/river-crossing_foreground.png","x":0,"y":72,"width":100,"height":28,"opacity":0.85,"zIndex":20,"visible":true},
      {"id":"rc_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.55,"zIndex":5,"visible":true},
      {"id":"rc_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"rc_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":55,"width":100,"height":45,"opacity":0.5,"zIndex":8,"visible":true},
      {"id":"rc_text","name":"Intro Text","type":"text","role":"text","text":"Two crossings cut through the river mist.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"rc_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Cross the River","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── CHOICE_2: Serpent Flames ─────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'serpent-flames','Serpent Flames','Two serpent flames coil before the gate. Choose the one that does not consume you.',
  'choice_2','published',false,50,1,null,null,
  '{
    "id":"serpent-flames","slug":"serpent-flames","title":"Serpent Flames",
    "description":"Two serpent flames coil before the gate. Choose the one that does not consume you.",
    "templateType":"choice_2","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Two serpent flames coil before the gate.",
    "instructionText":"Choose a flame, then summon its power.",
    "ctaText":"Summon the Flame",
    "surviveText":"The serpent flame rises. Your streak survives.",
    "failText":"The serpent flame strikes back. The gate rejects you.",
    "layers":[
      {"id":"sf_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/serpent-flames/bg/serpent-flames_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"sf_left","name":"Left Flame","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/serpent-flames/choices/serpent-flames_left.png","x":5,"y":20,"width":38,"height":55,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_flame","effects":{"selectedScale":1.06}},
      {"id":"sf_right","name":"Right Flame","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/serpent-flames/choices/serpent-flames_right.png","x":57,"y":20,"width":38,"height":55,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_flame","effects":{"selectedScale":1.06}},
      {"id":"sf_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/serpent-flames/foreground/serpent-flames_foreground.png","x":0,"y":72,"width":100,"height":28,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"sf_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.65,"zIndex":5,"visible":true},
      {"id":"sf_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"sf_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.6,"zIndex":6,"visible":true},
      {"id":"sf_text","name":"Intro Text","type":"text","role":"text","text":"Two serpent flames coil before the gate.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"sf_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Summon the Flame","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"serpent-flames","slug":"serpent-flames","title":"Serpent Flames",
    "description":"Two serpent flames coil before the gate. Choose the one that does not consume you.",
    "templateType":"choice_2","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Two serpent flames coil before the gate.",
    "instructionText":"Choose a flame, then summon its power.",
    "ctaText":"Summon the Flame",
    "surviveText":"The serpent flame rises. Your streak survives.",
    "failText":"The serpent flame strikes back. The gate rejects you.",
    "layers":[
      {"id":"sf_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/serpent-flames/bg/serpent-flames_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"sf_left","name":"Left Flame","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/serpent-flames/choices/serpent-flames_left.png","x":5,"y":20,"width":38,"height":55,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_flame","effects":{"selectedScale":1.06}},
      {"id":"sf_right","name":"Right Flame","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/serpent-flames/choices/serpent-flames_right.png","x":57,"y":20,"width":38,"height":55,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_flame","effects":{"selectedScale":1.06}},
      {"id":"sf_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/serpent-flames/foreground/serpent-flames_foreground.png","x":0,"y":72,"width":100,"height":28,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"sf_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.65,"zIndex":5,"visible":true},
      {"id":"sf_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"sf_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.6,"zIndex":6,"visible":true},
      {"id":"sf_text","name":"Intro Text","type":"text","role":"text","text":"Two serpent flames coil before the gate.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"sf_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Summon the Flame","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── CHOICE_3: Three Temple Masks ─────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'three-temple-masks','Three Temple Masks','Three masks watch from the temple wall. One holds your path forward.',
  'choice_3','published',false,50,1,null,null,
  '{
    "id":"three-temple-masks","slug":"three-temple-masks","title":"Three Temple Masks",
    "description":"Three masks watch from the temple wall. One holds your path forward.",
    "templateType":"choice_3","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Three masks watch from the temple wall.",
    "instructionText":"Choose a mask, then reveal its spirit.",
    "ctaText":"Reveal the Mask",
    "surviveText":"The mask smiles. Your streak survives.",
    "failText":"The mask cracks. Your streak falls.",
    "layers":[
      {"id":"ttm_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/three-temple-masks/bg/three-temple-masks_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"ttm_left","name":"Left Mask","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-temple-masks/choices/three-temple-masks_left.png","x":3,"y":25,"width":28,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_mask","effects":{"selectedScale":1.06}},
      {"id":"ttm_center","name":"Center Mask","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-temple-masks/choices/three-temple-masks_center.png","x":36,"y":22,"width":28,"height":48,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"center_mask","effects":{"selectedScale":1.06}},
      {"id":"ttm_right","name":"Right Mask","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-temple-masks/choices/three-temple-masks_right.png","x":69,"y":25,"width":28,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_mask","effects":{"selectedScale":1.06}},
      {"id":"ttm_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/three-temple-masks/foreground/three-temple-masks_foreground.png","x":0,"y":70,"width":100,"height":30,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"ttm_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"ttm_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"ttm_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":62,"width":100,"height":38,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"ttm_text","name":"Intro Text","type":"text","role":"text","text":"Three masks watch from the temple wall.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"ttm_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Reveal the Mask","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"three-temple-masks","slug":"three-temple-masks","title":"Three Temple Masks",
    "description":"Three masks watch from the temple wall. One holds your path forward.",
    "templateType":"choice_3","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Three masks watch from the temple wall.",
    "instructionText":"Choose a mask, then reveal its spirit.",
    "ctaText":"Reveal the Mask",
    "surviveText":"The mask smiles. Your streak survives.",
    "failText":"The mask cracks. Your streak falls.",
    "layers":[
      {"id":"ttm_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/three-temple-masks/bg/three-temple-masks_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"ttm_left","name":"Left Mask","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-temple-masks/choices/three-temple-masks_left.png","x":3,"y":25,"width":28,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_mask","effects":{"selectedScale":1.06}},
      {"id":"ttm_center","name":"Center Mask","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-temple-masks/choices/three-temple-masks_center.png","x":36,"y":22,"width":28,"height":48,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"center_mask","effects":{"selectedScale":1.06}},
      {"id":"ttm_right","name":"Right Mask","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-temple-masks/choices/three-temple-masks_right.png","x":69,"y":25,"width":28,"height":44,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_mask","effects":{"selectedScale":1.06}},
      {"id":"ttm_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/three-temple-masks/foreground/three-temple-masks_foreground.png","x":0,"y":70,"width":100,"height":30,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"ttm_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"ttm_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"ttm_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":62,"width":100,"height":38,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"ttm_text","name":"Intro Text","type":"text","role":"text","text":"Three masks watch from the temple wall.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"ttm_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Reveal the Mask","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── CHOICE_3: Three Jungle Crates ────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'three-jungle-crates','Three Jungle Crates','Three jungle crates sit beneath the vines. Only one is safe.',
  'choice_3','published',false,50,1,null,null,
  '{
    "id":"three-jungle-crates","slug":"three-jungle-crates","title":"Three Jungle Crates",
    "description":"Three jungle crates sit beneath the vines. Only one is safe.",
    "templateType":"choice_3","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Three jungle crates sit beneath the vines.",
    "instructionText":"Choose a crate, then open it.",
    "ctaText":"Open the Crate",
    "surviveText":"The crate holds safe treasure. Your streak survives.",
    "failText":"The crate snaps shut. The gate rejects you.",
    "layers":[
      {"id":"tjc_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/three-jungle-crates/bg/three-jungle-crates_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tjc_left","name":"Left Crate","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-jungle-crates/choices/three-jungle-crates_left.png","x":3,"y":32,"width":27,"height":34,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_crate","effects":{"selectedScale":1.06}},
      {"id":"tjc_center","name":"Center Crate","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-jungle-crates/choices/three-jungle-crates_center.png","x":36,"y":30,"width":28,"height":36,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"center_crate","effects":{"selectedScale":1.06}},
      {"id":"tjc_right","name":"Right Crate","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-jungle-crates/choices/three-jungle-crates_right.png","x":70,"y":32,"width":27,"height":34,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_crate","effects":{"selectedScale":1.06}},
      {"id":"tjc_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/three-jungle-crates/foreground/three-jungle-crates_foreground.png","x":0,"y":68,"width":100,"height":32,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"tjc_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.5,"zIndex":5,"visible":true},
      {"id":"tjc_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tjc_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":58,"width":100,"height":42,"opacity":0.45,"zIndex":8,"visible":true},
      {"id":"tjc_text","name":"Intro Text","type":"text","role":"text","text":"Three jungle crates sit beneath the vines.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tjc_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Open the Crate","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"three-jungle-crates","slug":"three-jungle-crates","title":"Three Jungle Crates",
    "description":"Three jungle crates sit beneath the vines. Only one is safe.",
    "templateType":"choice_3","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Three jungle crates sit beneath the vines.",
    "instructionText":"Choose a crate, then open it.",
    "ctaText":"Open the Crate",
    "surviveText":"The crate holds safe treasure. Your streak survives.",
    "failText":"The crate snaps shut. The gate rejects you.",
    "layers":[
      {"id":"tjc_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/three-jungle-crates/bg/three-jungle-crates_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tjc_left","name":"Left Crate","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-jungle-crates/choices/three-jungle-crates_left.png","x":3,"y":32,"width":27,"height":34,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_crate","effects":{"selectedScale":1.06}},
      {"id":"tjc_center","name":"Center Crate","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-jungle-crates/choices/three-jungle-crates_center.png","x":36,"y":30,"width":28,"height":36,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"center_crate","effects":{"selectedScale":1.06}},
      {"id":"tjc_right","name":"Right Crate","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-jungle-crates/choices/three-jungle-crates_right.png","x":70,"y":32,"width":27,"height":34,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_crate","effects":{"selectedScale":1.06}},
      {"id":"tjc_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/three-jungle-crates/foreground/three-jungle-crates_foreground.png","x":0,"y":68,"width":100,"height":32,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"tjc_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.5,"zIndex":5,"visible":true},
      {"id":"tjc_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tjc_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":58,"width":100,"height":42,"opacity":0.45,"zIndex":8,"visible":true},
      {"id":"tjc_text","name":"Intro Text","type":"text","role":"text","text":"Three jungle crates sit beneath the vines.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tjc_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Open the Crate","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── CHOICE_3: Three Stone Idols ──────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'three-stone-idols','Three Stone Idols','Three stone idols wait for your choice. Only one will grant safe passage.',
  'choice_3','published',false,50,1,null,null,
  '{
    "id":"three-stone-idols","slug":"three-stone-idols","title":"Three Stone Idols",
    "description":"Three stone idols wait for your choice. Only one will grant safe passage.",
    "templateType":"choice_3","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Three stone idols wait for your choice.",
    "instructionText":"Choose an idol, then wake it.",
    "ctaText":"Wake the Idol",
    "surviveText":"The idol glows with favor. Your streak survives.",
    "failText":"The idol turns against you. Your streak falls.",
    "layers":[
      {"id":"tsi_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/three-stone-idols/bg/three-stone-idols_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tsi_left","name":"Left Idol","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-stone-idols/choices/three-stone-idols_left.png","x":3,"y":24,"width":28,"height":46,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_idol","effects":{"selectedScale":1.06}},
      {"id":"tsi_center","name":"Center Idol","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-stone-idols/choices/three-stone-idols_center.png","x":36,"y":20,"width":28,"height":50,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"center_idol","effects":{"selectedScale":1.06}},
      {"id":"tsi_right","name":"Right Idol","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-stone-idols/choices/three-stone-idols_right.png","x":69,"y":24,"width":28,"height":46,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_idol","effects":{"selectedScale":1.06}},
      {"id":"tsi_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/three-stone-idols/foreground/three-stone-idols_foreground.png","x":0,"y":70,"width":100,"height":30,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"tsi_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.65,"zIndex":5,"visible":true},
      {"id":"tsi_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tsi_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":10,"width":60,"height":58,"opacity":0.6,"zIndex":6,"visible":true},
      {"id":"tsi_text","name":"Intro Text","type":"text","role":"text","text":"Three stone idols wait for your choice.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tsi_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Wake the Idol","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"three-stone-idols","slug":"three-stone-idols","title":"Three Stone Idols",
    "description":"Three stone idols wait for your choice. Only one will grant safe passage.",
    "templateType":"choice_3","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"Three stone idols wait for your choice.",
    "instructionText":"Choose an idol, then wake it.",
    "ctaText":"Wake the Idol",
    "surviveText":"The idol glows with favor. Your streak survives.",
    "failText":"The idol turns against you. Your streak falls.",
    "layers":[
      {"id":"tsi_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/three-stone-idols/bg/three-stone-idols_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tsi_left","name":"Left Idol","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-stone-idols/choices/three-stone-idols_left.png","x":3,"y":24,"width":28,"height":46,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"left_idol","effects":{"selectedScale":1.06}},
      {"id":"tsi_center","name":"Center Idol","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-stone-idols/choices/three-stone-idols_center.png","x":36,"y":20,"width":28,"height":50,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"center_idol","effects":{"selectedScale":1.06}},
      {"id":"tsi_right","name":"Right Idol","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/three-stone-idols/choices/three-stone-idols_right.png","x":69,"y":24,"width":28,"height":46,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"right_idol","effects":{"selectedScale":1.06}},
      {"id":"tsi_fg","name":"Foreground","type":"image","role":"foreground_decoration","assetPath":"/assets/games/skull-gate/three-stone-idols/foreground/three-stone-idols_foreground.png","x":0,"y":70,"width":100,"height":30,"opacity":0.9,"zIndex":20,"visible":true},
      {"id":"tsi_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.65,"zIndex":5,"visible":true},
      {"id":"tsi_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tsi_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":10,"width":60,"height":58,"opacity":0.6,"zIndex":6,"visible":true},
      {"id":"tsi_text","name":"Intro Text","type":"text","role":"text","text":"Three stone idols wait for your choice.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tsi_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Wake the Idol","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── TAP_REVEAL: Crystal Skull ────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'crystal-skull','Crystal Skull','A crystal skull pulses in the dark. It holds a truth you must face.',
  'tap_reveal','published',false,50,1,null,null,
  '{
    "id":"crystal-skull","slug":"crystal-skull","title":"Crystal Skull",
    "description":"A crystal skull pulses in the dark. It holds a truth you must face.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A crystal skull pulses in the dark.",
    "instructionText":"Tap the skull, then reveal its answer.",
    "ctaText":"Reveal the Skull",
    "surviveText":"The skull shines with golden light. Your streak survives.",
    "failText":"The skull fractures. Your streak falls.",
    "layers":[
      {"id":"cs_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/crystal-skull/bg/crystal-skull_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"cs_skull","name":"Crystal Skull","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/crystal-skull/objects/crystal-skull_main.png","x":20,"y":22,"width":60,"height":52,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"crystal_skull","effects":{"selectedScale":1.05}},
      {"id":"cs_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"cs_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"cs_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.65,"zIndex":6,"visible":true},
      {"id":"cs_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":62,"width":100,"height":38,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"cs_text","name":"Intro Text","type":"text","role":"text","text":"A crystal skull pulses in the dark.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"cs_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Reveal the Skull","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"crystal-skull","slug":"crystal-skull","title":"Crystal Skull",
    "description":"A crystal skull pulses in the dark. It holds a truth you must face.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A crystal skull pulses in the dark.",
    "instructionText":"Tap the skull, then reveal its answer.",
    "ctaText":"Reveal the Skull",
    "surviveText":"The skull shines with golden light. Your streak survives.",
    "failText":"The skull fractures. Your streak falls.",
    "layers":[
      {"id":"cs_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/crystal-skull/bg/crystal-skull_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"cs_skull","name":"Crystal Skull","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/crystal-skull/objects/crystal-skull_main.png","x":20,"y":22,"width":60,"height":52,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"crystal_skull","effects":{"selectedScale":1.05}},
      {"id":"cs_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"cs_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"cs_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.65,"zIndex":6,"visible":true},
      {"id":"cs_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":62,"width":100,"height":38,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"cs_text","name":"Intro Text","type":"text","role":"text","text":"A crystal skull pulses in the dark.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"cs_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Reveal the Skull","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── TAP_REVEAL: Temple Rune ──────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'temple-rune','Temple Rune','A rune burns into the temple stone. Silence the flame or be consumed.',
  'tap_reveal','published',false,50,1,null,null,
  '{
    "id":"temple-rune","slug":"temple-rune","title":"Temple Rune",
    "description":"A rune burns into the temple stone. Silence the flame or be consumed.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A rune burns into the temple stone.",
    "instructionText":"Tap the rune, then break the silence.",
    "ctaText":"Break the Rune",
    "surviveText":"The rune opens the path. Your streak survives.",
    "failText":"The rune burns out. The gate rejects you.",
    "layers":[
      {"id":"tem_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/temple-rune/bg/temple-rune_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tem_rune","name":"Temple Rune","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/temple-rune/objects/temple-rune_main.png","x":22,"y":24,"width":56,"height":50,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"temple_rune","effects":{"selectedScale":1.04}},
      {"id":"tem_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.55,"zIndex":5,"visible":true},
      {"id":"tem_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tem_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":60,"width":100,"height":40,"opacity":0.45,"zIndex":8,"visible":true},
      {"id":"tem_text","name":"Intro Text","type":"text","role":"text","text":"A rune burns into the temple stone.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tem_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Break the Rune","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"temple-rune","slug":"temple-rune","title":"Temple Rune",
    "description":"A rune burns into the temple stone. Silence the flame or be consumed.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A rune burns into the temple stone.",
    "instructionText":"Tap the rune, then break the silence.",
    "ctaText":"Break the Rune",
    "surviveText":"The rune opens the path. Your streak survives.",
    "failText":"The rune burns out. The gate rejects you.",
    "layers":[
      {"id":"tem_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/temple-rune/bg/temple-rune_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"tem_rune","name":"Temple Rune","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/temple-rune/objects/temple-rune_main.png","x":22,"y":24,"width":56,"height":50,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"temple_rune","effects":{"selectedScale":1.04}},
      {"id":"tem_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.55,"zIndex":5,"visible":true},
      {"id":"tem_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"tem_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":60,"width":100,"height":40,"opacity":0.45,"zIndex":8,"visible":true},
      {"id":"tem_text","name":"Intro Text","type":"text","role":"text","text":"A rune burns into the temple stone.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"tem_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Break the Rune","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── TAP_REVEAL: Cursed Coin ──────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'cursed-coin','Cursed Coin','A cursed coin spins without moving. Its face is your fate.',
  'tap_reveal','published',false,50,1,null,null,
  '{
    "id":"cursed-coin","slug":"cursed-coin","title":"Cursed Coin",
    "description":"A cursed coin spins without moving. Its face is your fate.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A cursed coin spins without moving.",
    "instructionText":"Tap the coin, then test your fate.",
    "ctaText":"Test the Coin",
    "surviveText":"The coin lands in your favor. Your streak survives.",
    "failText":"The coin turns black. Your streak falls.",
    "layers":[
      {"id":"cc_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/cursed-coin/bg/cursed-coin_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"cc_coin","name":"Cursed Coin","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/cursed-coin/objects/cursed-coin_main.png","x":25,"y":26,"width":50,"height":48,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"cursed_coin","effects":{"selectedScale":1.05}},
      {"id":"cc_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.55,"zIndex":5,"visible":true},
      {"id":"cc_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"cc_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.55,"zIndex":6,"visible":true},
      {"id":"cc_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":65,"width":100,"height":35,"opacity":0.35,"zIndex":8,"visible":true},
      {"id":"cc_text","name":"Intro Text","type":"text","role":"text","text":"A cursed coin spins without moving.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"cc_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Test the Coin","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"cursed-coin","slug":"cursed-coin","title":"Cursed Coin",
    "description":"A cursed coin spins without moving. Its face is your fate.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A cursed coin spins without moving.",
    "instructionText":"Tap the coin, then test your fate.",
    "ctaText":"Test the Coin",
    "surviveText":"The coin lands in your favor. Your streak survives.",
    "failText":"The coin turns black. Your streak falls.",
    "layers":[
      {"id":"cc_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/cursed-coin/bg/cursed-coin_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"cc_coin","name":"Cursed Coin","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/cursed-coin/objects/cursed-coin_main.png","x":25,"y":26,"width":50,"height":48,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"cursed_coin","effects":{"selectedScale":1.05}},
      {"id":"cc_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.55,"zIndex":5,"visible":true},
      {"id":"cc_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"cc_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.55,"zIndex":6,"visible":true},
      {"id":"cc_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":65,"width":100,"height":35,"opacity":0.35,"zIndex":8,"visible":true},
      {"id":"cc_text","name":"Intro Text","type":"text","role":"text","text":"A cursed coin spins without moving.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"cc_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Test the Coin","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- ── TAP_REVEAL: Blood Stone ──────────────────────────────────────────────────

INSERT INTO skull_gate_scenes (slug,title,description,template_type,status,enabled,weight,cooldown_days,min_streak,max_streak,draft_config_json,published_config_json,published_at)
VALUES (
  'blood-stone','Blood Stone','A blood stone beats like a hidden heart. Wake it and know your fate.',
  'tap_reveal','published',false,50,1,null,null,
  '{
    "id":"blood-stone","slug":"blood-stone","title":"Blood Stone",
    "description":"A blood stone beats like a hidden heart. Wake it and know your fate.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A blood stone beats like a hidden heart.",
    "instructionText":"Tap the stone, then awaken it.",
    "ctaText":"Awaken the Stone",
    "surviveText":"The stone glows warm. Your streak survives.",
    "failText":"The stone cracks cold. Your streak falls.",
    "layers":[
      {"id":"bs_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/blood-stone/bg/blood-stone_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"bs_stone","name":"Blood Stone","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/blood-stone/objects/blood-stone_main.png","x":22,"y":25,"width":56,"height":50,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"blood_stone","effects":{"selectedScale":1.05}},
      {"id":"bs_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"bs_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"bs_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.65,"zIndex":6,"visible":true},
      {"id":"bs_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":60,"width":100,"height":40,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"bs_text","name":"Intro Text","type":"text","role":"text","text":"A blood stone beats like a hidden heart.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"bs_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Awaken the Stone","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  '{
    "id":"blood-stone","slug":"blood-stone","title":"Blood Stone",
    "description":"A blood stone beats like a hidden heart. Wake it and know your fate.",
    "templateType":"tap_reveal","status":"published","enabled":false,
    "weight":50,"cooldownDays":1,
    "introText":"A blood stone beats like a hidden heart.",
    "instructionText":"Tap the stone, then awaken it.",
    "ctaText":"Awaken the Stone",
    "surviveText":"The stone glows warm. Your streak survives.",
    "failText":"The stone cracks cold. Your streak falls.",
    "layers":[
      {"id":"bs_bg","name":"Background","type":"image","role":"background","assetPath":"/assets/games/skull-gate/blood-stone/bg/blood-stone_bg.png","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":1,"visible":true},
      {"id":"bs_stone","name":"Blood Stone","type":"image","role":"choice_object","assetPath":"/assets/games/skull-gate/blood-stone/objects/blood-stone_main.png","x":22,"y":25,"width":56,"height":50,"opacity":1,"zIndex":10,"visible":true,"clickable":true,"choiceId":"blood_stone","effects":{"selectedScale":1.05}},
      {"id":"bs_glow","name":"Gate Glow","type":"effect","role":"gate_glow","x":0,"y":0,"width":100,"height":55,"opacity":0.6,"zIndex":5,"visible":true},
      {"id":"bs_particles","name":"Fireflies","type":"effect","role":"particle_effect","x":0,"y":0,"width":100,"height":100,"opacity":1,"zIndex":25,"visible":true},
      {"id":"bs_inner","name":"Inner Light","type":"effect","role":"gate_inner_light","x":20,"y":12,"width":60,"height":55,"opacity":0.65,"zIndex":6,"visible":true},
      {"id":"bs_fog","name":"Fog","type":"effect","role":"atmosphere_effect","x":0,"y":60,"width":100,"height":40,"opacity":0.4,"zIndex":8,"visible":true},
      {"id":"bs_text","name":"Intro Text","type":"text","role":"text","text":"A blood stone beats like a hidden heart.","x":5,"y":8,"width":90,"height":10,"opacity":1,"zIndex":30,"visible":true},
      {"id":"bs_cta","name":"CTA Button","type":"button","role":"button","clickAction":"cta","text":"Awaken the Stone","x":5,"y":84,"width":90,"opacity":1,"zIndex":35,"visible":true}
    ]
  }'::jsonb,
  now()
) ON CONFLICT (slug) DO NOTHING;
