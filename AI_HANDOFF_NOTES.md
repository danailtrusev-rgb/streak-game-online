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

## Always-preserved
`/play` remains the game entry. `/sys/admin` remains the admin route.
Existing game, wallet, Supabase, authentication, and backend logic must
remain unchanged — this cleanup touched only landing-page-adjacent files
that existed solely to support the now-removed operator site.
