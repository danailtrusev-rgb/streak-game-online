# Deployment Guide — Survive the Streak (Player)

This project is now a single-entry Vite + React SPA for the public player
game only. The operator/partner site has been extracted into a completely
independent PHP project (`survive-the-streak-operator-site/`) with its own
hosting, its own repository, and no runtime dependency on this codebase.
See `AI_HANDOFF_NOTES.md` for the permanent rule against recreating
operator routes here.

## Domains

| Domain | Role |
|---|---|
| `survivethestreak.com` (+`www`) | Player brand, marketing, and game — this project |
| `surviveday30.com` (+`www`) | Redirect only → `survivethestreak.com` |
| `survive30days.com` (+`www`) | Redirect only → `survivethestreak.com` |

The operator domain (e.g. `partners.survivethestreak.com` or a different
domain entirely) will be configured separately, on separate hosting, for
the standalone PHP site — it is out of scope for this project's deployment.

## Build

- **Build command:** `npm run build` (`vite build`)
- **Output directory:** `dist`
- Single entry (`index.html` → `src/main.tsx` → `src/App.tsx`). No
  multi-page build configuration remains — that was only ever needed for
  the operator entries, which are gone.

## Attach domains (Vercel → Settings → Domains)

Add `survivethestreak.com`, `www.survivethestreak.com`, `surviveday30.com`
(+`www`), `survive30days.com` (+`www`) to the same project.

## DNS

Use the exact records Vercel's dashboard shows when you add each domain
(these can change over time — don't hardcode old values).

## Environment variables

Only the existing Supabase variables are required:

| Variable | Required |
|---|---|
| `VITE_SUPABASE_URL` | Yes |
| `VITE_SUPABASE_ANON_KEY` | Yes |

No operator-related environment variables (`OPERATOR_ACCESS_CODE`,
`OPERATOR_SESSION_SECRET`, `OPERATOR_CONTACT_WEBHOOK_URL`,
`PARTNER_PREVIEW_CODE`, `VITE_ENABLE_PARTNER_PREVIEW`) apply to this
project anymore — those now belong to the standalone PHP operator site's
own configuration (see that project's `DEPLOYMENT.md`).

## Middleware

`middleware.ts` now does exactly one thing: 308-redirects
`surviveday30.com` / `survive30days.com` (+ `www`) to
`https://survivethestreak.com`, preserving path and query string. No
hostname-based bundle selection, no session cookies, no operator routing —
all of that was removed with the operator extraction.

## Redeploy

Standard: push/redeploy after any environment variable change.

## Verification checklist

- `/` → player landing page
- `/about` → About page
- `/play` → the game
- `/sys/admin` → admin (existing auth applies)
- `/operators`, `/operator` → redirect to `/` (legacy link safety net; no operator content anywhere in this codebase to expose)
- `https://survive30days.com/about?utm=1` → 308 to `https://survivethestreak.com/about?utm=1`; `www` too; no loops
- View page source on `/` → no operator/retention/white-label language (there's no code path that could produce any)

## If you are not on Vercel

`middleware.ts` uses the Vercel Edge Middleware contract. If deployed
elsewhere (Netlify, Cloudflare Pages, etc.), port the two-hostname redirect
check to that platform's equivalent (Netlify Edge Function + `netlify.toml`
redirects, or a Cloudflare Worker). It's a handful of lines — see
`middleware.ts` for the exact logic.

---

## Reactivation System Phase 1 — Web Push deployment

Test environment: `https://survive-streak-jungl-m02f.bolt.host/`
Future production domain: `https://app.survivethestreak.com`

None of the steps below have been executed in the environment this code
was written in (no network access, no Deno runtime, no real Supabase
project reachable) — this is a from-scratch deployment guide, not a
record of what was already done.

### 1. Generate VAPID keys
Using the `web-push` CLI (Node, run locally — not in this repo):
```bash
npx web-push generate-vapid-keys
```
This prints a public and private key pair. Generate your own — never
reuse an example pair from documentation.

### 2. Add the frontend public key
In your hosting platform's environment variables (or `.env` for local
dev): `VITE_VAPID_PUBLIC_KEY=<the public key>`. Safe to expose — it's
public by design.

### 3. Add Supabase secrets
```bash
supabase secrets set VAPID_PUBLIC_KEY=<the public key>
supabase secrets set VAPID_PRIVATE_KEY=<the private key>
supabase secrets set VAPID_SUBJECT=mailto:<your-operational-email>
```
Never put the private key in `.env`, a migration, or source control.

### 4. Apply database migrations
In order (append-only, do not skip or reorder):
```bash
supabase db push
```
This applies, in order: `20260714000000_reactivation_core_schema.sql`,
`20260714005000_notification_click_rpc.sql`,
`20260714010000_push_settings.sql`,
`20260714020000_reactivation_cron_template.sql` (only enables
`pg_cron`/`pg_net` — the actual Cron schedule is a separate manual step,
see 6 below), `20260714030000_reactivation_retry_and_dedupe.sql` (retry
fields + player-level dedupe + job-claim RPC),
`20260714040000_subscription_registration_rpc.sql` (safe endpoint
ownership handling), `20260714050000_push_safe_defaults.sql` (forces
`push_next_day_enabled`/`push_last_call_enabled` to `false` — confirm
after this runs that all of `push_global_enabled`,
`push_next_day_enabled`, `push_last_call_enabled` read `false` in the
`settings` table before proceeding to step 5).

### 5. Deploy Edge Functions
```bash
supabase functions deploy schedule-reactivation-notifications
supabase functions deploy send-web-push
supabase functions deploy test-web-push
```
Verify `npm:web-push@3.6.7` resolves correctly during deploy — this is
the one dependency in this pass that could not be tested in advance (see
PROJECT_CHANGELOG.md "Known limitations").

### 6. Configure Cron
Run manually in the Supabase SQL editor (or `supabase db execute`) — do
**not** commit the filled-in version to source control:
```sql
SELECT cron.schedule(
  'sts-reactivation-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/schedule-reactivation-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <YOUR-SERVICE-ROLE-KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 7. Rebuild the Bolt app
Rebuild/redeploy so `VITE_VAPID_PUBLIC_KEY` is baked into the bundle and
`public/sw.js`'s new push handlers ship.

### 8. Subscribe a test browser
Open the Bolt test URL in Chrome/Edge desktop, go to Settings → Streak
Reminders → Enable Reminders, grant the browser permission prompt.
Confirm a row appears in `push_subscriptions` for your user.

### 9. Send a test notification
Admin panel → Reactivation Notifications → Send Test Notification (you
must be logged in as a player in the same browser — see
PROJECT_CHANGELOG.md for why). Confirm the push arrives and
`notification_delivery_log` gets a `type='test'` row with `status='sent'`.

### 10. Run the scheduler manually
```bash
curl -X POST https://<ref>.supabase.co/functions/v1/schedule-reactivation-notifications \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" -d '{}'
```
Inspect the JSON response (`sent`, `skipped`, `candidates`, `details`).

### 11. Test next-day notification
Set a test player's `game_state.last_play_date` to yesterday's Madrid
date, ensure `push_next_day_enabled`/`push_global_enabled` are true and
they have an active subscription, run the scheduler manually, confirm
exactly one `next_day` row is created and delivered. Run the scheduler
again immediately — confirm no second row/send.

### 12. Test last-call notification
Set `push_last_call_minutes_before_cutoff` low enough to be currently
inside the window (or wait for a real window), ensure the test player
hasn't played today, run the scheduler, confirm exactly one `last_call`
row. Mark the player as played today (`last_play_date` = today), run the
scheduler again, confirm no last-call is sent.

### 13. Verify delivery logs
```sql
select * from notification_delivery_log order by created_at desc limit 20;
```
Confirm statuses are accurate (`sent` only after a real push-service
acceptance, `failed_permanent` for a `404`/`410`, etc.).

### 14. Disable notification subscription
From Settings, click "Disable This Device," confirm
`push_subscriptions.enabled` becomes `false` and no further pushes
arrive on that device even though browser permission remains granted.

### 15. Roll back Cron or globally disable sends
Fastest kill switch (no deploy needed): in the admin panel, set
`push_global_enabled` to `false` — the scheduler exits immediately on
its next tick and sends nothing. To fully stop the Cron job:
```sql
SELECT cron.unschedule('sts-reactivation-scheduler');
```

---

## Manual test plan — Bolt test environment

Not executed in this pass (no browser/device access in this
environment) — this is the checklist to run for real before considering
Phase 1 production-ready.

### Desktop Chrome/Edge
- [ ] Enable notification permission via Settings → Streak Reminders
- [ ] Confirm a row appears in `push_subscriptions`
- [ ] Send an admin test notification
- [ ] Close the STS tab entirely
- [ ] Confirm the push is received (OS-level notification)
- [ ] Click it — confirm STS opens/focuses at the correct route
- [ ] Confirm `notification_delivery_log.clicked_at` is set
- [ ] Disable the current device from Settings
- [ ] Send another test — confirm nothing arrives on that device

### Android Chrome
- [ ] Subscribe
- [ ] Background the browser (don't close it)
- [ ] Receive a notification
- [ ] Tap it, confirm STS opens to the correct route
- [ ] Verify icon, title, and body render correctly
- [ ] Revoke notification permission in Android settings, confirm STS
      reflects "denied" in Settings without crashing or re-prompting

### iPhone/iPad
- [ ] Open the Bolt URL in Safari (not installed)
- [ ] Confirm the install-instruction screen appears instead of a broken
      Enable button
- [ ] Add to Home Screen via the Safari share sheet
- [ ] Open STS from the new Home Screen icon (standalone mode)
- [ ] Enable reminders — confirm the real permission prompt appears now
- [ ] Send a test notification, confirm delivery
- [ ] Tap it, confirm correct route opens

### Scheduler
- [ ] Create/use controlled test users
- [ ] Set state for next-day eligibility (played yesterday, not today)
- [ ] Run the scheduler manually
- [ ] Confirm exactly one `next_day` message/log row
- [ ] Run the scheduler again immediately — confirm no duplicate
- [ ] Set last-call-eligible state
- [ ] Confirm exactly one `last_call` message
- [ ] Mark the player as having played today
- [ ] Confirm no further last-call is sent for that game day
