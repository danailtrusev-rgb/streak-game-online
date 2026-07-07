# Project Changelog

## 2026-07-06 — Public Landing Pages

### Summary
Added public, no-auth landing pages for players and operators, and moved the
live game entry from `/` to `/play` to make room for them.

### Files added
- `src/content/landingContent.ts` — centralized copy for both landing pages
- `src/components/landing/LandingShell.tsx` — desktop-wide shell for public pages
- `src/components/landing/LandingNav.tsx` — top nav + player/operator switch link
- `src/components/landing/LandingHero.tsx` — shared hero section
- `src/components/landing/FeatureCards.tsx` — shared card-grid section
- `src/components/landing/CTASection.tsx` — shared final CTA band
- `src/components/landing/OperatorUseCases.tsx` — operator-only use-case chips
- `src/components/landing/LandingFooter.tsx` — shared footer
- `src/pages/PlayerLandingPage.tsx` — new `/` route
- `src/pages/OperatorLandingPage.tsx` — new `/operators` route
- `src/pages/AboutPage.tsx` — new optional `/about` route

### Files changed
- `src/App.tsx` — added `/`, `/operators`, `/about` as standalone public routes
  outside `AppLayout`/`AuthProvider` gating; moved the existing game home
  (`HomePage`) from `/` to `/play`; onboarding and guest-merge modals are now
  suppressed while on the three public landing routes (see `PUBLIC_LANDING_ROUTES`).
- `src/components/layout/BottomNav.tsx` — "Gate" tab now points at `/play`
  instead of `/`.
- `src/lib/gameRegistry.ts` — `daily_gate` game definition's `route` updated
  from `/` to `/play` (2 occurrences, including the fallback definition).
- `src/components/game/MicrogamePage.tsx` — "back home" button now navigates
  to `/play`.
- `src/pages/PotPage.tsx` — both "back home" buttons now navigate to `/play`.
- `src/pages/weekend/SaturdayPage.tsx` — back button now navigates to `/play`.
- `src/pages/weekend/SundayPage.tsx` — back button now navigates to `/play`.
- `public/manifest.json` — `start_url` changed from `/` to `/play` so an
  installed PWA still opens straight into the game, not the marketing page.
- `src/index.css` — added `#root.landing-wide` selector (grouped with the
  existing `#root.admin-wide` rule) so the two landing pages can use a real
  desktop-width layout instead of the game's 480px phone-frame shell.

### Routes added
- `/` — player landing page (public, no auth)
- `/operators` — operator/partner landing page (public, no auth)
- `/about` — optional simple player explanation page (public, no auth)

### Routes preserved
- `/play` — new home for the existing game entry (previously `/`)
- `/sys/admin` — existing admin route, untouched (project has no separate `/admin` route)
- `/games`, `/wallet`, `/leaderboard`, `/settings`, `/settings/faq`,
  `/pot`, `/streak`, `/games/pick`, `/games/safebox`, `/games/dice`,
  `/games/path`, `/games/puzzle`, `/weekend/saturday`, `/weekend/sunday`
  — all unchanged.

### Assets referenced
- `/assets/icons/skull.png`, `fire.png`, `trophy.png`, `shield.png`,
  `star.png`, `gamepad.png`, `scroll.png` via the existing `ICONS` map in
  `src/lib/assets.ts`, rendered through the existing `AssetIcon` component,
  which already falls back to a Lucide icon if the image 404s. No new asset
  files were added or moved.

### Supabase migrations
None. No database changes were required for this work.

### Notes for future Bolt/AI changes
- `/` and `/operators` (and `/about`) render **outside** `AppLayout` and
  `AppLayout`'s HUD/BottomNav — they are plain marketing pages, not part of
  the authenticated game shell. Do not wrap them in `AppLayout`/`GameLayout`.
- The live game itself was **not modified** — only its route changed from
  `/` to `/play`. Wallet logic, backend logic, and Supabase logic are untouched.
- All landing copy lives in `src/content/landingContent.ts`. Edit copy there,
  not inside the page/component files.
- Keep player-facing and operator-facing copy strictly separate — see
  `AI_HANDOFF_NOTES.md` for the exact rules.
- If you add more internal links to the old game route, target `/play`, not `/`.

## 2026-07-07 — Domain Separation and Landing Page Redesign

### Summary
Split the single public codebase into three domain-facing experiences that
share one deployment: `surviveday30.com` (player), `survive30days.com`
(redirects), and `survivethestreak.com` (private, gated operator site).
Also did a substantial visual redesign of the player landing page, the
`/about` page, and the operator proposition — replacing flat generic cards
with a cinematic hero, a 30-day progression motif, a connected step
sequence, atmospheric challenge-preview panels, a weekend timeline, a social
share preview, and a restrained B2B-style operator layout.

### Player landing redesign
- New `AtmosphericHero` component: layered background image + gradient
  overlays for readability, eyebrow/headline/subhead, primary + secondary
  CTA, optional motif slot.
- New `DayMotif`: a carved day 1 → day 30 progression path with milestone
  marks (day 1 / 7 / 14 / 21 / 30) — a marketing visual, not live player data.
- New `StepSequence`: connected, numbered "How it works" flow instead of
  disconnected cards.
- New `ChallengePreviewGrid`: atmospheric preview panels for Skull Gate /
  Torch Trial / Glyph Gate / "more trials coming" using existing icons and
  layered gradients (no fabricated gameplay screenshots).
- New `WeekendSplit`: two-stage Saturday/Sunday visual timeline.
- New `SocialSection`: sharing copy + a clearly-labeled "share preview" UI
  mock (no fake user counts or reviews).
- New `MobileShowcase`: desktop-only phone-shell preview; renders as plain
  content on narrow viewports (no fake frame around the real device).
- Ambient mist animation on the hero, respecting `prefers-reduced-motion`.

### About page redesign
Rebuilt around `aboutPageContent.ts`, visually consistent with the player
landing page (same shell, same hero treatment, same card style). Still
strictly player-facing.

### Operator landing redesign
- Restrained B2B direction: charcoal/stone background, restrained gold
  accents, more whitespace, `operator` variant of `AtmosphericHero`,
  `FeatureCards`, and `CTASection`.
- New `SystemDiagram`: connected 6-step engagement flow (daily challenge →
  streak progression → social sharing → weekly qualification → weekend
  event → repeat cycle) instead of six disconnected cards.
- New `PilotSteps`: numbered pilot process.
- Value cards now carry a "metric label" (e.g. "Daily participation",
  "Share rate") instead of invented percentages.
- Real contact form (`OperatorContactForm`) replacing the old `mailto:`
  placeholder — see "Operator contact" below.

### Domain / hostname routing
- `src/lib/siteMode.ts` — decides `player` vs `operator` from
  `window.location.hostname` (`survivethestreak.com` → operator, everything
  else → player), with a `DEV`-only override (`?site=operator` or
  `/operator-preview`) for local testing.
- `src/App.tsx` — branches on site mode at the very top: operator hostnames
  render the new `src/OperatorApp.tsx` (separate router, no Supabase/game
  code involved); everything else renders the existing player app unchanged.
- `src/OperatorApp.tsx` — new operator router: `/` (access gate, or redirect
  to `/overview` once a valid session exists), `/overview`, `/contact`,
  `/deck` (reserved placeholder), catch-all → `/`.
- `/operators` on the player app now redirects to `/` (`<Navigate>`) instead
  of rendering operator content — the old `src/pages/OperatorLandingPage.tsx`
  was removed.

### Operator access protection
- `server/operatorAuth.ts` — shared, platform-agnostic (Web Crypto) helpers:
  HMAC-signed session tokens, cookie serialization, a best-effort in-memory
  rate limiter. Never imported by client code.
- `api/operator-access.ts` — verifies the submitted code against
  `OPERATOR_ACCESS_CODE`, sets an HttpOnly/Secure/SameSite=Lax signed
  session cookie on success. Rate-limited. Fails closed if env vars aren't set.
- `api/operator-session.ts` — server-verified "is my session valid?" check;
  the frontend never reads the HttpOnly cookie directly.
- `api/operator-logout.ts` — clears the session cookie ("Lock access").
- `api/operator-contact.ts` — requires a valid session, forwards to a
  configurable webhook, never fakes success.
- `middleware.ts` (Vercel Edge Middleware) — re-verifies the session cookie
  for `/overview`, `/contact`, `/deck` before the SPA loads (blocks deep
  linking around the gate), serves a `Disallow: /` `robots.txt` and adds
  `X-Robots-Tag: noindex, nofollow, noarchive` for the operator hostname,
  and 308-redirects `survive30days.com` (+ `www`) to `surviveday30.com`.

### SEO / noindex
- `public/robots.txt` (new) + `public/sitemap.xml` (new) for the player
  domain — disallows `/operators` and `/sys/admin`, references the sitemap.
- `index.html` default title/description updated to the player SEO copy.
- Operator pages set `noindex, nofollow, noarchive` via `useDocumentMeta`
  client-side, reinforced by the `X-Robots-Tag` header from `middleware.ts`
  and the custom `robots.txt` response for that hostname.

### Files added
- `src/lib/siteMode.ts`, `src/OperatorApp.tsx`
- `src/content/playerLandingContent.ts`, `aboutPageContent.ts`,
  `operatorLandingContent.ts`, `operatorAccessContent.ts` (replaces the old
  combined `landingContent.ts`)
- `src/components/landing/tokens.ts`, `AtmosphericHero.tsx`, `DayMotif.tsx`,
  `StepSequence.tsx`, `ChallengePreviewGrid.tsx`, `WeekendSplit.tsx`,
  `SocialSection.tsx`, `MobileShowcase.tsx`, `SystemDiagram.tsx`,
  `PilotSteps.tsx`
- `src/components/operator/OperatorAccessGate.tsx`, `OperatorNav.tsx`,
  `OperatorContactForm.tsx`
- `src/pages/operator/OperatorOverviewPage.tsx`, `OperatorContactPage.tsx`,
  `OperatorDeckPage.tsx`
- `src/hooks/useDocumentMeta.ts`, `useOperatorSession.ts`
- `server/operatorAuth.ts`
- `api/operator-access.ts`, `operator-session.ts`, `operator-logout.ts`,
  `operator-contact.ts`
- `middleware.ts`
- `public/robots.txt`, `public/sitemap.xml`
- `DEPLOYMENT.md`

### Files modified
- `src/App.tsx` — site-mode branch; `/operators` now redirects to `/`.
- `src/components/landing/LandingNav.tsx` — player-only nav, no path to the
  operator site.
- `src/components/landing/LandingFooter.tsx` — removed the `/operators`
  footer link.
- `src/components/landing/CTASection.tsx`, `FeatureCards.tsx` — added an
  `operator` variant.
- `src/pages/PlayerLandingPage.tsx`, `AboutPage.tsx` — full redesign.
- `index.html` — updated default title/description.
- `src/index.css` — added restrained mist animation + `prefers-reduced-motion` handling.
- `package.json` — added `@vercel/edge` (used by `middleware.ts`).

### Files deleted
- `src/pages/OperatorLandingPage.tsx` (superseded by
  `src/pages/operator/OperatorOverviewPage.tsx`, now gated)
- `src/content/landingContent.ts` (split into the four content files above)

### Routes changed
- `survivethestreak.com`: new `/`, `/overview`, `/contact`, `/deck`.
- `surviveday30.com`: `/operators` now redirects to `/` instead of
  rendering a page. `/`, `/about`, `/play`, and all other existing routes
  unchanged.

### Environment variables added
`OPERATOR_ACCESS_CODE`, `OPERATOR_SESSION_SECRET` (required),
`OPERATOR_CONTACT_WEBHOOK_URL` (optional). None are `VITE_`-prefixed — all
server-only. See `DEPLOYMENT.md`.

### Remaining deployment steps
Attaching the three domains in the hosting dashboard, setting DNS records,
and setting the environment variables above are all external actions this
codebase cannot perform — see `DEPLOYMENT.md` for the exact steps and a
verification checklist. **Domain protection is not live until those steps
are completed and verified.**

### Known risks
- `middleware.ts` / `api/*.ts` use the Vercel Edge Middleware + Edge
  Functions model. If this project is not actually deployed on Vercel, none
  of the redirect/gating behavior will run until it's ported to the actual
  platform's equivalent — see "If you are not on Vercel" in `DEPLOYMENT.md`.
- The rate limiter in `server/operatorAuth.ts` is in-memory and per-instance
  — a determined attacker distributing requests across many cold starts
  could exceed the intended attempt cap. Fine as a first layer, not a
  substitute for a real distributed limiter if stronger protection is needed.
- Real asset images (backgrounds, game screenshots) were not present in the
  provided ZIP; all new visual components use `AssetIcon`'s existing
  graceful-fallback pattern, so they degrade cleanly if an image 404s, but
  should be reviewed once the real `/public/assets` files are back in the
  project.

## 2026-07-07 — Final Domain Architecture and Bundle Separation

### Summary
Locked in the final domain strategy and moved from a single React app that
branched on hostname in client JS, to **three genuinely separate Vite build
entries** with the server (Vercel Edge Middleware) deciding which one a
visitor receives. This is a stronger security boundary than the previous
approach: an unauthenticated visitor to the operator subdomain now never
downloads the operator proposition's JavaScript at all, not just a
React tree that chooses not to render it.

### Domain changes
- **Main domain flipped:** `survivethestreak.com` is now the player/game
  domain (previously it was the operator domain in the prior iteration).
- `surviveday30.com` and `survive30days.com` (+ `www`) are now pure
  redirect domains → `https://survivethestreak.com`.
- The operator/partner site moved to its own subdomain:
  `partners.survivethestreak.com`.

### Bundle separation
- `index.html` → `src/main-player.tsx` → `src/PlayerApp.tsx` (renamed from
  the previous `src/App.tsx`; the `getSiteMode()` hostname branch and the
  `OperatorApp` import were removed entirely from this tree).
- `operator-gate.html` (new) → `src/main-operator-gate.tsx` (new) →
  `src/OperatorAccessApp.tsx` (new) — contains only
  `OperatorAccessGate`, nothing else.
- `operator.html` (new) → `src/main-operator.tsx` (new) →
  `src/OperatorApp.tsx` (rewritten) — no gate UI in this bundle at all;
  session loss triggers a hard `window.location.href = '/'`, not a
  client-rendered gate.
- `vite.config.ts` — `build.rollupOptions.input` now declares all three HTML
  entries; `build.sourcemap` explicitly set to `false`.
- `src/lib/siteMode.ts` removed — hostname branching is now
  `middleware.ts`'s job, not client JS.

### Middleware changes (`middleware.ts`, rewritten)
- Redirects `surviveday30.com` / `survive30days.com` (+ `www`) → `https://survivethestreak.com`, preserving path + query, via 308.
- For `partners.survivethestreak.com`: verifies the session cookie itself
  (not just at the API layer) and uses the `x-middleware-rewrite` response
  header to serve `operator-gate.html` (no session) or `operator.html`
  (valid session) while keeping the browser's URL unchanged. Root `/` with
  a valid session redirects (307) to `/overview`.
- Serves a hostname-specific `Disallow: /` `robots.txt` and a 404 for
  `sitemap.xml` on the partner subdomain, plus `X-Robots-Tag: noindex,
  nofollow, noarchive` on every response there.
- For `survivethestreak.com`: redirects `/operators`, `/operator`,
  `/overview`, `/deck`, `/partner`, `/partners` to `/` at the edge, before
  any client JS runs.
- Real static assets (anything with a file extension) are explicitly passed
  through unmodified on every hostname, so the rewrite logic never
  intercepts the bundles' own JS/CSS/icon requests.

### Authentication
Unchanged in mechanism (HttpOnly/Secure/SameSite=Lax signed cookie via
`server/operatorAuth.ts`, `api/operator-access.ts`,
`api/operator-session.ts`, `api/operator-logout.ts`), now reinforced by the
edge-level rewrite above so the protection no longer depends solely on the
API layer.

### SEO changes
- `public/robots.txt` / `public/sitemap.xml` (player domain) updated to
  reference `survivethestreak.com` and disallow all operator-adjacent paths.
- `index.html` default title/description/canonical updated to the new
  primary domain; brand name unchanged ("Survive the Streak"), not renamed
  to "Survive Day 30".
- Partner subdomain robots/sitemap responses are now generated dynamically
  per-hostname in `middleware.ts` rather than relying on one static file
  that can't differ by domain.

### Files added
- `operator-gate.html`, `operator.html`
- `src/main-player.tsx`, `src/main-operator-gate.tsx`, `src/main-operator.tsx`
- `src/PlayerApp.tsx`, `src/OperatorAccessApp.tsx`
- `vercel.json`

### Files modified
- `src/OperatorApp.tsx` — rewritten, gate UI removed, hard-redirect on session loss.
- `middleware.ts` — rewritten for the new hostname map and HTML-level rewriting.
- `vite.config.ts` — multi-entry `rollupOptions.input`, `sourcemap: false`.
- `index.html` — updated title/description/canonical, script path.
- `public/robots.txt`, `public/sitemap.xml` — new domain.
- `src/content/playerLandingContent.ts`, `aboutPageContent.ts`,
  `operatorLandingContent.ts` — meta/URL/comment updates for the new domains.
- `api/operator-contact.ts` — webhook payload source label updated.
- `DEPLOYMENT.md`, `AI_HANDOFF_NOTES.md` — fully rewritten for the final architecture.

### Files removed
- `src/App.tsx` (replaced by `src/PlayerApp.tsx`)
- `src/main.tsx` (replaced by `src/main-player.tsx`)
- `src/lib/siteMode.ts` (hostname branching moved server-side)

### Build configuration
`npm run build` (`vite build`) now produces three HTML entries and their
associated JS/CSS from one command; output directory unchanged (`dist`).
No new build steps required in CI/CD beyond what Vercel already runs.

### Environment variables
Unchanged: `OPERATOR_ACCESS_CODE`, `OPERATOR_SESSION_SECRET` (required),
`OPERATOR_CONTACT_WEBHOOK_URL` (optional). See `DEPLOYMENT.md`.

### Known limitations
- The rewrite/redirect logic in `middleware.ts` uses Vercel-specific
  primitives (`x-middleware-rewrite`, `@vercel/edge`'s `next()`). Porting to
  another platform requires re-implementing the routing glue — see "If you
  are not on Vercel" in `DEPLOYMENT.md`. `server/operatorAuth.ts` itself is
  platform-agnostic (Web Crypto only) and can be reused as-is.
- Rate limiting remains in-memory/per-instance — explicitly MVP-level, not a
  distributed limiter.
- Local `vite` dev (without `vercel dev`) can't exercise the real
  cookie-gated flow; `OperatorApp` has a narrow, `DEV`-only allowance to
  still render for visual work in that case (see `DEPLOYMENT.md` → Local
  development). This branch is compiled out of production builds.

## 2026-07-07 — Bolt Preview Routing

### Summary
The current Bolt environment runs on a `.bolt.host`-style domain with no
custom domains attached, so `middleware.ts`'s hostname-based routing never
executes there. Added a dev-only Vite plugin that provides equivalent
behavior via **path-based** routing at `/partner-preview`, without changing
the final production hostname architecture or merging the three bundles
back together.

### Development path routing (Bolt / local dev only)
- `/` → player bundle (unchanged)
- `/partner-preview` → gate bundle (access form)
- `/partner-preview/overview`, `/partner-preview/contact`,
  `/partner-preview/deck` → protected operator bundle, gated by a real
  (preview-only) server-side session check
- Implemented in `vite-plugins/partnerPreview.ts` via Vite's
  `configureServer` / `configurePreviewServer` hooks — runs only inside
  `vite dev` / `vite preview`, never present in the production static build.

### Production hostname routing (unchanged, reconfirmed)
- `survivethestreak.com` → player bundle
- `partners.survivethestreak.com` → gate or protected operator bundle
- `surviveday30.com`, `survive30days.com` (+`www`) → redirect to `survivethestreak.com`
- `/partner-preview` (+ subpaths) now explicitly redirects to `/` on the
  production player hostname, at both `middleware.ts` and
  `PlayerApp.tsx`'s client-side blocked-path list — it must never work as a
  real route there.

### Preview environment variables
- `PARTNER_PREVIEW_CODE` — preview-only access code, read server-side
  only (`process.env` inside the Vite plugin), never referenced in client
  code, never the real `OPERATOR_ACCESS_CODE`. Deliberately **not**
  `VITE_`-prefixed, since Vite treats `VITE_*` variables as potentially
  client-exposed and an access code shouldn't carry that risk.
- `VITE_ENABLE_PARTNER_PREVIEW` — optional explicit override for
  `getPartnerBasePath()` when the auto-detected hostname patterns
  (`localhost`, `*.bolt.host`, `*.webcontainer-api.io`, `*.stackblitz.io`)
  don't match the actual Bolt domain.

### Authentication differences (preview vs. production)
Both are genuinely server-side (not client React state), but the preview
gate uses: a separate cookie name (`ss_operator_preview` vs. `ss_operator`),
an ephemeral per-process signing secret (vs. `OPERATOR_SESSION_SECRET`), no
`Secure` cookie flag (Bolt/local dev may be plain HTTP internally), and the
same best-effort in-memory rate limiter as production (itself MVP-level). A
visible "Preview Environment" badge renders on the gate and protected nav
whenever this mode is active.

### Files added
- `vite-plugins/partnerPreview.ts` — dev-only Node middleware plugin.
- `src/lib/previewHostname.ts` — shared hostname-pattern detection (Node + browser).
- `src/lib/partnerBasePath.ts` — `getPartnerBasePath()` / `isPartnerPreviewActive()`.

### Files modified
- `vite.config.ts` — registers `partnerPreviewPlugin()`.
- `src/OperatorApp.tsx` — `BrowserRouter basename={getPartnerBasePath()}`; redirect-on-session-loss now base-path aware; refined DEV bypass so "Lock Access" is still visibly testable in preview.
- `src/OperatorAccessApp.tsx` — post-access redirect now base-path aware.
- `src/components/operator/OperatorNav.tsx`, `OperatorAccessGate.tsx` — "Preview Environment" badge.
- `middleware.ts` — blocks `/partner-preview` (+ subpaths) on the player hostname.
- `src/PlayerApp.tsx` — blocks `/partner-preview` (+ subpaths) client-side too.
- `package.json` — added `@types/node` devDependency (used by the new Node-based dev plugin).
- `DEPLOYMENT.md`, `AI_HANDOFF_NOTES.md` — restructured with explicit "Bolt development" vs. "final production" sections.

### Known limitations
- Preview sessions don't survive a dev-server restart (ephemeral secret, by design).
- Bolt's exact preview hostname pattern wasn't independently confirmed — the
  auto-detector covers common patterns (`*.bolt.host`, `*.webcontainer-api.io`,
  `*.stackblitz.io`) plus an explicit `VITE_ENABLE_PARTNER_PREVIEW` override
  as a fallback if none match.
- The dev plugin assumes a Node runtime with global Web Crypto
  (`crypto.subtle`), available in Node 19+; if Bolt runs an older Node
  version this would need a polyfill.

## 2026-07-07 — Preview Code Env Var Correction

Renamed the preview-only operator access code environment variable from
`VITE_PARTNER_PREVIEW_CODE` to `PARTNER_PREVIEW_CODE`. Vite treats any
`VITE_*`-prefixed variable as potentially client-exposed (it's the exact
mechanism used to opt a variable *into* `import.meta.env` on the client),
so an access code should never carry that prefix even when nothing
currently reads it client-side — the prefix itself is the risk, not just
actual usage. `VITE_ENABLE_PARTNER_PREVIEW` is unaffected and correctly
keeps the prefix, since it's a non-secret boolean switch.

**Files changed:** `vite-plugins/partnerPreview.ts` (reads
`process.env.PARTNER_PREVIEW_CODE`), `DEPLOYMENT.md`, `AI_HANDOFF_NOTES.md`
(rule references updated).

No behavior change — this is a naming/hygiene correction only. Set
`PARTNER_PREVIEW_CODE` (not `VITE_PARTNER_PREVIEW_CODE`) in your Bolt
environment variables going forward.
