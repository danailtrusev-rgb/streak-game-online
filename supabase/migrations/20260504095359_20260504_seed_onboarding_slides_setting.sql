/*
  # Seed onboarding_slides setting

  Inserts a `onboarding_slides` key into the settings table containing the
  default slide definitions for the onboarding modal. Each entry includes:
    - id           string key matching the hardcoded SLIDES array
    - title        slide heading
    - body         slide description
    - image_url    optional URL/path for the large central icon image (empty = use hardcoded fallback)

  This is additive — the frontend falls back to hardcoded icons when image_url is empty.
*/

INSERT INTO settings (key, value_json, updated_at)
VALUES (
  'onboarding_slides',
  '[
    {"id":"skull_gate","title":"Face the Skull Gate","body":"Every day, a new challenge awaits. Step through the ancient gate and test your courage. Survive to build your streak and grow your pot.","image_url":""},
    {"id":"build_streak","title":"Build Your Streak","body":"Each day you survive, your streak grows and your pot multiplies. Cash out at any time to claim your earnings — or keep going for bigger rewards.","image_url":""},
    {"id":"earn_points","title":"Earn Qualification Points","body":"Play daily games to earn qualification points. Dice, Pick, Puzzle, and the Skull Gate all contribute toward your weekly score.","image_url":""},
    {"id":"saturday","title":"Enter the Saturday Showdown","body":"Reach the Saturday points threshold to unlock entry into the weekly Showdown. Compete against other qualified players for the biggest prizes.","image_url":""},
    {"id":"sunday","title":"Chase the Sunday Crown","body":"The elite Sunday Crown event awaits the most dedicated players. Earn more points to unlock Sunday, the ultimate weekly competition.","image_url":""}
  ]'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
