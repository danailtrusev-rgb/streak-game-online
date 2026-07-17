/*
  # Reactivation Notifications — Cron scheduling (template, not auto-applied with real secrets)

  ## Why this migration doesn't just work when applied
  Supabase Cron (`pg_cron` + `pg_net`) invokes an Edge Function over HTTP,
  which requires the deployed project's URL and a service-role (or a
  scoped) API key in the `cron.schedule(...)` call itself. Committing a
  real service-role key into a migration file would mean committing a
  production secret to source control — the task explicitly prohibits
  this ("If secrets or URLs cannot safely be inserted through a
  migration, provide explicit dashboard or CLI deployment steps
  instead"). This file therefore:
  1. Enables the required extensions (safe, no secrets).
  2. Leaves the actual `cron.schedule(...)` call commented out, with
     placeholders, to be run manually (SQL editor or CLI) after
     substituting the real project ref and a real secret — see
     `DEPLOYMENT.md` → "Configure Cron" for the exact steps.

  ## Recommended frequency
  Every 15 minutes. The Edge Function itself determines which
  notification window (if any) is currently active — Cron firing on a
  fixed schedule is not what decides eligibility or triggers a send by
  itself; see `schedule-reactivation-notifications`.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Run this block manually (Supabase SQL editor or `supabase db
--    execute`) after deployment, with the placeholders replaced. Do not
--    commit the filled-in version with a real secret to source control —
--    run it directly against the target project instead.
--
-- SELECT cron.schedule(
--   'sts-reactivation-scheduler',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/schedule-reactivation-notifications',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <YOUR-SERVICE-ROLE-KEY-OR-A-SCOPED-CRON-SECRET>'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To remove/disable later:
-- SELECT cron.unschedule('sts-reactivation-scheduler');