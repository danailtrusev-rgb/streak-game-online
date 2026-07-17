# AI Handoff Notes

## Source of truth
As of 2026-07-07 (operator extraction), this file supersedes all earlier
versions. See `PROJECT_CHANGELOG.md` → "Operator Site Extraction" for the
full change list.

## The operator site is a separate project now — permanent rule

**The operator/partner website has been permanently removed from this
codebase and rebuilt as an independent PHP 8 project
(`survive-the-streak-operator-site/`).** It:
- Runs on PHP 8+, Bootstrap 5, and vanilla JS — no React, no Vite, no Node.
- Is deployed on its own, separate hosting.
- Shares no code, no build pipeline, and no runtime dependency with this
  Vite/React player project.

**Do not recreate operator routes, operator content, an operator access
gate, operator API endpoints, or an operator bundle inside this project
again.** If a future task asks for operator-facing work, it belongs in the
`survive-the-streak-operator-site/` PHP project, not here. If you're not
sure which project a request belongs to, ask — don't guess by rebuilding
React operator code "to be safe."

If you're an AI agent reading this after being asked to "add the operator
page back" or similar: stop and confirm whether the person actually means
the standalone PHP site (most likely) before writing any React operator
code in this repository.

## What was removed (for reference — do not resurrect these patterns)
- `operator.html`, `operator-gate.html`, `operator-preview.html`
- `src/OperatorApp.tsx`, `OperatorAccessApp.tsx`, `OperatorPreviewApp.tsx`
- `src/main-operator.tsx`, `main-operator-gate.tsx`, `main-operator-preview.tsx`
- `src/pages/operator/`, `src/components/operator/`
- `src/content/operatorLandingContent.ts`, `operatorAccessContent.ts`
- `src/hooks/useOperatorSession.ts`
- `src/lib/partnerBasePath.ts`, `previewHostname.ts`
- `vite-plugins/partnerPreview.ts`
- `api/operator-access.ts`, `operator-session.ts`, `operator-logout.ts`, `operator-contact.ts`
- `server/operatorAuth.ts`
- Multi-entry `rollupOptions.input` in `vite.config.ts` (back to a single entry)
- Hostname-based operator/gate routing in `middleware.ts` (back to just the two redirect domains)
- `@vercel/edge` and `@types/node` dependencies (no longer needed)

The player app went back to the conventional `src/main.tsx` → `src/App.tsx`
entry (previously `main-player.tsx` → `PlayerApp.tsx`, renamed when the
operator entries that necessitated multi-page naming were removed).

## What stayed in this project
- `PlayerLandingPage.tsx`, `AboutPage.tsx`, and all their supporting
  components (`AtmosphericHero`, `DayMotif`, `StepSequence`,
  `ChallengePreviewGrid`, `WeekendSplit`, `SocialSection`, `MobileShowcase`,
  `LandingShell`, `LandingNav`, `LandingFooter`, `CTASection`) — these are
  player-only and unaffected by the operator extraction.
  `AtmosphericHero` and `CTASection` had their now-dead `variant="operator"`
  styling branches removed, but are otherwise unchanged.
- `FeatureCards`, `SystemDiagram`, `PilotSteps`, and `OperatorUseCases` were
  deleted — they were only ever used by the (now-removed) operator overview
  page.
- `middleware.ts` — simplified to just the `surviveday30.com` /
  `survive30days.com` → `survivethestreak.com` redirect. Still real, still
  needed, has nothing to do with the operator site.

## Domain rules (unchanged)
- `survivethestreak.com` is the player brand, marketing, and game domain.
- `surviveday30.com` / `survive30days.com` (+`www`) redirect to it.
- The operator domain will be configured separately for the standalone PHP
  project — not tracked here.

## Result messaging — permanent rules

- **Missing historical data must never be represented as a confirmed
  zero (or any other real value).** If we don't genuinely know a
  player's previous best streak, previous qualification points, or any
  similar "before" snapshot, that field must be `null`/`undefined`, and
  every downstream check must treat `null` as "skip this category" — never
  infer achievement (or anything else) from missing data. This bit us
  once already (`previousBestStreak` defaulting to `0`) — don't reintroduce
  the pattern anywhere else.
- **Result messages must use real backend data only.** No invented
  percentages, no fabricated "active days," no activity-streak concept
  that doesn't exist in the schema. If a spec asks for a variable that
  isn't backed by real data, adapt the copy to what's real (as done for
  qualification: points-based, not day-count-based) or drop that variant
  category — don't fake the number.
- **Exactly one primary result category is selected per result**, via the
  priority order in `src/lib/resultMessages.ts` (`selectResultMessage()`).
  Do not render multiple competing headlines/messages on the same result
  screen. Check `scripts/verify-result-messages.ts` for the exact overlap
  rules before changing the priority order.
- **Notification copy (e.g. "Remind Me") must not be wired into any CTA
  until real scheduled/triggered delivery works.** The current
  notification system only handles contact-channel verification, not
  sends. A CTA label must never promise something the button doesn't
  actually do.
- **Cashout requires a separate product-flow decision before it gets its
  own result screen.** Today it's a button that navigates to `/pot`,
  which has its own real confirmation step — don't build a dedicated
  cashout result screen without that decision being made explicitly first.
- **Result-message pools may remain code-based (`resultMessages.ts`) for
  the MVP**, but should later be migrated to the DB-driven translation
  system (`translations` table + `STATIC_FALLBACKS` pattern in
  `src/lib/i18n.ts`) if/when multi-language support for these specific
  strings is needed. Don't invent a second, competing translation
  mechanism when that time comes — extend the existing one.
- **Before adding any new `t('result....')` call, verify the key actually
  exists in a `supabase/migrations/*.sql` seed.** Multiple result-screen
  keys were found calling non-existent translation keys and silently
  rendering raw key strings in production — always check, don't assume a
  key exists just because it looks like an established naming pattern.

## Cashout — permanent rules

- **Cashout and external withdrawal are different actions.** "Cashout"
  means moving the current pot into the player's internal wallet balance
  — it is not a withdrawal to a bank/card/crypto destination. Never say
  "withdrawn" in cashout copy unless an actual external withdrawal
  occurred; say "added to your wallet."
- **The backend calculates and confirms the cashout amount — always.**
  The frontend may *display* the current pot (a real, already-known
  value), but the amount shown on the final success screen must come from
  the server's response (`CashoutResult.cashout_amount_cents`), never the
  pre-confirmation display value re-used as if it were confirmed.
- **Cashout must be idempotent.** Today that's enforced server-side by
  `cashout_game()`'s row lock (`FOR UPDATE`) + hard `pot_cents = 0` guard,
  inside one atomic transaction — a duplicate/concurrent call safely finds
  nothing left to cash out rather than paying out twice. If you ever touch
  `cashout_game()`, do not remove or weaken that guard. The `p_idem_key`
  parameter is currently audit-trail only (recorded in `wallet_ledger.meta`),
  not an active deduplication lookup — don't assume it's doing more than that.
- **Cashout success is shown only after ledger confirmation** — never
  optimistically. `CashoutFlow`'s success stage only renders once a real
  `CashoutResult` comes back from `useGame().cashout()`.
- **Cashout confirmation must clearly state the streak consequence** —
  the confirm stage always shows what resets and whether the next run can
  start today or tomorrow, using the real `played_today` flag, never a
  hardcoded assumption.
- **Cashout must not bypass the existing wallet or ledger.** There is
  exactly one cashout implementation (`src/components/game/CashoutFlow.tsx`),
  used by both the survive-result screen and `/pot`, both calling the same
  `useGame().cashout()` → `cashout_game()` RPC. Do not build a second
  payout path.
- **The active-attempt "Leave this game?" warning
  (`game.leave_confirm`) must not interrupt the normal cashout flow.**
  It only belongs to `MicrogamePage.tsx`'s in-progress-attempt guard —
  confirmed by inspection that it was never wired into `/pot` or the
  cashout flow, and it must stay that way.
- **Never show fake future values or manipulative loss messaging.** No
  "you could have won," no invented percentages, no fake urgency/scarcity,
  no pressure tactics. The safer "keep my streak" action should always
  remain easy to choose, not buried or de-emphasized relative to the
  destructive cashout action.
- **Day 30 badges and cashout are separate events.** Badges are awarded
  at play time via a DB trigger on the `plays` table, completely
  independent of `cashout_game()`. Don't couple them.
- **Cashout does not touch qualification data.** Confirmed by inspection
  of `cashout_game()` — it never reads or writes any qualification/weekly
  table. Don't add that coupling without a real product reason.

### Idempotency — hardened, permanent rules

- **One cashout decision uses one stable idempotency key.** Generated
  once (`crypto.randomUUID()`), immediately before the first submission —
  never regenerated inside a retry. `useGame().cashout(gameId, idemKey)`
  *requires* the caller to supply it; it does not generate one internally
  (it used to, and that was the root cause of retries never working —
  don't reintroduce that pattern).
- **Retries must reuse that same key** — the initial request, "Retry
  Status," and any resubmission after a timeout/reload all pass the exact
  same key, sourced from `CashoutFlow`'s ref + `sessionStorage`
  (`src/lib/cashoutIdempotency.ts`).
- **A repeated key returns the original confirmed transaction** —
  `cashout_game()` looks up an existing ledger row for
  `(user_id, idem_key)` before checking pot eligibility, and returns that
  row's real data if found. It does not insert a second row and does not
  fail just because the pot is now (correctly) zero.
- **Pot zero alone is not proof of a specific transaction.** Never infer
  "the cashout succeeded" from `pot_cents = 0` in the frontend — always
  get the actual transaction (id, amount) from a real server response,
  either a fresh success or an idempotent replay via the same key.
- **The frontend never determines the amount or currency.** Both come
  from the RPC's response only; the display amount shown before
  confirmation is a real, already-known value (the current pot), never
  submitted back to the server as authoritative.
- **Cashout RPC permissions and `SECURITY DEFINER` settings must be
  preserved in migrations.** When modifying `cashout_game`, use
  `CREATE OR REPLACE FUNCTION` with the exact same parameter
  names/types/defaults and return type as the live function — this
  preserves existing GRANTs automatically and avoids ever needing to drop
  the function. Only drop-and-recreate if the return type or parameter
  types genuinely need to change, and if so, drop only the exact
  signature in question — this schema has a legacy `cashout_game()`
  no-arg overload that coexists with `cashout_game(text, text)`; never
  touch the one you're not intentionally changing.
- **Cashout and external withdrawal remain separate actions.** Still
  true, still worth repeating: "cashout" moves value into the internal
  wallet; nothing in this project performs an external withdrawal.

- **An idempotency key belongs to one specific cashout decision AND one
  specific eligible game state — never just the game.** Keys are scoped
  by `(gameId, contextId)`, where `contextId` is the real, server-
  generated `game_state.updated_at` observed at the moment the key was
  created. A stored key is only ever reused when both match the current
  values; any mismatch means it belongs to a different, already-resolved
  cashout opportunity and must be discarded, never reused for a new pot.
  See `src/lib/cashoutIdempotency.ts` and `GameState.updated_at`'s doc
  comment in `src/lib/types.ts`.
- **Cashout RPC permissions and `SECURITY DEFINER` settings must be
  preserved in migrations.** Still true, now applies to `get_my_state()`
  too, which was modified in the same spirit (same signature/return type,
  `CREATE OR REPLACE`, no dropped grants).
- **A frontend-only safety check is not a real guarantee — context
  binding must be enforced server-side.** This was a real gap found on
  forensic audit: `contextId` was computed correctly and used to scope
  `sessionStorage` keys, but was never sent to `cashout_game()` at all,
  so nothing on the server actually verified it. Fixed by adding
  `p_context_id timestamptz` to the RPC and validating it inside the
  function (replay requires an exact game+context match; a brand-new
  attempt must match the just-locked `game_state.updated_at`, checked
  before any ledger/wallet write). If you add another value the frontend
  uses to make a safety decision, ask whether the server independently
  verifies it too — don't assume a frontend check is sufficient on its
  own.
- **When a new RPC parameter changes the argument type list, it creates a
  new Postgres overload — it does not replace the old one.**
  `CREATE OR REPLACE FUNCTION` only updates a function in place when the
  argument types are unchanged. Adding `p_context_id timestamptz` to
  `cashout_game` required an explicit `DROP FUNCTION
  cashout_game(text, text)` first, or the old, context-blind version
  would have kept existing and kept being callable. Always check for this
  before assuming `CREATE OR REPLACE` is sufficient, and always restore
  grants explicitly after a `DROP` (they are not carried forward, unlike
  a same-signature `CREATE OR REPLACE`).
- **No financial RPC may remain callable through a legacy insecure
  overload.** This was a real, currently-live bypass, not a theoretical
  one — the no-arg `cashout_game()` performed a genuine, unvalidated
  cashout and was explicitly granted to `authenticated` right up until it
  was dropped. Never assume a legacy function is safe because the current
  frontend doesn't call it; check its actual grants, and if it can mutate
  financial state, either drop it (preferred, once no internal dependency
  exists) or explicitly revoke it from every application role.
- **Cashout requires explicit game ID, idempotency key, and
  server-validated context — with no defaults on any of the three.** A
  security-relevant RPC parameter should not have a `DEFAULT` that lets a
  caller silently omit it.
- **Frontend navigation is not an authorization boundary.** The React app
  not linking to a function, route, or action proves nothing about
  whether it's still callable. Authorization is whatever the database
  grants say, checked directly — not inferred from what the UI happens to
  expose.
- **All `SECURITY DEFINER` financial functions require explicit grant and
  search-path review** on every migration that touches them — confirm
  current grants by reading the actual `GRANT`/`REVOKE` history (or a live
  `pg_proc`/`information_schema` query), not by assumption, and prefer
  `SET search_path = ''` with fully-qualified object references over
  `SET search_path = public` with bare references where practical.

## Reactivation System (Web Push) — permanent rules

- **STS owns the native Web Push layer.** No OneSignal, Firebase
  campaign tools, or other notification-management platform — VAPID +
  Supabase Edge Functions + Supabase Cron + the existing service worker,
  directly.
- **Notification eligibility and delivery must remain separate.** All
  eligibility logic lives in `supabase/functions/_shared/eligibility.ts`
  (server-side, canonical) and its mirror
  `src/lib/notificationEligibility.ts` (test-only). `send-web-push` never
  decides who receives anything — it only sends what it's told.
- **Push notifications require explicit player opt-in.** Never assume
  consent from anything except an explicit "Enable Reminders" click.
- **Browser permission must never be requested automatically on first
  load, or anywhere except right after the player clicks "Enable
  Reminders" in a pre-permission screen.** `Notification.requestPermission()`
  has exactly one call site: `useWebPush.ts`'s `enableReminders()`.
- **Game-day eligibility uses the authoritative STS server timezone
  (Madrid, via `get_madrid_today()` and the same `Europe/Madrid`
  identifier elsewhere) — never the Edge Function server's own local
  time, never a player's browser timezone.** Browser timezone may be
  stored for display purposes only.
- **A player who already played today must not receive a last-call
  message.** Checked explicitly in the eligibility engine, not assumed
  from any other condition.
- **Scheduled sends require deduplication.** The partial unique index on
  `(user_id, subscription_id, notification_type, game_date)` (test rows
  excluded) is what makes a repeated Cron tick safe — the delivery-log
  row is always inserted *before* sending, specifically so this index can
  catch a duplicate before any push goes out twice.
- **Push-service acceptance is not the same as a human reading the
  message.** Use "sent"/"failed"/"clicked" terminology in code and admin
  UI — never claim "read" or "delivered to the user" without real
  evidence.
- **Sensitive wallet or personal information must not appear in push
  payloads.** The `STSPushPayload` shape is deliberately minimal
  (notificationId, type, title, body, route, tag, gameDate) — never add a
  balance, cashout amount, or other sensitive field to it.
- **VAPID private keys must never be committed.** `VAPID_PRIVATE_KEY` is
  a Supabase Edge Function secret only, set via `supabase secrets set`,
  never in `.env`, never in a migration, never in source control. Only
  `VITE_VAPID_PUBLIC_KEY` (public by design) belongs in `.env`.
- **Scheduled notification delivery must be tested on real devices**
  before this is considered production-ready — nothing in this codebase
  substitutes for that (see PROJECT_CHANGELOG.md "Real Web Push test
  status").
- **Notification code must not modify game outcomes, wallet state, or
  cashout state.** The scheduler only ever *reads* `game_state`,
  `users`, `notification_preferences`, `push_subscriptions`, and
  `notification_delivery_log` — it has no write path to anything
  cashout/wallet/streak-related, and must never gain one.

### Pre-deployment hardening — additional permanent rules

- **Temporary failures must not permanently consume a notification's
  dedupe slot.** A `failed_temporary` row must remain retryable
  (`next_attempt_at` set to a real future time, not `NULL`, until
  attempts/expiry are genuinely exhausted) — `NULL` means "never claim
  again," never "claim immediately." If you touch the retry logic, keep
  this inversion intact; the original bug was exactly this being
  backwards.
- **Scheduled frequency limits apply per player, unless explicitly
  configured otherwise.** The dedupe index is
  `(user_id, notification_type, game_date)` — per player, not per
  device. Do not silently reintroduce per-subscription dedupe (fan-out to
  every device) without a real, reviewed decision to change the product
  rule; Phase 1's `preferred_device` strategy exists specifically to
  satisfy the per-player rule while still supporting multi-device
  players.
- **Browser subscription endpoints may outlive an STS login session.**
  The same endpoint can legitimately belong to different STS accounts
  over time (logout/login on a shared device). Never assume an endpoint
  uniquely identifies a player.
- **Subscription ownership changes must be handled server-side**, via
  `register_push_subscription()` (`SECURITY DEFINER`), never via a direct
  client upsert. The client has no INSERT policy on `push_subscriptions`
  at all — if that ever needs to change, first understand why it was
  removed in `20260714040000_*.sql`.
- **Result opt-in prompts require a dismissal cooldown** (7 days,
  versioned) — see `src/lib/promptCooldown.ts`. Never show a
  post-result opt-in prompt without checking this first.
- **Scheduled push remains globally disabled until real-device testing
  passes.** `push_global_enabled`, `push_next_day_enabled`, and
  `push_last_call_enabled` must all default to `false` in any new
  environment/seed. Only flip them on deliberately, after the manual test
  plan in `DEPLOYMENT.md` has actually been run against real devices.
- **Last-call timing must use the same cutoff as gameplay.** This rule
  predates the Game Time System (it used to name the now-removed
  `get_madrid_today()`/`nextMadridMidnight()`/`minutesUntilMadridMidnight()`
  helpers directly) and still holds in its generalized form: a last-call
  job's `expires_at` must always be the player's region's exact
  `next_daily_rollover_at`, never an approximation — see the Game Time
  System rules immediately below for the current mechanism.

### Game Time System — permanent rules

- **The Game Time System is the authoritative clock for all gameplay and
  notification logic.** `get_game_time_state_for_region()`/
  `get_game_time_state_for_user()` (SQL) and `computeGameClockState()`
  (`src/lib/gameClock.ts` / `supabase/functions/_shared/gameClock.ts`)
  are the only places rollover/game-date/cutoff math should ever be
  computed. Do not reintroduce a hardcoded timezone or midnight
  assumption anywhere — including in a "quick fix" or a new feature that
  seems unrelated to notifications.
- **Browser timezone is not authoritative.** It may be stored (on
  `push_subscriptions.timezone`, `notification_preferences.timezone`) for
  future display purposes only. It must never determine game date, play
  eligibility, or cutoff timing.
- **Global mode defaults to Europe/Madrid.** The seeded default region is
  `global_madrid` — do not change this default without a real product
  decision; it's what every existing player currently experiences.
- **Regional mode must not activate automatically.** No Cron job, no
  scheduled trigger, nothing in this codebase should ever flip
  `game_time_settings.mode` to `'regional'` without an explicit admin
  action AND the safe-boundary wait AND `apply_pending_game_time_mode()`
  being run by hand.
- **Players cannot freely switch Game Time Regions.** The only write path
  to `user_game_time_region` is `assign_user_game_time_region()`
  (`SECURITY DEFINER`, `service_role`-only) — there is deliberately no
  client-facing RLS policy allowing a player to change their own region.
- **Region changes must not create extra daily plays or event entries.**
  Any future region-reassignment feature must take effect only from a
  safe future boundary (never immediately, never mid-day) and must be
  reflected in the notification dedupe key
  (`user_id, notification_type, game_date, region_id`).
- **`play_daily_gate`/`cashout_game`/`get_my_state` are not yet
  per-user region-aware.** They rely on `get_madrid_today()`, which is
  safe today because Regional mode is off (every player uses the global
  region). Before Regional mode is ever activated for real players, this
  gap must be closed — do not activate Regional mode without addressing
  it first.
- **No new migration is production-ready until applied in a test
  Supabase environment.** This applies to every migration from every
  recent pass, not just the Game Time System ones — none of them have
  been run against a live database from this environment.

### Regional Activation Guard — permanent rules

- **Regional Game Time foundation exists but must not be activated yet.**
  `apply_pending_game_time_mode()` hard-refuses to activate `'regional'`
  mode unless `game_time_settings.regional_game_time_live_enabled` is
  explicitly `true` — this is a real database-level block, not just
  something the admin UI hides. Do not add a second code path (a new
  RPC, a direct settings UPDATE, an admin bypass) that could activate
  Regional mode while this flag is false.
- **Core gameplay RPCs must become per-user-region-aware before Regional
  mode can be used.** `play_daily_gate`, `cashout_game`, `get_my_state`,
  qualification, and Saturday/Sunday event logic all still resolve
  everyone to the global clock regardless of any individual region
  assignment. This is safe only because Regional mode is off. Do not
  flip `regional_game_time_live_enabled` to `true` until that gameplay
  work is done and verified — flipping the flag is a deliberate, direct
  database change by someone who understands what it gates, never a
  routine admin-panel action.
- **Notification timing must never be regional while gameplay timing
  remains global.** If Regional mode is ever activated for real, the
  notification scheduler and the gameplay RPCs must move to per-user
  region-awareness together — never one before the other. A player must
  never receive a notification for a game date their own gameplay RPCs
  don't actually recognize as current.

### Region-Aware Core Gameplay — permanent rules

- **Core gameplay must use the Game Time System, not Madrid directly.**
  `play_daily_gate`, `cashout_game`, `get_my_state`, and
  `update_weekly_qualification` all resolve date/week via
  `get_current_game_date_for_user()` / `get_current_week_start_for_user()`
  / `resolve_user_game_time_region()` now — never call
  `get_madrid_today()` or hardcode `'Europe/Madrid'` directly in new
  gameplay code. Two independent hardcoded-Madrid literals were found
  hiding in `get_my_state()` and `get_current_week_start()` well after
  the original Game Time System pass — when adding new gameplay logic,
  actively check for a NEW inline timezone literal, don't assume a single
  past search caught every instance.
- **`played_today` means played during the user's authoritative game
  date** — resolved via their Game Time region, not literally "Madrid
  today," even though those are identical values while Global mode is
  the only active mode.
- **Future plays must store authoritative game date and region.**
  `plays.play_date` (already authoritative) and the new
  `plays.game_time_region_id` — every new play-recording code path must
  populate both. Historic rows are never rewritten to match.
- **Qualification periods are region-aware** — `week_start_date` is
  computed per-user via `get_current_week_start_for_user()`. Point
  values and thresholds are a completely separate concern; do not
  conflate "make the week boundary region-aware" with "change how many
  points something is worth."
- **Saturday/Sunday events are regional instances when Regional mode is
  active** — the recommended MVP model, not yet built. Do not implement
  a single global staggered leaderboard as a shortcut; it was explicitly
  rejected in favor of true regional instances.
- **Cashout remains financial logic but records the authoritative game
  date and region for audit.** `game_time_region_id` in `wallet_ledger`
  meta is informational only — it must never become part of the
  idempotency/replay fingerprint (`game_id` + `cashout_context_id` are
  the only comparison fields) or any eligibility decision.
- **Reporting must use authoritative game date and region.** New
  reporting/dashboard work should query `v_plays_by_game_date_region` or
  similar region-aware sources, not raw `created_at::date` or a
  hardcoded timezone conversion.
- **Regional mode must remain disabled until real Supabase tests pass.**
  Backend code being "region-aware" is necessary but not sufficient —
  `regional_game_time_live_enabled` stays `false` until migrations have
  actually run in a test project and real play/cashout/qualification/
  notification tests have passed.
- **No July migration is production-ready until tested in a preview
  database.** This has been true since the first Reactivation System
  pass and remains true — every migration added since, including every
  one in this pass, is unapplied and unverified against a live Postgres
  instance.

### Duplicate Play and Region Reassignment Hardening — permanent rules

- **Duplicate-play protection must be database-enforced or
  migration-blocking.** A `NOTICE`-and-continue outcome is never
  acceptable for `plays` uniqueness — if a migration cannot safely add
  the real constraint, it must fail loudly (`RAISE EXCEPTION`) and point
  at `v_duplicate_daily_plays` for remediation, not silently proceed
  without protection.
- **A migration must never silently skip daily-play uniqueness.** If you
  ever need to touch `plays_user_game_date_unique` again, preserve this
  property: success means the constraint exists, or the migration does
  not succeed.
- **Region changes must not take effect immediately by default.**
  `assign_user_game_time_region()` computes its own safe
  `effective_from` (later of the old and new region's next rollover) —
  it does not trust a caller-supplied timestamp. The only way to bypass
  this is the `service_role`-only, always-logged
  `p_force_effective_immediately_for_test` override — never wire this up
  to anything a player or normal admin action can trigger.
- **Region changes must not create a second daily play.** Enforced by
  two independent layers: the effective-boundary rule above, and
  `plays_user_game_date_unique` having no `region_id` in its key at all
  — a reassignment cannot unlock a second play for the same
  `game_date` regardless of timing edge cases.
- **Saturday/Sunday region-aware timing foundation is not the same as
  region-aware event mechanics.** `get_saturday_sunday_status_for_user()`
  and the region-configured windows tell you *when* an event happens per
  region — they do not implement participation records, region-scoped
  leaderboards, rewards, or finalization. Do not describe the foundation
  as "Saturday/Sunday is region-aware" without this distinction; it
  overstates readiness.
- **Regional Game Time remains blocked until weekend event mechanics and
  real database tests pass.** Current classification: B — partially
  code-ready, blocked specifically on weekend-event mechanics, not just
  on database/device testing. Do not reclassify to A until Saturday
  Showdown and Sunday Crown genuinely have region-scoped participation,
  leaderboards, rewards, and finalization built and tested.

### Assignment History and Regional Weekend Events — permanent rules

- **Active region assignment must remain active until a pending
  assignment becomes effective.** `user_game_time_region_assignments` is
  a history table, not a single-row-per-user table — a reassignment
  closes off the previous row (`effective_until`) instead of overwriting
  it. Never reintroduce a single-row assignment model; it silently loses
  the active region's identity during a pending transition.
- **Region reassignment must not fall back to global during the pending
  period.** `resolve_user_game_time_region()` must always find the row
  whose window actually contains "now" — the old region if a
  reassignment is still pending, the new one once its boundary passes,
  the global region only when no row matches at all. If you touch this
  function, preserve this property; falling back to global during a
  pending transition was the exact bug this pass fixed.
- **Saturday/Sunday events must be scoped by event instance and
  region.** `event_instances` (`UNIQUE (event_type, game_time_region_id,
  event_date)`) is the real per-region-per-date record; participation
  (`weekend_event_entries`) links to it via `event_instance_id`. Do not
  build a second, parallel participation table — extend the existing
  one, per the "adapt to existing conventions" pattern already
  established here.
- **A player can participate once per event instance.** Enforced by
  `weekend_event_entries`'s existing `UNIQUE (user_id, event_game_id,
  week_start_date)` plus `enter_weekend_event()` always resolving the
  caller's OWN current region — never accept a region/instance parameter
  from a client for entry.
- **Weekend event rewards/finalization must be idempotent and
  region-scoped before activation.** `admin_finalize_event()` currently
  has no protection against being run twice for the same winner — this
  is a real, named, pre-existing gap, not fixed yet, and is the specific
  reason Regional Game Time is not classified fully code-ready. Do not
  activate Regional mode, and do not claim classification A, until this
  is fixed and tested.
- **`enter_weekend_event` has exactly one live signature.** A dead 2-arg
  overload (with an unused idempotency key) was found and dropped during
  this pass — if you ever add a new parameter to this function, drop the
  old signature explicitly rather than leaving two overloads reachable,
  same principle already applied to `cashout_game`.
- **Regional Game Time remains disabled until real Supabase tests pass
  and Danail approves.** No amount of code-level region-awareness —
  however complete — substitutes for real migration application, real
  build verification, and real testing with real users across regions.

### Weekend Event Finalization and Entry Hardening — permanent rules

- **Weekend event entry must happen through `enter_weekend_event()`.**
  The direct client `INSERT` RLS policy on `weekend_event_entries` is
  gone — do not re-add a client-facing write policy on this table
  without rebuilding the same qualification/region/window/duplicate
  protections that policy would bypass.
- **Direct client insert into `weekend_event_entries` must not bypass
  eligibility/window/region checks.** If a future feature genuinely
  needs a different write path, it must re-derive region, qualification,
  and window eligibility itself — never assume RLS alone (`auth.uid() =
  user_id`) is sufficient protection for a financially-adjacent action.
- **Weekend event finalization must be idempotent.** `event_finalizations`
  (two partial unique indexes — instance-scoped and legacy/global) is the
  real gate: `admin_finalize_event()` attempts that insert before
  touching the wallet, entries, or announcements. Never add a second
  finalization code path that skips this table.
- **Event rewards must not be paid twice.** This is enforced by
  `event_finalizations`'s unique indexes, not by admin discipline or
  frontend guardrails — verified with a real concurrent-call model, not
  just asserted.
- **Event finalization must be scoped by event instance and region.**
  Winner/entry updates are always filtered to the given
  `event_instance_id` when one is provided; ledger metadata records
  `event_instance_id`, `game_time_region_id`, and `finalization_id`.
- **Derived event status should be used while Cron remains inactive.**
  `get_event_instance_derived_status()` (cancelled → finalized →
  scheduled → open → closed) is the answer to "is this event open right
  now" — never trust the stored `event_instances.status` column alone
  for a time-based decision; it is only ever updated at creation and
  finalization.
- **Regional Game Time must remain disabled until real Supabase tests
  pass and Danail approves.** This is true even now that the backend is
  classified structurally code-ready (A) — code-readiness and
  deployment-readiness are different things, and this project has
  consistently kept them separate across every pass.

## Always-preserved
`/play` remains the game entry. `/sys/admin` remains the admin route.
Existing game, wallet, Supabase, authentication, and backend logic must
remain unchanged — this cleanup touched only landing-page-adjacent files
that existed solely to support the now-removed operator site.
