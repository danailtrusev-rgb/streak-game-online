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

## 2026-07-07 — Private Bolt Operator Preview

### Summary
Bolt Hosting publishes this project as a static Vite build — no dev server,
no serverless functions, no Vercel Edge Middleware. That meant neither the
production operator gate nor the earlier `/partner-preview` dev-plugin
mechanism could work there (`/api/operator-access` 404s; `operator.html`'s
router expects a `/partner-preview` basename that doesn't exist on a static
host). Added a fourth, fully static, hash-routed operator preview entry
that needs no server at all, so the team can review the operator website
on the current private `.bolt.host` URL.

### What was added
- `operator-preview.html` → `src/main-operator-preview.tsx` →
  `src/OperatorPreviewApp.tsx` — independent Vite entry, `HashRouter`-based
  (`#/overview`, `#/contact`, `#/deck`), zero calls to any `/api/operator-*`
  endpoint.
- Runtime hostname gate (`src/lib/previewHostname.ts`, already existed for
  the dev plugin, reused here): renders a neutral "Not found." on any
  hostname other than `localhost` / `*.bolt.host` /
  `*.webcontainer-api.io` / `*.stackblitz.io` / an explicit
  `VITE_ENABLE_PARTNER_PREVIEW=true`.
- `OperatorPreviewNav` — "Exit Preview" (hard nav to `/`) instead of "Lock
  Access"; no fake sign-out since there's no session.
- `OperatorContactForm` gained a `previewMode` prop: submitting shows
  *"Preview only — form delivery will be enabled on the production partner
  environment"* instead of calling `/api/operator-contact`.
- Visible "Preview Environment" badge + a persistent notice banner
  ("Internal preview only. Production partner access will use server-side
  authentication.").
- **Refactor for reuse:** `OperatorOverviewPage`, `OperatorContactPage`,
  `OperatorDeckPage` now accept a `nav: ReactNode` prop instead of directly
  rendering `OperatorNav` — so the production/dev-preview app (which passes
  `<OperatorNav onLockAccess={lock} />`) and this new static preview (which
  passes `<OperatorPreviewNav onExit={...} />`) share the exact same page
  bodies (hero, sections, copy) without duplicating them.
- New `OperatorFooter` (real `<a href>` to the player domain, not a
  react-router `Link`) replaces the player-site `LandingFooter` on all
  operator pages — fixes a pre-existing bug where the footer's "Play" /
  "About" links resolved as broken internal routes inside the operator
  app's own router instead of navigating to the actual player site.

### Access control
None, by design. The Bolt project's own **Private** visibility setting is
the access control for this preview — no `PARTNER_PREVIEW_CODE`, no
`OPERATOR_ACCESS_CODE`, no localStorage flags, no hardcoded password.

### Production architecture
Unchanged. `middleware.ts`, `api/operator-*.ts`, `OPERATOR_ACCESS_CODE`,
`OPERATOR_SESSION_SECRET`, and the production `operator-gate.html` /
`operator.html` selection logic are untouched. Additionally hardened:
`middleware.ts`'s asset-passthrough check now excludes `.html` files, so
`operator.html`, `operator-gate.html`, and `operator-preview.html` can
never be served by directly requesting their filename on a hostname that
shouldn't expose them (previously only true HTML *routing* was covered by
the hostname logic; a direct filename request could have bypassed it).
`operator-preview.html` is also explicitly added to `middleware.ts`'s and
`PlayerApp.tsx`'s blocked-path lists on the player hostname.

### Build
`npm run build` now emits a fourth entry: `dist/operator-preview.html`
alongside `dist/index.html`, `dist/operator-gate.html`, `dist/operator.html`.

### Files added
- `operator-preview.html`, `src/main-operator-preview.tsx`, `src/OperatorPreviewApp.tsx`
- `src/components/operator/OperatorPreviewNav.tsx`, `OperatorFooter.tsx`

### Files modified
- `vite.config.ts` — fourth build entry + updated comment block.
- `middleware.ts` — `.html`-aware asset check; `operator-preview.html` / `/operator-preview` added to the player-hostname block list.
- `src/PlayerApp.tsx` — `/operator-preview` added to the client-side block list.
- `src/OperatorApp.tsx` — builds the production nav element once, passes it via the new `nav` prop.
- `src/pages/operator/OperatorOverviewPage.tsx`, `OperatorContactPage.tsx`, `OperatorDeckPage.tsx` — `onLockAccess` prop replaced with `nav: ReactNode`; switched from `LandingFooter` to `OperatorFooter`; `OperatorContactPage` gained `previewMode`.
- `src/components/operator/OperatorContactForm.tsx` — `previewMode` prop, preview-only status message.

### Known limitations
- The static preview has no real authentication — it is exactly as private
  as the Bolt project's own visibility setting, and no more. Do not treat
  it as equivalent to production security.
- The in-page anchor "How It Works / Use Cases / Formats" links from the
  production `OperatorNav` weren't extended to the preview nav (cross-route
  anchor+navigate combinations don't work reliably under `HashRouter`
  without more plumbing); `OperatorPreviewNav` links to whole pages only
  (Overview / Pilot / Contact).

## 2026-07-07 — Operator Site Extraction

### Summary
The operator/partner website has been permanently removed from this
codebase and rebuilt as a completely independent PHP 8 project
(`survive-the-streak-operator-site/`, delivered separately). This project
returns to being a single-purpose player/game Vite app: one entry point, no
multi-domain routing complexity, no operator session machinery.

### Why
Final architectural decision: the operator site will be hosted separately,
on PHP 8 hosting, with no React/Vite/Node dependency and no runtime
connection to the player codebase. Keeping two completely different
products (a Supabase-backed game and a static marketing/lead-gen site) in
one repository/build pipeline was unnecessary complexity once that decision
was made.

### Files removed
- `operator.html`, `operator-gate.html`, `operator-preview.html`
- `src/OperatorApp.tsx`, `src/OperatorAccessApp.tsx`, `src/OperatorPreviewApp.tsx`
- `src/main-operator.tsx`, `src/main-operator-gate.tsx`, `src/main-operator-preview.tsx`
- `src/pages/operator/` (`OperatorOverviewPage.tsx`, `OperatorContactPage.tsx`, `OperatorDeckPage.tsx`)
- `src/components/operator/` (`OperatorAccessGate.tsx`, `OperatorContactForm.tsx`, `OperatorNav.tsx`, `OperatorPreviewNav.tsx`, `OperatorFooter.tsx`)
- `src/content/operatorLandingContent.ts`, `src/content/operatorAccessContent.ts`
- `src/hooks/useOperatorSession.ts`
- `src/lib/partnerBasePath.ts`, `src/lib/previewHostname.ts`
- `vite-plugins/partnerPreview.ts`
- `api/operator-access.ts`, `api/operator-session.ts`, `api/operator-logout.ts`, `api/operator-contact.ts`
- `server/operatorAuth.ts`
- `vercel.json` (its only content was excluding the now-gone operator HTML files from the SPA rewrite)
- `src/components/landing/FeatureCards.tsx`, `SystemDiagram.tsx`, `PilotSteps.tsx`, `OperatorUseCases.tsx` (operator-only, unused by any player page)
- `src/components/landing/tokens.ts` (unused dead code, predates this cleanup — never actually imported anywhere)
- `src/App.tsx` (old name `PlayerApp.tsx`) and `src/main.tsx` (old name `main-player.tsx`) — **renamed back**, not deleted, now that they're the only entry.

### Files modified
- `vite.config.ts` — reverted to a single build entry (`index.html` only), no `rollupOptions.input`.
- `middleware.ts` — reduced to just the two-domain redirect (`surviveday30.com` / `survive30days.com` → `survivethestreak.com`); all operator-hostname/session/robots logic removed.
- `src/App.tsx` — operator-blocking route list simplified to two harmless legacy redirects (`/operators`, `/operator` → `/`); removed the now-meaningless `/partner-preview`, `/overview`, `/deck`, etc. entries since there's no operator content anywhere in this codebase to protect against exposing.
- `src/components/landing/AtmosphericHero.tsx`, `CTASection.tsx` — removed the dead `variant="operator"` styling branch; player pages never used it.
- `public/robots.txt` — removed operator-path `Disallow` entries (`/operators`, `/overview`, `/deck`, `/partner`, `/partners`), kept `/sys/admin`.
- `package.json` — removed `@vercel/edge` and `@types/node` (only needed by the removed operator middleware/dev-plugin code).
- `index.html` — script path updated to `/src/main.tsx`.
- `DEPLOYMENT.md`, `AI_HANDOFF_NOTES.md` — fully rewritten for the single-project, player-only scope.

### Verification performed
- Static import-graph walk from `src/main.tsx`: 117 files reached, zero
  references to any removed operator file.
- Full-project grep for "operator"/"partner": only legitimate remaining
  hits are (a) the two harmless legacy-redirect paths and their comments,
  and (b) pre-existing "no operator language" reminders inside the player
  content-file comments — nothing functional left behind.
- Confirmed the small set of pre-existing orphaned files (unrelated to this
  cleanup — `GameTile.tsx`, `fx/*`, `PageTransition.tsx`, etc.) were already
  unreferenced from `main.tsx` before this change and remain untouched.

### Known limitations
- Could not actually run `npm install && npm run build` in the environment
  this cleanup was performed in (no network access) — the changes were
  verified via static analysis (import graph + grep sweep) rather than a
  real build. Recommend running a real build before deploying.

## 2026-07-13 — Result Messaging System (Phase 1: result screen)

Implemented the priority-selected, four-part result messaging system
(headline / consequence / tomorrow hook / action) per the STS Result
Messaging and Reactivation System spec, for the survive/fail result
screen. Cashout-as-its-own-screen, next-day reactivation pushes, and
last-call reminders are **not** part of this pass — see "Out of scope"
below.

### Bug found and fixed along the way
`ResultModal.tsx` was calling translation keys (`result.survived.headline`,
`result.survived.cta`, `result.died.headline`, `result.died.cta`,
`result.died.streak_ended`, `result.died.no_streak`, etc.) that do not
exist in any Supabase migration — the only seeded `result.*` keys use an
older, differently-named scheme (`result.survived_title`,
`result.fell_header`, etc.) that the component never actually calls. The
user confirmed no manual admin edits were made, so in production this
almost certainly meant the core result-screen headline and CTA were
rendering as raw untranslated keys instead of real copy. This change
removes the dependency on those specific missing keys entirely (see
"Translation system" below), which fixes this as a side effect. The
smaller peripheral labels that still use `t()` (`result.next_gate`,
`result.view_streak_path`, `result.milestone_reached`,
`result.milestone_conquered`, `result.survived.cashout`,
`result.survived.cashing_out`) were left as-is — same risk, but out of
scope for this change; worth a separate audit of the `translations` table.

### Added
- `src/lib/resultMessages.ts` — the message catalog and selection logic:
  - 5 survive categories (`personal_best`, `milestone_eve`,
    `qualification_progress`, `long_streak`, `standard`), 4 fail categories
    (`near_milestone`, `long_streak`, `qualification_retained`,
    `standard`), each with 2–3 variants, matching the spec's copy.
  - `selectResultMessage()` implements the exact priority order from the
    spec's section 10 (survive: personal best → near milestone →
    qualification progress → long/high-value streak → standard; fail: near
    milestone → long streak → qualification retained → standard). Exactly
    one message is selected per result.
  - Deterministic-but-varied variant picking (hashed on `play_id`) so a
    given result always renders the same variant on re-render, but
    consecutive days naturally vary.
  - All dynamic values come from real app data only — see "Data mapping"
    below for what had to be adapted or dropped versus the spec's variable
    list.

### Modified
- `src/components/game/ResultModal.tsx` — headline/consequence/tomorrow-hook/CTA
  now come from the selected message object instead of a flat subtitle
  pool + static translation keys. New optional props: `previousBestStreak`
  and `qualification`.
- `src/lib/gateUtils.ts` — removed `surviveSubtitle`, `dieSubtitle`,
  `nextGateCopy`, `dieTomorrowCopy` (superseded by `resultMessages.ts`).
  `MILESTONES`, `getMilestoneInfo`, and the countdown helpers are
  unchanged and still used.
- `src/pages/HomePage.tsx` — added `prevMaxStreakRef`, snapshotted
  immediately before each `play()` call (so personal-best detection
  compares against the streak the player actually held before this
  attempt, not an already-updated value). Passes `previousBestStreak` and
  the existing `qualification` object into `ResultModal`.

### Data mapping — spec variables vs. what actually exists
| Spec variable | Status |
|---|---|
| `{streak_day}`, `{next_streak_day}` | Available (`result.streak`, milestone target) |
| `{next_milestone}`, `{milestone_name}` | Available as a number only — no named milestones exist in the game content, so `milestone_name` is rendered as "Day {n}", not invented lore |
| `{time_until_next_play}` | Available (existing midnight countdown) |
| `{best_streak}` | Available (`game_state.max_streak`) — used for personal-best detection |
| `{activity_streak}` | **Does not exist.** No separate "Activity Streak" concept is tracked anywhere in the schema. `fail_activity_retained` category from the spec was not implemented — implementing it would mean inventing a new streak type, which needs a product/backend decision, not a copy change. |
| `{active_days_this_week}` / `{required_active_days}` | **Does not exist in this form.** The real qualification system (`QualificationStatus`) is points-based (`total_points` / `sat_pts_threshold`), not day-count-based. The qualification-progress messages were adapted to use points instead of "active days" — copy was reworded accordingly rather than fabricating a day-count that isn't tracked. |
| `{current_streak_value}` / `{next_streak_value}` / `{cashout_value}` | Partially available — `pot_cents` is the closest real equivalent; distinct "streak value" vs. "cashout value" framing wasn't implemented since the game doesn't currently distinguish them. |
| `{percentage_reaching_day}` | **Does not exist.** No backend stat computes this. Per the spec's own instruction ("use only when it comes from genuine backend data"), this variable and the `fail_long_streak` variant that used it were **not** implemented. |
| `{hours_remaining}`, `{daily_cutoff_time}` | **Does not exist.** No last-call system exists yet (see "Out of scope"). |

### Out of scope for this pass (flagged, not silently dropped)
- **Cashout as its own result screen.** The spec wants a dedicated
  headline/body/tomorrow-hook/CTA screen for cash-out. Today, cashing out
  is a small inline text action within the survive screen, not a separate
  result state. Needs a UI-flow decision (new phase/screen) before this
  can be built correctly.
- **Next-day reactivation messages** and **last-call messages** are
  notification/reminder touchpoints, not result-screen content. The
  existing notification infrastructure (`useNotifications`, the
  `notifications` Supabase edge function) currently only handles contact
  **verification**, not scheduled/triggered sends — it's explicitly marked
  `PENDING PROVIDER` for actual delivery. Building these two features
  requires that delivery path to actually work first; wiring up copy
  without working delivery would mean a "Remind Me Tomorrow" button that
  doesn't remind anyone. Recommend scoping this as its own follow-up once
  the notification provider decision is made.
- `fail_activity_retained` and the personal-best-adjacent fail category —
  see "Data mapping" above.

### Translation system
This message catalog is implemented as a TypeScript module, not wired
into the DB-driven `translations` table / admin UI. These are variant
*pools* with interpolated variables, not single flat UI strings, and
threading that through the existing async translation loader would be a
larger, separate change. If multi-language support is needed for these
specific messages later, each variant's four fields should become
translation keys (e.g. `result.survive_standard.v1.headline`) fed through
the existing `t()` + `interpolate()` pipeline instead.

### Known limitations
- Could not run the app or execute TypeScript compilation in this
  environment (no network access, no dev server) — verified via brace/paren
  balance checks and manual review only. Recommend running `npm run build`
  and a real playthrough (survive, fail, near-milestone, personal-best
  scenarios) before deploying.
- Personal-best detection depends on `prevMaxStreakRef` being set via the
  live `handleConfirmStake` flow; the recovery path (reloading mid-flow) 
  falls back to 0, meaning a personal best achieved right before a reload
  won't be detected as one — degrades gracefully to the next-priority
  message rather than showing incorrect data.

## Result Messaging Phase 1 — Audit and Hardening

Focused audit and hardening pass on the result messaging system shipped
in the previous entry. No cashout screens, scheduled notifications,
activity-streak concepts, fake statistics, or new database features were
added — this pass only corrects the existing survive/fail messaging.

### Bugs found

1. **Missing-history sentinel bug.** `previousBestStreak` defaulted to
   `0` when unavailable (e.g. the result-recovery path), which is a real,
   meaningful value (a brand-new player's actual best), not a safe
   "unknown" marker. A recovered result could have silently under- or
   over-classified personal-best status. Fixed by making the value
   `number | null` end-to-end — `null` now means "unknown" and the
   personal-best category is skipped entirely rather than guessed.
2. **Qualification messaging fired too broadly.** The original condition
   was just "a qualification object exists and points are below
   threshold" — true for most of a season for most players, regardless of
   whether *this specific result* changed anything. Fixed with a real
   before/after comparison (see "Qualification-message condition" below);
   when the "before" snapshot is unavailable, the category is skipped
   rather than assumed.
3. **Milestone math produced negative day counts and non-absolute
   targets for any streak of 30+.** `getMilestoneInfo(30)` previously
   returned `{ target: 1, daysLeft: -29 }` — both wrong. Root cause:
   `nextMilestone()`'s wrap-cycle return value (a bare relative `1`) was
   used directly as an absolute day number. Fixed with a new
   `nextMilestoneAbsolute()` that correctly converts the prestige-cycle
   wrap into an absolute day number; `getMilestoneInfo(30)` now correctly
   returns `{ target: 31, daysLeft: 1 }`.
4. **Seven translation keys used by the result screen have never existed
   in any migration, under any key name, in any language** — not just the
   two (`headline`/`cta`) fixed in the previous pass.
   `result.survived.day_badge`, `result.milestone_reached`,
   `result.milestone_conquered`, `result.view_streak_path`,
   `result.survived.cashout`, `result.survived.cashing_out`, and
   `result.died.games_nudge` were all confirmed missing by direct
   inspection of every `supabase/migrations/*.sql` file. In production
   these rendered as raw keys. Fixed using the app's own existing
   `STATIC_FALLBACKS` mechanism in `src/lib/i18n.ts` (see table below) —
   this is the same fallback path the app already uses elsewhere, not a
   new or competing translation scheme.
5. **CTA labels promised an unimplemented feature.** Five variants used
   "Remind Me Tomorrow" / "Set My Reminder" / "Remind Me" as their CTA
   label, but the button just closes the modal like every other CTA — no
   reminder is ever scheduled (the notification system only handles
   contact verification, not sends). Relabelled to "Return Tomorrow" /
   "Come Back Tomorrow" / "Continue the Run" — same tone, no false promise.
6. **Interpolation could render literal `"null"`/`"NaN"` text.** The
   original `fill()` only guarded against `undefined`. Hardened to treat
   `null` and non-finite numbers the same way (falls back to the
   `{placeholder}` token, matching the app's existing `interpolate()`
   convention in `i18n.ts` — never a literal `"null"`/`"NaN"` string).
7. **`pick()`'s variant selector had no defined behavior for an empty
   seed.** Hardened to deterministically return the first variant rather
   than relying on `hash % length` behavior with an empty string (which
   happened to still work, but wasn't guaranteed by the code).

### Previous-best fix
`previousBestStreak` is now `number | null` in `ResultMessageContext` and
the `ResultModal` prop (default `null`, never `0`). `isPersonalBest()`
returns `false` immediately when the value is `null` — personal-best
detection is skipped, not inferred. Verified against all 5 required
scenarios (see `scripts/verify-result-messages.ts`, all passing):

| Scenario | Result |
|---|---|
| Previous best 10, new streak 11 | `personal_best` |
| Previous best 10, new streak 10 | not `personal_best` |
| Previous best 10, new streak 9 | not `personal_best` |
| Previous best unavailable, new streak 1 | not `personal_best` |
| Previous best unavailable, new streak 20 | not `personal_best` |

### Translation-key audit
| Key | Used by | In migrations? | Fallback added | Action |
|---|---|---|---|---|
| `result.next_gate` | ResultModal (survive + die countdown) | Yes (en/es/pt) | Already had one | None — already correct |
| `result.survived.day_badge` | ResultModal (survive day badge) | No | Yes, `STATIC_FALLBACKS` | Added fallback |
| `result.milestone_reached` | ResultModal (milestone badge) | No | Yes, `STATIC_FALLBACKS` | Added fallback |
| `result.milestone_conquered` | ResultModal (milestone badge) | No | Yes, `STATIC_FALLBACKS` | Added fallback |
| `result.view_streak_path` | ResultModal (toggle button) | No | Yes, `STATIC_FALLBACKS` | Added fallback |
| `result.survived.cashout` | ResultModal (cashout button) | No | Yes, `STATIC_FALLBACKS` | Added fallback (with `{amount}`) |
| `result.survived.cashing_out` | ResultModal (cashout button, loading state) | No | Yes, `STATIC_FALLBACKS` | Added fallback |
| `result.died.games_nudge` | ResultModal (die screen nudge) | No | Yes, `STATIC_FALLBACKS` | Added fallback |
| `result.survived.headline`, `result.survived.cta`, `result.died.headline`, `result.died.cta`, `result.died.streak_ended`, `result.died.no_streak` | ResultModal | No | N/A | Already removed in the previous pass — replaced by `resultMessages.ts`, no longer call `t()` at all |

No raw key can currently reach the screen: seeded keys render seeded
text, unseeded keys fall through to `STATIC_FALLBACKS`, and the six
headline/CTA/consequence keys no longer exist as `t()` calls at all.

### Priority-condition verification
All scenarios below were run through `selectResultMessage()` directly
(see `scripts/verify-result-messages.ts`) — exactly one category wins in
every case, no competing headlines are ever rendered:

| Scenario | Winning category |
|---|---|
| Personal best one day before a milestone | `personal_best` (survive priority 1 beats priority 2) |
| Long streak one day before a milestone | `milestone_eve` (priority 2 beats priority 4) |
| Qualification progress and personal best | `personal_best` (priority 1 beats priority 3) |
| Qualification progress and long streak | `qualification_progress` (priority 3 beats priority 4) |
| Failure one day before a milestone during a long streak | `near_milestone` (fail priority 1 beats priority 2) |
| Failure with a qualification object present but no genuine relevance (no proven points change, or already qualified) | `standard` — falls through rather than guessing |

### Milestone-condition results
Fixed and verified (`scripts/verify-result-messages.ts`):
- Streak 30 (just hit the final milestone) → target 31, daysLeft 1 (was: target 1, daysLeft −29)
- Streak 31 → target 33, daysLeft 2
- Streak 45 → daysLeft still non-negative
- Streak 5 (unwrapped, ordinary case) → target 7, daysLeft 2 — unchanged, confirms the fix didn't disturb the non-wrapped path
- Milestone names remain `Day {n}` throughout — no invented milestone lore was added, per instruction

### Qualification-message condition
Exact rule implemented: qualification-progress messaging requires **all**
of —
1. A qualification object is present,
2. The player is not already qualified (`!alreadyQualified`),
3. A real, positive points threshold exists,
4. A genuine "before this play" points snapshot exists (`pointsBefore !== null`),
5. Points after this play are strictly greater than points before it (proof this result changed something), and
6. Points after are still below threshold.

If any of these can't be proven from real data, selection falls through
to the next priority category. `HomePage.tsx` now snapshots
`qualification.total_points` into `prevQualificationPointsRef` immediately
before each play, mirroring the `previousBestStreak` pattern.

### Variant-stability results
Verified directly: identical context → identical `messageId` across
repeated calls (stable across re-renders and modal open/close); empty
seed → deterministic first variant, not random; different seeds vary.
`ResultModal`'s `variantSeed` now falls back to
`` `${outcome}-${streak}-${pot_cents}` `` if `play_id` were ever falsy,
rather than depending on it unconditionally. No `Math.random()` is used
anywhere in this module.

### Dynamic interpolation
`fill()` now treats `undefined`, `null`, and non-finite numbers
identically (all fall back to the `{placeholder}` token — consistent with
the app's existing `interpolate()` convention, never a literal
`"null"`/`"undefined"`/`"NaN"` string). `buildVars()` clamps to safe,
non-negative numbers. Verified: no raw `{placeholder}` tokens and no
`null`/`undefined`/`NaN` substrings appear in any generated message across
the test scenarios.

### CTA audit
| CTA source | Label examples | Real action | Notes |
|---|---|---|---|
| Survive primary CTA (all categories) | "Protect My Streak", "Continue Tomorrow", "Defend My Record", etc. | Closes the modal (`handleClose`) | No reminder-promising labels remain |
| Die/fail primary CTA (all categories) | "Start Again Tomorrow", "Beat My Record", "Return Tomorrow", etc. | Closes the modal (`handleClose`) | Does not auto-trigger a new attempt |
| "View Streak Path" | Fixed label | Toggles local component state | No navigation, no missing key |
| "Cash Out €{amount}" | Fixed label | Closes modal, navigates to `/pot` | Does **not** execute a cashout directly — `/pot` has its own `ConfirmModal` before anything is actually cashed out; confirmed by inspection of `PotPage.tsx` |

### Tests run
- `scripts/verify-result-messages.ts` — a plain, dependency-free script
  (no test framework is configured in this project; adding one was judged
  out of scope for an audit pass per the "without introducing a large
  dependency" instruction). Actually executed via `npx tsx
  scripts/verify-result-messages.ts` in this environment — **25/25
  checks passed**, covering personal-best edge cases, full survive/fail
  priority ordering including overlap scenarios, variant stability,
  interpolation safety, and the milestone math fix.
- `npx tsc --noEmit` — attempted but not meaningful: this project's
  `node_modules` is not installed in this environment and the real npm
  registry returned `403 Forbidden` on package downloads here, so the
  compiler fails on missing `react`/`react-router-dom`/`lucide-react`
  type declarations project-wide, unrelated to this change. Recommend
  running `npm install && npx tsc --noEmit && npm run build` in a normal
  environment before deploying.
- Manual review of `ResultModal.tsx`/`HomePage.tsx` (brace/paren balance
  check + read-through) — these two React files couldn't be executed
  directly here (JSX needs `react` resolved), unlike the pure-logic files.

### Out of scope (unchanged from the previous pass)
- Dedicated cashout result screen
- Next-day scheduled messages / last-call notifications (blocked on a
  working notification-delivery provider, not just copy)
- Activity streak (no such concept exists in the schema)
- Percentage-reaching-day statistics (no backend stat computes this)
- A new notification provider, a new translation admin interface, or any
  new economy logic

### Files modified
- `src/lib/resultMessages.ts` — nullable `previousBestStreak`, real
  qualification before/after comparison, hardened `fill()`/`pick()`,
  non-promising CTA labels.
- `src/lib/gateUtils.ts` — fixed the prestige-cycle wraparound bug in
  `getMilestoneInfo()`/`daysToNextMilestone()` via a new
  `nextMilestoneAbsolute()`.
- `src/components/game/ResultModal.tsx` — nullable
  `previousBestStreak`/new `previousQualificationPoints` prop, safer
  `variantSeed` fallback.
- `src/pages/HomePage.tsx` — `prevMaxStreakRef`/`prevQualificationPointsRef`
  now nullable, never defaulted to `0`.
- `src/lib/i18n.ts` — 7 missing result-screen keys added to the existing
  `STATIC_FALLBACKS` map.
- `scripts/verify-result-messages.ts` (new) — the executed verification
  script described above.

### Remaining limitations
- Could not run `npm install`, `tsc`, or `npm run build` for real in this
  environment (registry access is blocked here) — the pure-logic modules
  (`resultMessages.ts`, `gateUtils.ts`) were verified by actually
  executing them with `tsx`; the React components were verified by
  balance-checking and manual review only. Run the real build before
  deploying.
- The seven newly-fallback-covered translation keys still don't exist in
  the `translations` table itself — `STATIC_FALLBACKS` is a safety net,
  not a substitute for adding real seeded rows (and real es/pt
  translations) if multi-language support for these specific strings
  matters. Worth a follow-up migration.

## Cashout Experience — Phase 2

Built the four-stage cashout experience (confirm → processing → success →
error) as a single shared component, reusing the existing backend and
confirmation logic rather than duplicating it. No new payout mechanism,
no notifications, no activity streaks, no fake statistics, no new economy
rules — this is a UX/reliability pass on top of what already existed.

### Existing cashout architecture found (inspected before changing anything)
- **RPC**: `cashout_game(p_game_id, p_idem_key)` — a single atomic
  `SECURITY DEFINER` Postgres function
  (`supabase/migrations/20260504072020_*.sql`). It: authenticates via
  `auth.uid()`, row-locks the player's `game_state` (`FOR UPDATE`), hard-guards
  on `pot_cents = 0` (raises `'No pot to cash out'`), inserts a
  `wallet_ledger` row (`type='CASHOUT'`), updates
  `wallet_balance_cache.balance_cents`, and resets `game_state.current_streak`
  and `pot_cents` to 0 — all inside one transaction.
- **Real idempotency mechanism** (not what it looks like at first glance):
  `p_idem_key` is generated client-side (`crypto.randomUUID()` in
  `useGame.ts`) on every call but was **never actually checked or stored**
  by the original function — it was decorative. The **real** protection is
  the row lock + zero-pot guard: a second concurrent/duplicate call blocks
  on the lock, then finds `pot_cents` already 0 and is safely rejected.
  Because the function is a single atomic transaction, any error response
  means the *entire* transaction rolled back — there is no partial-state
  case to worry about server-side.
- **Frontend**: `useGame().cashout()` (`src/hooks/useGame.ts`) — already
  called the real RPC correctly, no changes needed to its core logic.
  `/pot` (`PotPage.tsx`) already had a real confirmation modal and a real
  (if minimal) success screen — this was legitimate, working
  infrastructure, not a placeholder.
- **Day 30 / badges**: confirmed by inspection that milestone badges are
  awarded at **play time** (a DB trigger on the `plays` table, read via
  `fetchBadgesForPlay`), completely independent of `cashout_game()`, which
  never touches `user_badges`. Cashing out on Day 30 does not affect, skip,
  or duplicate the Day 30 badge — they are genuinely separate events, as
  the task predicted.
- **Qualification**: confirmed `cashout_game()` never touches any
  qualification/weekly-participation table. Cashing out does not reset or
  affect Saturday/Sunday qualification progress.
- **Leave-game guard**: confirmed the "Leave this game?" prompt
  (`game.leave_confirm`) only exists in `MicrogamePage.tsx`, for an
  *active, in-progress* attempt. It was never wired into `/pot` or the
  survive-result screen, so the cashout flow already didn't (and still
  doesn't) trigger it — no fix needed, just confirmed by inspection.
- **KYC / currency**: no KYC concept exists anywhere in the schema — none
  was added. No multi-currency support exists anywhere in the project —
  every existing screen hardcodes `€` + `formatCents()`; the new UI follows
  the same established convention rather than inventing currency
  infrastructure that doesn't exist elsewhere.

### What changed
1. **`cashout_game` migration (additive only)** — new migration
   `20260713120000_20260713_cashout_game_transaction_id.sql`, same
   signature and same core logic/locking as the live function. Now
   returns `transaction_id` (the real `wallet_ledger` row id) and
   `currency` ('EUR'), and records `p_idem_key` in the ledger row's `meta`
   for audit trail. The row-lock + zero-pot protection is unchanged — this
   migration does not touch, rewrite, or reinterpret any existing ledger
   row.
2. **`src/components/game/CashoutFlow.tsx`** (new) — the single, shared
   four-stage experience, used identically by both the survive-result
   screen and `/pot` (Option B from the brief: one reusable component, no
   duplicated logic).
3. **`src/lib/cashoutMessages.ts`** (new) — centralized, code-based copy
   (same MVP strategy as `resultMessages.ts`), safe interpolation, no
   fabricated values.
4. **`ResultModal.tsx`** — the old tiny underlined "Cash Out €X" text link
   (which called a parent-supplied `onCashout` callback that just
   navigated to `/pot`) is replaced with a clearer secondary button that
   opens `CashoutFlow` directly, in context, without leaving the result
   screen. The `onCashout`/`cashingOut` props are removed — the parent no
   longer needs to know about cashout at all, since `CashoutFlow` calls
   the RPC itself. A successful cashout now also closes the (now-stale)
   result screen once the player dismisses the success stage, so a
   "Day 8 survived" screen can never linger after the streak was just
   reset to 0.
5. **`PotPage.tsx`** — the bespoke `ConfirmModal` component and the inline
   `cashoutDone` success screen are removed entirely; `/pot` now renders
   `CashoutFlow` for both confirmation and success, exactly like the
   result screen. The "browse your pot" view above the fold (amount, how
   it works) is unchanged.
6. **`types.ts`** — `CashoutResult` gains `transaction_id: string` and
   `currency: string`, matching the migration.
7. **`i18n.ts`** — extended `STATIC_FALLBACKS` with the `pot.*` keys
   confirmed missing from every migration while auditing "all new and
   existing cashout labels" (see table below) — same mechanism used for
   the result-screen keys in the previous pass, not a new one.

### UX stages implemented
1. **Confirm** — title, consequence copy, and a real decision summary
   (current streak, value secured, what happens after — worded
   differently depending on the real `played_today` flag so it never
   claims "starts tomorrow" when the player could actually start again
   today).
2. **Processing** — spinner, "do not close this screen," and a neutral
   "taking longer than usual" message after 6s with no implication of
   failure. Double-submit is blocked by a synchronous ref flag checked
   before any async work, not just a disabled-button style.
3. **Success** — only rendered after a real server response; shows the
   server-confirmed amount, streak, transaction id, and the correct
   today/tomorrow tomorrow-hook. A restrained CSS pulse only — no
   confetti, no coin animation.
4. **Error/recovery** — four distinct states: `rejected` (explicit RPC
   error — safe to say nothing changed, since the function is atomic),
   `uncertain` (network-level failure — never claims "nothing changed";
   offers "Retry Status," which re-fetches player state and checks
   whether the pot is now 0 rather than guessing), `already_processed`
   (pot was already 0 — e.g. a genuine duplicate), and `no_pot`.

### Eligibility rules (implemented consistently in both entry points)
Cash Out only renders when `potCents > 0` (`hasPot` in both `ResultModal`
and `PotPage`) — matches the RPC's own hard guard, so the UI and the
server agree on when cashout is possible. No KYC gate (none exists in the
product), no guest/authenticated distinction needed (guests have a real
`auth.uid()` via Supabase's guest-session provisioning, confirmed by
inspection).

### Idempotency
Documented above under "existing architecture" — the real protection is
server-side (row lock + zero-pot guard on an atomic function), reinforced
client-side by: a synchronous submit-guard ref (blocks double-click before
React even re-renders the disabled state), and the Cash Out entry point
disappearing from the UI once `potCents` reaches 0 after a real success.
Two open tabs / a slow retry are both safely handled by the same
server-side mechanism — a second request simply finds nothing left to
cash out.

### Wallet/ledger handling
Unchanged mechanism — `wallet_ledger` insert + `wallet_balance_cache`
update, both inside the same atomic function as the streak reset. The
frontend never mutates wallet balance optimistically; `CashoutFlow` only
ever displays the amount from the real RPC response (Stage 4), never the
pre-confirmation display value re-used as if it were the confirmed one.

### Streak reset handling
`current_streak` and `pot_cents` both reset to 0 in the same transaction
as the payout — confirmed by inspection, unchanged. "Your next run starts
from Day 1" is accurate.

### Day 30 handling
See "existing architecture" above — badges are awarded at play time via a
DB trigger, fully independent of cashout. No change was needed or made;
documented as verified-correct-as-is.

### Qualification handling
See "existing architecture" above — `cashout_game()` never touches
qualification tables. `CashoutFlow`'s optional `onSuccess` callback is
used by `PotPage` to call `fetchQualification()` afterward purely as a
refresh-for-safety (matching the previous `/pot` implementation's
behaviour), not because cashout actually changes anything qualification-related.

### Translation-key audit
| Key | Used by | In migrations? | Fallback added |
|---|---|---|---|
| `pot.your_pot`, `pot.streak_active`, `pot.cashout_cta`, `common.pot`, `common.back`, `common.day`, `common.days` | `PotPage.tsx` | Yes | None needed |
| `pot.grows_desc`, `pot.empty_desc`, `pot.current_pot`, `pot.how_it_works`, `pot.grows_title`, `pot.grows_body`, `pot.cashout_anytime_title`, `pot.cashout_anytime_body`, `pot.resets_title`, `pot.resets_body`, `pot.cashout_streak_warn`, `pot.face_the_gate` | `PotPage.tsx` | **No** — confirmed missing from every migration | Added to `STATIC_FALLBACKS` |
| `pot.cashout_confirm_title`, `pot.moves_to_wallet`, `pot.streak_reset_warning`, `pot.collecting`, `pot.confirm_cashout`, `pot.keep_streak`, `pot.collected_label`, `pot.collected_desc`, `pot.back_to_home` | Old `ConfirmModal`/`cashoutDone` UI (removed) | N/A | None — dead, no longer called anywhere |
| All `CashoutFlow`/`cashoutMessages.ts` copy | `CashoutFlow.tsx` | N/A — code-based by design, same MVP strategy as `resultMessages.ts` | N/A |

No raw translation key can reach the cashout screens: seeded keys render
seeded text, the confirmed-missing `pot.*` keys now fall through to
`STATIC_FALLBACKS`, and all `CashoutFlow` copy is plain TypeScript, never
a `t()` call.

### Accessibility
`role="dialog"`, `aria-modal`, `aria-labelledby` pointing at each stage's
own heading, a visually-hidden `aria-live="polite"` region announcing
stage-title changes, a real focus trap (Tab/Shift+Tab cycling, initial
focus on mount), Escape closes only at the `confirm`/`error`/`success`
stages — never during `processing`. All CTAs are real `<button>`/state
changes, not color-only indicators (destructive vs. safe actions are
differentiated by label, position, and border/fill, not color alone).
Respects `prefers-reduced-motion` (both the processing spinner and the
success pulse are disabled via a media query).

### Security
- Frontend never submits an amount — the RPC reads `pot_cents` from the
  database itself; nothing client-supplied determines the payout.
- Duplicate/replay/two-tab protection is server-side (see "Idempotency").
- CSRF is not applicable here (Supabase RPC calls are authenticated via
  the existing bearer-token session, same as every other RPC in this app
  — no new auth pattern introduced).
- Negative/zero amounts can't reach the response — the RPC only proceeds
  past its own `pot_cents = 0` guard, and the payout amount is read from
  the database row, not accepted as a parameter.

### Tests run
- `npx tsx scripts/verify-cashout-messages.ts` — **7/7 passed** (real
  execution, not just review): amount interpolation, zero-value amounts,
  missing-variable safety, no raw `{placeholder}` tokens anywhere in the
  error copy.
- `npx tsx scripts/verify-result-messages.ts` — re-run after these
  changes to confirm no regression — still **25/25 passed**.
- `npx tsc --noEmit` / `npm run build` — same limitation as the previous
  two passes: this sandbox's `node_modules` isn't installed and the real
  npm registry returns `403 Forbidden` on package downloads here, so a
  full project type-check isn't possible in this environment. The
  `CashoutFlow.tsx`/`PotPage.tsx`/`ResultModal.tsx` React changes were
  verified by brace/paren balance checks and full manual read-throughs,
  not by execution (unlike the pure-logic `cashoutMessages.ts`, which was
  actually executed).
- Manual walk-through of every scenario in the task's "Testing scenarios"
  section against the implemented logic (standard flow, eligibility,
  duplicate protection, state consistency, error handling) — documented
  above under the relevant subsections rather than repeated here.

### Known limitations
- Could not run a real build/typecheck in this sandbox (registry access
  blocked) — recommend `npm install && npx tsc --noEmit && npm run build`
  plus a real click-through before deploying.
- `p_idem_key` is now recorded for audit but still isn't used as an active
  server-side deduplication lookup (no dedicated idempotency-key table was
  added — that would be new backend infrastructure beyond a UX/reliability
  pass). The row-lock + zero-pot mechanism is the real protection today;
  a future pass could add a proper idempotency-key table if a stronger
  guarantee is ever needed (e.g. to also dedupe two *different* legitimate
  cashout attempts made seconds apart under unusual retry conditions).
- No analytics/event-logging provider exists anywhere in this project (a
  couple of "analytics" code comments refer to fire-and-forget scene
  tracking, not a real events system) — none was added, per the
  instruction not to introduce a new provider. Server-side audit
  effectively already exists via the `wallet_ledger` row itself (user_id,
  amount, type, meta, created_at, and now a real `id` returned as
  `transaction_id`).
- External withdrawal, new KYC, notifications, activity streaks, and any
  new economy values were explicitly out of scope and were not touched.

## Cashout Experience Phase 2 — Idempotency and Migration Hardening

Final backend reliability pass on the cashout experience: real idempotent
retry (a retried request now returns the original transaction instead of
failing), a server-side uniqueness guarantee, and a verified-safe migration
replacement method. No UI redesign, no external withdrawal, no KYC, no
notifications, no economy changes.

### Previous row-lock protection (unchanged, still the primary guarantee)
`cashout_game()`'s `game_state` row lock (`FOR UPDATE`) still serializes
concurrent requests from the same user — this was already correct and
remains the first line of defense. What was missing was *retry recovery*:
the old function had nowhere to look up "did this exact request already
succeed?", so a retry after a lost response just hit the (by-then-correct)
zero-pot guard and failed outright.

### New active idempotency-key behaviour
`cashout_game()` now looks up an existing `wallet_ledger` row for
`(user_id, type='CASHOUT', meta->>'idem_key' = p_idem_key)` **before**
checking pot eligibility:
- **Found** → returns that row's real `transaction_id`/`amount`
  immediately (`"idempotent_replay": true`). No new row is inserted, no
  wallet update happens again, and it does not matter that `pot_cents` is
  now 0 — that's the expected state after the original success.
- **Not found** → proceeds exactly as before (pot-eligibility guard,
  insert, wallet update, streak/pot reset), now also recording the key
  for future replay lookups.
- A **different** key after a completed cashout finds no matching row,
  falls through to the pot guard, and is correctly rejected — no second
  payout.
- Malformed/empty keys are rejected outright before any lookup.

### Frontend idempotency-key lifecycle
Root cause of the original gap: `useGame().cashout()` used to call
`crypto.randomUUID()` **inside itself on every invocation** — so even
reusing "the same call" for a retry silently sent a different key every
time. Fixed:
- `useGame().cashout(gameId, idemKey)` now *requires* the caller to supply
  the key — it no longer generates one internally. This is a deliberate
  breaking change to the hook's signature so a future accidental
  regression (generating a fresh key per retry again) is a compile error,
  not a silent bug.
- `CashoutFlow.tsx` owns the key's lifecycle via
  `src/lib/cashoutIdempotency.ts` (new, pure, dependency-free — actually
  executed by `scripts/verify-cashout-idempotency.ts`, not just reviewed):
  - `getOrCreateIdemKey()` — generated once, immediately before the first
    submission; reused for every subsequent call in the same decision
    (initial request, "Retry Status," any resubmission).
  - Kept in a `useRef` (survives re-renders) and mirrored to
    `sessionStorage` under `sts_cashout_idem_daily_gate` (survives a
    reload of the same tab while a decision is in flight — "refresh
    recovery where practical"). Falls back to an in-memory-only store if
    `sessionStorage` throws (private browsing, etc.) rather than crashing.
  - Cleared after: confirmed success (fresh or a replay — both are real,
    server-confirmed outcomes), an explicit final rejection (`rejected` or
    `already_processed` — the server confirmed no transaction occurred for
    that key), or cancellation from the confirm stage before any request
    was ever submitted (X button, backdrop click, "Keep My Streak,"
    Escape). **Never cleared** on an `uncertain` (network-level) outcome —
    that's exactly what lets "Retry Status" recover the real result later.

### Uniqueness implementation
Partial unique index, additive, in the new migration:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_cashout_idem_key_uniq
  ON public.wallet_ledger (user_id, (meta->>'idem_key'))
  WHERE type = 'CASHOUT' AND (meta->>'idem_key') IS NOT NULL;
```
Different users may reuse the same literal key (index includes `user_id`).
Only `CASHOUT` rows with a recorded key are constrained — pre-existing
historic rows (from before the previous migration started recording
`idem_key`) have none and are excluded by the partial `WHERE`, so nothing
historic is touched or put at risk of a conflict. The insert is wrapped in
its own `BEGIN...EXCEPTION WHEN unique_violation...END` block: if this
index ever actually fires (the row lock already makes that practically
unreachable for a same-user race — this is defense-in-depth, not the
primary mechanism), the function fetches and returns the winning
transaction's real row instead of erroring or crediting the wallet twice.

### Retry / recovery behaviour
`CashoutFlow`'s "Retry Status" action (only offered for the `uncertain`
error kind) no longer just refreshes player state and *guesses* success
from `pot_cents = 0` — it **resubmits the cashout RPC using the same
persisted key**. Because that's now genuinely idempotent server-side, the
response always reflects the real outcome: a replay of a real success, or
a real, specific rejection — never an inferred guess. This directly
satisfies "never infer a specific transaction ID from `pot_cents = 0`
alone."

### RPC sequence (matches the requested 10-step order)
Authenticate → validate `p_game_id`/`p_idem_key` shape → lock `game_state`
→ look up an existing ledger row for this key → if found, return it →
otherwise confirm pot eligibility → insert the ledger row (with the key)
→ update the wallet balance cache → reset streak/pot → return the
confirmed result. All in one transaction, matching the existing atomic
function's guarantees.

### Migration replacement method
**No DROP was needed.** Verified before writing anything: two overloads
of `cashout_game` exist in the live schema (a legacy no-arg one, untouched
by any of this work, and `cashout_game(text, text)`, the one the frontend
actually calls). This migration keeps the exact same parameter names,
types, defaults, and return type (`jsonb`) as the live
`cashout_game(text, text)` — PostgreSQL only requires DROP + CREATE when
the return type or parameter types change, and neither does here, so
`CREATE OR REPLACE FUNCTION` is valid. It's also the *safer* choice: it
preserves the function's existing GRANTs automatically, unlike DROP +
CREATE, which would silently revoke them and require reissuing
`GRANT EXECUTE ... TO authenticated`.

### Permissions restored
None needed to be *restored* — `CREATE OR REPLACE` never revoked them in
the first place (see above). `SECURITY DEFINER` and
`SET search_path = public` are both re-declared explicitly in the new
function body, so they carry forward unchanged regardless.

### Currency handling
Unchanged from the previous pass — `currency` is hardcoded `'EUR'`
server-side, in the RPC's own `jsonb_build_object`, never accepted as a
parameter or determined by the client. Documented again here per this
pass's explicit ask: **multi-currency is not currently supported anywhere
in this project's schema**, and none was added.

### State reconciliation
Unchanged from the Phase 2 UX pass, reconfirmed here: `refresh()` (shared
`AuthContext`) is the single state-fetching path used after a confirmed
cashout — no second state store was introduced. Cash Out disappears once
`potCents` reaches 0; a stale "survived Day X" screen closes itself once
the player dismisses a *confirmed* cashout's success stage (tracked via
`cashoutSucceeded` in `ResultModal.tsx`, from the previous pass, unchanged
here); reopening `/pot` reads the same shared `playerState`, so it shows
the real zero-pot state; another open tab's next `cashout()` call (same or
different key) is answered correctly by the server's idempotency lookup
either way.

### Tests run
- `npx tsx scripts/verify-result-messages.ts` — **25/25 passed** (no regression).
- `npx tsx scripts/verify-cashout-messages.ts` — **7/7 passed** (no regression).
- `npx tsx scripts/verify-cashout-idempotency.ts` (new) — **24/24 passed**,
  actually executed. Two distinct things are verified here, and they are
  not the same kind of proof (this is explicit in the script's own header
  comment, not just this changelog):
  - The **real, shipped** `getOrCreateIdemKey`/`clearIdemKey` logic
    (`src/lib/cashoutIdempotency.ts`, imported directly by
    `CashoutFlow.tsx`, not a duplicate) — genuinely executed: same-key
    stability, reload recovery (fresh ref + populated store), clearing,
    and UUID validation.
  - A plain-JS **simulation** of `cashout_game()`'s control flow
    (`simulateCashout`), covering every required database scenario (same
    key twice → one ledger row, one credit; different keys → second
    correctly rejected; different users sharing a key → both succeed
    independently; missing/malformed key → rejected; zero pot → rejected).
    **This models the SQL's designed behaviour for review — it is not a
    replacement for running the actual migration against a real
    database, which this environment cannot do (see "Remaining
    limitations").**
- `npm install`, `npx tsc --noEmit`, `npm run build` — attempted again;
  the real npm registry still returns `403 Forbidden` on package downloads
  in this sandbox (same restriction as both previous passes, confirmed
  again just now, not assumed). Not reporting these as having run
  successfully, per instruction.
- The migration itself was **not** run against a disposable/local
  Supabase/Postgres instance — none is available in this environment.
  This is the single most important remaining verification step before
  trusting this migration in production; see "Remaining limitations."

### Remaining limitations
- **The migration has not been executed against any real Postgres
  instance.** Everything above the "Tests run" section describes the
  *designed* behaviour, carefully checked against the actual current
  schema (table columns, existing indexes, existing overloads and grants,
  by direct inspection of every relevant migration file) and verified via
  the JS simulation, but SQL syntax correctness and real transactional
  behaviour (the row lock, the partial index, the exception handler) can
  only be fully confirmed by actually running it. **Run this migration
  against a Supabase preview branch or local `supabase db reset` before
  applying it to production, and re-run the "Database test results"
  scenarios from the task for real** (same key twice, different keys,
  concurrent requests via two simultaneous connections, a real
  disconnect-mid-transaction test if practical).
- `npm install`/`tsc`/`build` still blocked by this sandbox's registry
  restriction — same as both previous passes.
- The `useGame().cashout()` signature change (key now required, no
  default) is intentionally breaking for any future caller — confirmed
  `CashoutFlow.tsx` is the only real call site today, but this is worth
  knowing before adding a second one.

## Cashout Idempotency Context Scoping

Final focused hardening pass: idempotency keys are now scoped to a real,
server-generated cashout-context identifier, not just the game ID —
closing the stale-key risk described in this pass's brief. No UI
redesign, no economy change, no notifications, no external withdrawal.

### The problem
`sts_cashout_idem_daily_gate` scoped a stored key only to the *game*, not
to a *specific eligible pot*. The described failure was real: a lost
response after a successful cashout could leave a key in `sessionStorage`
that would later be picked up and reused for a **completely different**,
future pot — not a duplicate payout (the server-side row lock + zero-pot
guard already prevented that), but the wrong transaction being replayed
for a new eligible state that was never actually processed.

### Identifier selected: `game_state.updated_at`
Inspected the schema before choosing anything (per the task's explicit
instruction not to invent a frontend-only field):
- `game_state.updated_at` already exists as a column (original schema
  migration) and is already updated on **every** play
  (`20260618112003_*.sql`) and **every** cashout (`20260713140000_*.sql`)
  — so it already changes exactly when the eligible pot/streak changes.
- It was **not**, however, exposed by `get_my_state()` — the RPC the
  frontend actually reads player state from. Confirmed by reading its
  live body directly (only one migration,
  `20260409071643_*.sql`, actually redefines it; later migrations only
  touch grants). This is exactly the situation the task anticipated:
  "If no suitable identifier exists, add the smallest safe server-
  generated cashout-context field... needed." Added it via a new,
  minimal, additive migration
  (`20260713160000_20260713_expose_game_state_updated_at.sql`) — same
  no-arg signature, same `RETURNS jsonb`, `CREATE OR REPLACE` is safe for
  the same reasons documented in the cashout migrations.
- **Why it's unique enough**: a stored key is only ever reused when the
  freshly-observed `updated_at` still matches what was stored at the
  moment the key was created — meaning nothing has changed in the DB
  since. It has *already* changed after any new play (a new streak/pot)
  or after the original cashout itself committed. `CashoutFlow` is only
  ever shown when `potCents > 0` (gated by both call sites), so by the
  time a context comparison happens, there is always a genuinely eligible
  pot in front of the player — a mismatch always means "this stored key
  belongs to a different, already-resolved opportunity."
- Rejected alternatives: `pot_cents`/`current_streak`/date can all repeat
  (explicitly called out in the brief); `play_id` is more precise but
  only available from the survive-result entry point, not `/pot` (which
  has no `PlayResult` in scope) — using two different identifier *kinds*
  across the two entry points would itself create false-positive
  staleness when switching between them for the same pending pot, so
  `updated_at` was used uniformly across both instead.

### Frontend storage record
`sessionStorage` value is now a JSON record, not a bare key string:
```ts
interface StoredIdemRecord {
  idemKey: string;
  gameId: string;
  contextId: string;
  createdAt: number;
}
```
`getOrCreateIdemKey()` (`src/lib/cashoutIdempotency.ts`) only reuses a
stored record when `gameId` **and** `contextId` both match the current
values; any mismatch — or a corrupt/legacy (pre-this-change) stored
value — is discarded and a fresh key is minted, scoped to the current
context. `clearIdemKey()` is unchanged in behaviour (still removes the
whole record).

### Wiring
- `GameState` (TypeScript) gained `updated_at: string | null`.
- `CashoutFlow` gained a required `contextId: string` prop.
- `HomePage.tsx` passes `game_state?.updated_at ?? ''` into `ResultModal`
  (new `cashoutContextId` prop), which passes it straight through to
  `CashoutFlow`. `game_state.updated_at` is guaranteed fresh at this point
  because `play()` already calls `refresh()` internally before the result
  screen renders.
- `PotPage.tsx` reads `playerState.game_state.updated_at` directly (same
  shared `AuthContext`, no new state store).

### Tests run
- `scripts/verify-cashout-idempotency.ts` — extended with the exact
  scenario from this task's brief (key created for context-A, a later
  unrelated mount for context-B must never reuse it) plus a corrupt/legacy
  stored-value case. **28/28 passed**, actually executed.
- `scripts/verify-result-messages.ts` — **25/25 passed** (no regression).
- `scripts/verify-cashout-messages.ts` — **7/7 passed** (no regression).
- `npm install`/`tsc`/`build` — not re-attempted differently from the
  previous pass; same registry restriction applies in this environment.

### Important discovered gap (documented, not fixed — out of scope here)
While reading `get_my_state()`'s body to add `updated_at`, confirmed it
also never returns `max_streak` or `completed_cycles`, even though the
TypeScript `GameState` type declares them and the personal-best detection
added in "Result Messaging Phase 1" (a prior, unrelated pass) reads
`game_state.max_streak`. That field is very likely always `undefined` at
runtime today. This is real and worth fixing, but it is unrelated to
cashout idempotency and explicitly out of scope for "do not modify
unrelated game functionality" in this pass — flagged here for a future,
dedicated small migration (the fix would be the same shape as this one:
add the two fields to `get_my_state()`'s `game_state` jsonb object).

### Remaining limitations
- Same as the previous pass: the migrations in this project have not been
  executed against a real Postgres instance in this environment (none
  available) — the SQL was written and reviewed carefully against the
  actual live function bodies (read directly from the migration history,
  not assumed), and the *design* was verified via the JS simulation and
  the real, executed key-lifecycle tests, but real execution against a
  Supabase preview branch or local instance remains the recommended next
  step before production use.
- The `max_streak`/`completed_cycles` gap above is now clearly documented
  but intentionally not fixed in this pass.

## Fix: expose max_streak and completed_cycles via get_my_state()

Follow-up to the gap flagged (not fixed) in "Cashout Idempotency Context
Scoping." Confirmed real and fixed now, on request.

### The bug
`get_my_state()` never returned `game_state.max_streak` or
`game_state.completed_cycles`, even though:
- Both columns exist and are actively maintained (`max_streak` via
  `GREATEST(max_streak, streak_after)` on every play; `completed_cycles`
  incremented on every completed 30-day cycle) —
  `20260518082324_20260518_badge_achievements.sql`.
- The frontend `GameState` type already declared both as required fields.
- Two features already depended on them: personal-best detection in
  `src/lib/resultMessages.ts` (`isPersonalBest()` reads
  `game_state.max_streak`) and `src/pages/StreakPage.tsx`'s completed-
  cycles display (`playerState?.game_state?.completed_cycles ?? 0`).

Both were silently receiving `undefined` from the RPC at runtime. Neither
crashed — `isPersonalBest()` already had the `previousBestStreak === null`
guard from the earlier hardening pass, and `StreakPage.tsx` already
defaulted with `?? 0` — but the personal-best category could never
actually be selected, and the streak page always showed 0 completed
cycles regardless of the player's real history.

### Fix
New migration
(`20260713180000_20260713_expose_max_streak_and_completed_cycles.sql`),
same pattern as the `updated_at` fix: adds both columns to
`get_my_state()`'s `SELECT` and to the returned `game_state` jsonb
object, defaults both to `0` in the `NOT FOUND` fallback branch (a real,
correct value for a player with no game_state row yet, not a placeholder
for unknown data). Same signature, same return type — `CREATE OR REPLACE`
is safe, no dropped grants.

### No frontend changes needed
`src/lib/resultMessages.ts` and `src/pages/StreakPage.tsx` already read
these fields correctly and already handled their absence safely (`?? null`
/ `?? 0`) — this was purely a backend gap. Once this migration is applied,
personal-best detection and the completed-cycles display both become
accurate with no code changes.

### Tests run
Re-ran all three existing verification scripts — **60/60 passed** (no
regression; none of them exercise live Supabase data, so this is
confirmation that nothing else broke, not a test of the fix itself, which
requires the migration to actually run against a database — see "Remaining
limitations" in the previous two entries, unchanged here).

## Final Cashout Context and State RPC Verification

Forensic audit of the cashout idempotency work. Found and fixed one real
security gap; confirmed one thing was already correct.

### Finding 1 (real, fixed): cashout context was frontend-only
Read the actual live `cashout_game` body directly, not the changelog —
its signature was `cashout_game(p_game_id text DEFAULT 'daily_gate',
p_idem_key text DEFAULT NULL) RETURNS jsonb`. **No context parameter
existed.** `contextId` was real and correctly computed
(`game_state.updated_at`), but it was only ever used for local
`sessionStorage` key-scoping (`src/lib/cashoutIdempotency.ts`) — never
transmitted to the server. Confirmed directly in `useGame.ts`:
`cashout(gameId, idemKey)` only ever sent `p_game_id`/`p_idem_key`. This
meant the actual duplicate/wrong-transaction protection added in "Cashout
Idempotency Context Scoping" was a frontend convention, not a
server-enforced guarantee — any caller that didn't go through the
frontend's own scoping logic had no context check at all.

### Fix: real server-side context validation
New migration
(`20260713200000_20260713_cashout_server_side_context_validation.sql`).

**New signature**: `cashout_game(p_game_id text DEFAULT 'daily_gate',
p_idem_key text DEFAULT NULL, p_context_id timestamptz DEFAULT NULL)
RETURNS jsonb`. `p_context_id` is `timestamptz`, not `text` — Postgres
compares it as a real instant, immune to cosmetic string-formatting
differences; a malformed value is rejected by the parameter-binding layer
before the function body runs.

**Server behaviour, exactly as specified:**
- *Same request* (user, game, key, context all match an existing row) →
  returns the original transaction, `idempotent_replay: true`, no new
  ledger row, no wallet credit, no state reset.
- *Context mismatch* (same user + key, different game or context) →
  `RAISE EXCEPTION 'Idempotency key context mismatch'` — never returns
  the old transaction as if it belonged to this request, never pays out.
- *New valid request* (new key, context matches the just-locked
  `game_state.updated_at`) → processes normally.
- *Stale context* (new key, context does not match) →
  `RAISE EXCEPTION 'Stale cashout context'` — rejected before the ledger
  insert, before any wallet update, before any reset.
- Missing/null context → rejected outright (`'Missing cashout context'`),
  checked before the row lock is even taken.

### Ledger request fingerprint
New cashout rows now store all three in `meta`: `idem_key`, `game_id`,
`cashout_context_id` (the `timestamptz`, serialized as ISO 8601 inside
jsonb). The replay lookup query reads back and compares all three — not
`idem_key` alone. The existing partial unique index
(`user_id, meta->>'idem_key'`) is unchanged and still the row-level
duplicate-insert guard; the context/game comparison is application-level
logic layered on top of it, checked before that index is ever relied on.
Historic rows (before this migration) have no `cashout_context_id` and
are never rewritten — nothing about them changes, and a `NULL` there can
never accidentally satisfy a match against a real submitted context.

### Legacy overload audit
Three signatures, checked directly against the actual grant history
(`20260521104759_*.sql`), not assumed:
- `cashout_game()` (no-arg) — legacy, already documented as superseded
  before any of this cashout work began. **Untouched** — out of scope,
  not what the frontend calls, not a gap introduced by this work.
- `cashout_game(text, text)` — what the frontend called until this
  migration. **Dropped.** Adding a third parameter of a new type does not
  let `CREATE OR REPLACE FUNCTION` update this in place (Postgres
  overloads are identified by argument type lists) — the old version
  would otherwise keep existing and keep being callable, bypassing
  context validation entirely. Explicitly dropped per this task's own
  instruction not to leave an insecure overload in place.
- `cashout_game(text, text, timestamptz)` — new. Grants explicitly
  restored (`DROP` does not carry them forward, unlike `CREATE OR
  REPLACE` on an unchanged signature): `REVOKE ALL ... FROM PUBLIC, anon`
  then `GRANT EXECUTE ... TO authenticated`, matching the exact pattern
  already used for every other RPC in this schema. `SECURITY DEFINER` and
  `SET search_path = public` both re-declared.

### Frontend changes
- `useGame().cashout(gameId, idemKey, contextId)` — now sends
  `p_context_id: contextId` to the RPC. `contextId` is passed through
  exactly as received from `game_state.updated_at` (an ISO string) — no
  local `Date` parsing or reformatting anywhere in this path, so there is
  no locale-dependent formatting to go wrong.
- `CashoutFlow.tsx` — guards against a missing context *before* ever
  calling the RPC (`if (!contextId) { ...show an error, never submit }`),
  in addition to the server-side guard. Two new error kinds,
  `stale_context` and `missing_context`, with dedicated copy in
  `cashoutMessages.ts` — a safe "refresh and try again" message, never a
  false success. A new "Refresh" action (`handleRefreshAndClose`)
  refreshes shared player state and closes the flow, so the player
  reopens Cash Out with a fresh context and a fresh key rather than
  retrying a key the server has already told us is invalid.
- `ResultModal.tsx` / `PotPage.tsx` — `hasPot` now requires a real,
  truthy `contextId` in addition to `potCents > 0`. Cash Out is not
  offered at all when context is unavailable — `contextId ?? ''` can
  reach neither the RPC nor even a rendered Cash Out button.
- `src/lib/cashoutIdempotency.ts`'s `simulateCashout` model updated to
  mirror the new server logic (game/context comparison on replay, current-
  context check on new attempts) for verification purposes.

### Timestamp handling
`game_state.updated_at` is read once from `get_my_state()`'s jsonb
response (Postgres serializes it as ISO 8601 with timezone and
microsecond precision) and passed through unmodified: prop → prop → RPC
parameter. No `new Date(...).toString()`, no locale formatting, no
manual string comparison anywhere in this path — the only comparison that
matters happens server-side, in Postgres, as a real `timestamptz`
comparison (`IS DISTINCT FROM`), which is correct regardless of
formatting. `IS DISTINCT FROM` is NULL-safe: two NULLs compare equal,
NULL vs. a real value compares different — used deliberately instead of
`=` so a missing stored context can never silently "match" a missing
submitted one.

### Cumulative `get_my_state()` migration audit

| Field | Present before changes | Present in 160000 migration | Present in 180000 migration | Present in final effective function |
| ----- | ---------------------: | ---------------------------: | ---------------------------: | ------------------------------------: |
| `user.id` | Yes | Yes | Yes | Yes |
| `user.guest_id` | Yes | Yes | Yes | Yes |
| `user.status` | Yes | Yes | Yes | Yes |
| `game_state.current_streak` | Yes | Yes | Yes | Yes |
| `game_state.pot_cents` | Yes | Yes | Yes | Yes |
| `game_state.last_play_date` | Yes | Yes | Yes | Yes |
| `game_state.updated_at` | No | Yes | Yes | Yes |
| `game_state.max_streak` | No | No | Yes | Yes |
| `game_state.completed_cycles` | No | No | Yes | Yes |
| `wallet_balance_cents` | Yes | Yes | Yes | Yes |
| `jackpot_cents` | Yes | Yes | Yes | Yes |
| `played_today` | Yes | Yes | Yes | Yes |
| `available_tiers` | Yes | Yes | Yes | Yes |

Confirmed directly by re-reading both migration files (not assumed): the
`180000` migration's `game_state` jsonb object includes all six fields —
`current_streak, pot_cents, last_play_date, updated_at, max_streak,
completed_cycles` — it built forward from the `160000` version rather
than reverting it. `updated_at` is **not** missing from the later
migration; no fix was needed there. Effective migration order for
`get_my_state()`: `20260409071643` (original body) →
`20260713160000` (+`updated_at`) → `20260713180000` (+`max_streak`,
+`completed_cycles`, final). `20260713200000` does not touch
`get_my_state()` at all.

### Fallback state (no game_state row)
Confirmed type-compatible, no invented values: `updated_at: NULL` (a real
SQL null, not an invented timestamp), `max_streak: 0`, `completed_cycles:
0` — all explicitly set in the `IF NOT FOUND` branch. Since a missing
game_state row also means `pot_cents = 0`, `hasPot` (`potCents > 0 &&
!!contextId`) is false regardless, so Cash Out is correctly unavailable
in this case at every layer (parent gating, component guard, and the
server's own `NOT FOUND` → `'No pot to cash out'` check).

### Frontend data path (traced hop by hop)
`get_my_state()` → `AuthContext.fetchPlayerState()` (`playerState.game_state.updated_at`,
unrenamed) → `HomePage` (`game_state?.updated_at ?? ''` as
`cashoutContextId`) → `ResultModal` (destructured, passed straight
through) → `CashoutFlow` (`contextId` prop, used for both local key
scoping and now the RPC call) → `useGame().cashout(gameId, idemKey,
contextId)` → `supabase.rpc('cashout_game', { p_game_id, p_idem_key,
p_context_id: contextId })`. Same trace for `PotPage`, one hop shorter
(reads `playerState.game_state.updated_at` directly, no `ResultModal` in
between). Confirmed both entry points use the same field, computed the
same way — no divergent context source between them.

### Tests run
- `scripts/verify-cashout-idempotency.ts` — extended with every required
  scenario from this task: same key/same context replay, same key/different
  context conflict, same key/different game conflict, new key/stale
  context rejection (no ledger row, pot untouched), new key/current
  context success, missing context rejection. **39/39 passed**, actually
  executed. Two distinct kinds of proof, kept explicitly separate in the
  script's own header comment (not just here):
  - `getOrCreateIdemKey`/`clearIdemKey` — the real, shipped code, genuinely executed.
  - `simulateCashout` — a plain-JS model of the SQL's control flow, not a
    substitute for running the actual migration against Postgres.
- `scripts/verify-result-messages.ts` — 25/25 passed (no regression).
- `scripts/verify-cashout-messages.ts` — 7/7 passed (no regression).
- `npm install` — attempted again; the real registry still returns `403
  Forbidden` in this sandbox (same restriction as every previous pass,
  reconfirmed just now, not assumed). `npx tsc --noEmit` / `npm run
  build` were therefore not run — not reporting them as having succeeded.
- **Real Postgres test status: not performed.** No live instance is
  available in this environment. Everything above the "Tests run" section
  describes the *designed* behaviour, verified by direct inspection of
  the actual current function/grant history (not the changelog) and by
  the JS simulation — not by executing the migration.

### QualificationBar.tsx
Not modified. The earlier "-2 paren imbalance" flagged by this project's
own crude brace-counting heuristic was traced to its exact source: one
line contains two string literals whose *contents* are a lone `)`
character with no matching `(` in that same string
(`.replace(')', ...)` and `.replace('rgb', ',0.45)')`). Character-counting
counts every `(`/`)` in the file including ones inside string literals,
so this is a false positive from the checking method, not a real syntax
error — confirmed by reading the entire file end to end, not by the
count. No real TypeScript parser or build was available in this
environment to double-confirm formally; this remains a manually-verified
finding, documented as such rather than treated as build-verified proof.

### Files modified
`src/hooks/useGame.ts`, `src/components/game/CashoutFlow.tsx`,
`src/components/game/ResultModal.tsx`, `src/pages/PotPage.tsx`,
`src/lib/cashoutMessages.ts`, `src/lib/cashoutIdempotency.ts`,
`scripts/verify-cashout-idempotency.ts`.

### Migrations added
`20260713200000_20260713_cashout_server_side_context_validation.sql`
(new). No existing migration was edited — this is the correct way to
change a live schema; migrations are an append-only history, not source
files to rewrite.

### Remaining real-environment verification
- Run this migration against a Supabase preview branch or local
  `supabase db reset` and re-run the required scenarios for real —
  including concurrent requests via two simultaneous connections, which
  only a real Postgres instance can actually exercise.
- Run `npm install`, `npx tsc --noEmit`, and `npm run build` in an
  environment with real registry access.
- Manually confirm in the Supabase dashboard (or `\df+`/`pg_proc`) that
  `cashout_game(text, text)` (2-arg) is genuinely gone after this
  migration runs, and that `cashout_game(text, text, timestamptz)` is
  granted to `authenticated` only.

## Cashout RPC Exposure and Overload Hardening

Final RPC exposure audit. Found and closed a **real, currently-live
financial bypass** — this is the most serious finding across all the
cashout hardening passes, and it was real, not theoretical.

### The bypass (confirmed, not inferred)
Read the final effective body of `public.cashout_game()` (no-arg)
directly — its last redefinition is
`20260521104759_20260521_security_hardening.sql`. Confirmed it:
- Authenticates via `auth.uid()`, locks `game_state`, checks
  `pot_cents = 0`.
- **Inserts a real `wallet_ledger` row, credits `wallet_balance_cache`
  for real, resets `current_streak`/`pot_cents` to 0** — a complete,
  genuine cashout.
- **Validates no idempotency key. Validates no cashout context.** None of
  the guarantees built across three prior hardening passes applied to
  this function at all.
- Is `SECURITY DEFINER`, and — read directly from the actual `GRANT`
  statement in that same migration, not assumed —
  **`GRANT EXECUTE ON FUNCTION public.cashout_game() TO authenticated`**.
  `anon`/`PUBLIC` were correctly revoked; `authenticated` never was.

This meant any authenticated Supabase client — not just this project's
React frontend, any client holding a valid session (including a guest
session, since guests get real `auth.uid()` in this app) — could call
`supabase.rpc('cashout_game')` with **zero arguments** and receive a real
payout, completely bypassing every idempotency-key and context-validation
guarantee from every prior pass. The frontend never calling it was
irrelevant, exactly as this task warned: Supabase clients can call
exposed RPCs directly regardless of what the UI links to.

### Internal-dependency check (before dropping anything)
Searched every migration for a trigger or PL/pgSQL function calling
`cashout_game()` internally — none exists. It has only ever been a leaf,
client-invoked RPC. Safe to drop outright.

### Action: Option A — dropped
`DROP FUNCTION IF EXISTS public.cashout_game();` in the new migration. No
wallet/ledger row is touched — this only removes a callable RPC.

### Secure RPC hardening
- **Defaults removed.** New signature:
  `cashout_game(p_game_id text, p_idem_key text, p_context_id
  timestamptz) RETURNS jsonb` — no `DEFAULT` on any parameter. A client
  can no longer omit a security-relevant argument and have it silently
  filled in.
- **`CREATE OR REPLACE FUNCTION` confirmed valid** — removing defaults
  doesn't change the argument *type* list, so the function identity
  remains `cashout_game(text, text, timestamptz)` and grants carry
  forward automatically; reasserted explicitly anyway (separate
  single-role `REVOKE`/`GRANT` statements, not a combined
  `FROM PUBLIC, anon` form, for maximum compatibility).
- **`search_path` hardened from `SET search_path = public`
  (unqualified references) to `SET search_path = ''` with every object
  reference fully schema-qualified** (`public.game_state`,
  `public.wallet_ledger`, `public.wallet_balance_cache`,
  `public.jackpot_state`, `public.get_madrid_today()`, `auth.uid()`) —
  the stronger, unambiguous guarantee this task asked to prefer. No
  behaviour change, pure hardening.
- Validation/replay/context logic is otherwise identical to
  `20260713200000_*.sql` — this migration changes the signature and
  hardening, not the cashout behaviour itself. The function body still
  defensively re-checks null/empty/malformed values even though they're
  now also blocked at the signature level (a caller can still pass an
  explicit `NULL`).

### Final overload list (from direct inspection of every migration, not a live query — see "Real database verification status")
| Signature | Status |
|---|---|
| `cashout_game()` | **Dropped** by this migration |
| `cashout_game(text, text)` | Already dropped in `20260713200000_*.sql` (prior pass) |
| `cashout_game(text, text, timestamptz)` | **Live** — no defaults, `SET search_path = ''`, granted to `authenticated` only |

The intended final public application surface —
`cashout_game(text, text, timestamptz)`, nothing else — matches.

### Final grants
```sql
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.cashout_game(text, text, timestamptz) TO authenticated;
```

### Frontend call-site audit
Searched the entire project for `rpc('cashout_game'`, `rpc("cashout_game"`,
every `cashout(` call, and every `cashout_game(` reference:
- **Exactly one RPC call site**: `src/hooks/useGame.ts` —
  `supabase.rpc('cashout_game', { p_game_id, p_idem_key, p_context_id })`,
  all three named.
- **Exactly one function call site**: `src/components/game/CashoutFlow.tsx`
  — `cashout(GAME_ID, key, contextId)`, all three positional, and
  `useGame().cashout`'s own TypeScript signature already required all
  three with no `?` — removing server-side defaults changes nothing
  observable here.
No old two-argument or zero-argument call remains anywhere. **No frontend
files needed to change for this pass.**

### Search-path decision
Empty search path, full qualification — the stronger option this task
asked to prefer, not just documented as acceptable. Implemented, not
deferred.

### Tests performed
- `scripts/verify-cashout-idempotency.ts` — added an explicit arity check
  (`simulateCashout.length === 5`, real and runtime-checkable) as an
  honest proxy for "no optional defaults," clearly labeled as a proxy —
  it verifies the *simulation's* TypeScript function requires all
  arguments, not the real Postgres function's signature, which only a
  live database can confirm. **40/40 passed.**
- `scripts/verify-result-messages.ts` — 25/25 (no regression).
- `scripts/verify-cashout-messages.ts` — 7/7 (no regression).
- `npm install` — attempted again; still `403 Forbidden` in this sandbox
  (reconfirmed, not assumed). `tsc`/`build` not run.

### Real-database verification status
**Not performed — no live Postgres instance available in this
environment.** Everything above the "Tests performed" section is a
direct read of the actual migration/grant history (not the changelog,
not assumption) plus the JS simulation — not a live query. Before relying
on this in production, run for real:
```sql
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
       p.prosecdef, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'cashout_game';
```
to confirm exactly one row (`text, text, timestamptz`) exists, and that
its `proacl` shows `authenticated` only. Also run the expected-failure
matrix for real: `cashout_game()`, `cashout_game('daily_gate')`,
`cashout_game('daily_gate', 'uuid')` should all fail to resolve
(function does not exist for the given arguments) once this migration is
applied — this is standard PostgREST/PostgreSQL overload-resolution
behavior, consistent with there being no matching signature, but not
executed here.

### Files modified
None — this pass is migration-only. Confirmed by the frontend call-site
audit above.

### Migration added
`20260713220000_20260713_cashout_rpc_exposure_hardening.sql` (new). No
existing migration was edited.
