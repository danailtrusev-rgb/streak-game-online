
-- Seed service-picker settings with safe defaults (no-op if already present)
INSERT INTO settings (key, value_json) VALUES
  ('transactional_email_service', '"none"'),
  ('sms_service',                 '"none"'),
  ('resend_api_key',              '""')
ON CONFLICT (key) DO NOTHING;
