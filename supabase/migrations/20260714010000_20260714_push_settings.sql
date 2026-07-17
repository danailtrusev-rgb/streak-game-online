/*
  # Reactivation Notifications — admin settings

  Reuses the existing `settings (key text PRIMARY KEY, value_json jsonb)`
  table and pattern (see `src/pages/admin/AdminSettings.tsx`'s
  `REMINDER_KEYS`/`ECONOMY_*_KEYS` convention) rather than inventing a new
  config table. All keys use a `push_` prefix so they're unambiguous and
  never collide with the existing `reminders_*` group, which is a
  separate, out-of-scope (email/SMS/GHL) system left untouched.
*/

INSERT INTO settings (key, value_json) VALUES
  ('push_global_enabled',            'false'::jsonb),
  ('push_next_day_enabled',          'true'::jsonb),
  ('push_next_day_delay_minutes',    '15'::jsonb),
  ('push_last_call_enabled',         'true'::jsonb),
  ('push_last_call_minutes_before_cutoff', '120'::jsonb),
  ('push_min_spacing_hours',         '4'::jsonb),
  ('push_max_per_player_per_day',    '2'::jsonb),
  ('push_next_day_title',            '"Today''s challenge is ready"'::jsonb),
  ('push_next_day_body_streak',      '"Your next challenge is waiting. Return to continue your streak."'::jsonb),
  ('push_next_day_body_no_streak',   '"A new challenge is waiting. Start your next run today."'::jsonb),
  ('push_last_call_title_streak',    '"Your streak is still waiting"'::jsonb),
  ('push_last_call_body_streak',     '"Play today''s challenge before it closes to keep your streak moving."'::jsonb),
  ('push_last_call_title_no_streak', '"Last chance for today''s challenge"'::jsonb),
  ('push_last_call_body_no_streak',  '"Today''s challenge closes soon. Return now to take your chance."'::jsonb),
  ('push_click_route',               '"/"'::jsonb),
  ('push_test_mode',                 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
