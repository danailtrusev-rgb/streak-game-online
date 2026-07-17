
INSERT INTO settings (key, value_json) VALUES
  ('reminders_enabled',   'false'::jsonb),
  ('reminder_send_hour',  '20'::jsonb),
  ('reminder_channels',   '["email"]'::jsonb),
  ('reminder_message',    '"Don''t forget — today''s game is still open. Tap in and survive the streak! 🔥"'::jsonb)
ON CONFLICT (key) DO NOTHING;
