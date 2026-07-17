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

## Reactivation System Phase 1 — Native Web Push

Built an internally-owned native Web Push system for next-day reactivation
and last-call notifications — no OneSignal, no Firebase, no third-party
notification platform, no email/SMS/WhatsApp/Telegram. Everything below
is written and reviewed carefully, but **not deployed or tested against a
real browser/device or a real Supabase project in this pass** — see
"Real Web Push test status" and "Real Supabase migration status."

### Existing infrastructure found (audited before writing anything)
- **`public/sw.js`** — a real, hand-registered service worker (via a
  plain `<script>` in `index.html`, no vite-plugin-pwa, no competing
  worker) already existed, with cache-strategy logic but no `push` or
  `notificationclick` handlers. **Extended in place, not replaced.**
- **`public/manifest.json`** — a real PWA manifest already existed
  (`display: standalone`, SVG icons only). Unchanged.
- **`src/hooks/useNotifications.ts` + `supabase/functions/notifications`**
  — a real, separate system for verification-code-based email/SMS/
  WhatsApp/Telegram/Discord channels (GoHighLevel-based, explicitly
  `PENDING PROVIDER` for actual sending). Explicitly out of scope for
  this task and architecturally unrelated (no subscription concept at
  all) — **left completely untouched.**
- **`settings` table** (`key text PRIMARY KEY, value_json jsonb`) — the
  project's real admin-config pattern, already used by
  `AdminSettings.tsx`. An existing `reminders_*` key group already
  existed there too (email/SMS/GHL-based, also out of scope) — **left
  untouched**; this pass adds a clearly-separated `push_*` namespace
  instead of extending or repurposing `reminders_*`.
- **Game-day/cutoff logic**: `get_madrid_today()` (Postgres RPC),
  `game_state.last_play_date`/`current_streak`/`updated_at`,
  `played_today` — all already existed and are already the authoritative
  source used by `get_my_state()` and `cashout_game()`. **Reused, never
  redefined** — the scheduler calls `get_madrid_today()` for "what day is
  it" and uses the same `Europe/Madrid` timezone identifier (via `Intl`,
  DST-safe) only for "how many minutes are left in today."
- **Qualification, cashout, wallet, streak-reset, Day-30 badge logic** —
  all inspected, all unchanged. The scheduler only *reads* this state; it
  never writes to any of it.

### Architecture
```
Player enables notifications (Settings or a post-result prompt)
  -> browser creates a PushSubscription
  -> stored in push_subscriptions (RLS: owner-only)
  -> Supabase Cron (every 15 min) invokes schedule-reactivation-notifications
  -> centralized eligibility engine (supabase/functions/_shared/eligibility.ts)
     selects candidates using get_madrid_today() + real game_state/prefs
  -> a delivery-log row is inserted FIRST (unique index enforces dedup)
  -> send-web-push's shared sendWebPush() helper delivers the encrypted push
  -> public/sw.js's push handler displays it
  -> notificationclick focuses/opens STS at an allow-listed route
  -> record_notification_click() RPC records the click (server-validated)
```
Eligibility (who) and delivery (how) are deliberately separate — the
scheduler never contains push-crypto logic, and the delivery helper never
makes an eligibility decision.

### Web Push dependency
`npm:web-push@3.6.7`, imported directly in the Deno Edge Functions.
Chosen because it's the standard, actively-maintained library for VAPID
JWT signing and RFC 8291 payload encryption, and Supabase Edge Functions'
Deno runtime documents support for `npm:` specifiers. **Not executed in
this environment** (no Deno runtime available here) — verify the import
resolves and a real send succeeds against a real Supabase project before
relying on it; the documented fallback if it doesn't is a Deno-native
Web Crypto implementation (more code, no npm dependency), not built in
this pass.

### Subscription flow
`src/lib/webPush.ts` (pure browser-API helpers: feature/iOS detection,
VAPID key conversion, subscribe/unsubscribe) + `src/hooks/useWebPush.ts`
(wires those to Supabase — owner-scoped RLS table access, no extra RPC
layer needed for simple CRUD). One endpoint is never duplicated: upsert
on `endpoint` (unique index) updates the existing row rather than
inserting a second one.

### Consent flow
`Notification.requestPermission()` is called from exactly one place —
inside `enableReminders()` in `useWebPush.ts` — and that is only ever
invoked from `PrePermissionModal.tsx`'s "Enable Reminders" button, which
itself is only ever shown after a player clicks "Enable Reminders" in
`StreakRemindersCard.tsx` (Settings) or the small opt-in strip in
`ResultReminderPrompt.tsx` (post-result). **Never called on page load,
never called automatically.** Denied permission is never re-prompted
automatically; STS preference state stays consistent with real browser
permission. On iOS/iPadOS Safari outside Home Screen mode,
`requiresHomeScreenInstall()` swaps the Enable button for install
instructions instead of a broken prompt.

### Player Settings changes
New `StreakRemindersCard` section added to `SettingsPage.tsx`, **not**
gated behind the existing "upgrade required" wall the verified-channel
section uses (guests already have a real `auth.uid()` in this app, so
Web Push works for them too). Shows browser support, permission state,
this-device subscription state, global STS toggle, per-type toggles,
Disable This Device, and Disable All Reminders (preferences preserved,
re-enable later without re-granting browser permission).

### Admin settings changes
New `push_*` settings group (16 keys) seeded via
`20260714010000_*.sql`, reusing the existing `settings` table/pattern —
**a new namespace, not an extension of the existing `reminders_*`
group.** New "Reactivation Notifications" card in `AdminConfig.tsx` and
a new `PushSection` in `AdminSettings.tsx` (same generic
`SETTING_META`-driven field renderer already used by System Config), plus
an admin test-send widget (`AdminPushTestPanel.tsx`).

### Next-day eligibility rules
Player active, global+type+player-preference all enabled, an active
subscription exists, `last_play_date` matches the *previous* Madrid game
date, player hasn't played *today*, not already sent today, minimum
spacing since any prior STS notification elapsed. **No streak requirement
— works after both survive and fail**, since the objective is
reactivation, not only streak protection (verified explicitly in
`scripts/verify-notification-eligibility.ts`).

### Last-call eligibility rules
Player active, global+type+player-preference enabled, active
subscription, hasn't played today, remaining time is within the
configured window (`push_last_call_minutes_before_cutoff`, computed from
the real Madrid clock, not a fake countdown), cutoff hasn't passed, not
already sent today, minimum spacing elapsed. Streak-risk copy
(`push_last_call_*_streak`) is only ever selected when
`current_streak > 0` — the no-streak variant never implies a streak is
at risk.

### Timezone and cutoff handling
"What day is it" always comes from `get_madrid_today()` (the RPC, called
once per scheduler run) — never computed independently in the Edge
Function. "How much time is left in today" is computed via
`Intl.DateTimeFormat` with the same `Europe/Madrid` identifier (DST-safe,
verified with a real July date in the test script) — never the Edge
Function server's own local timezone, never anything derived from a
player's browser (browser timezone is stored on the subscription for
future display purposes only, per the task's instruction, and never used
to compute eligibility).

### Database migrations (append-only, in order)
1. `20260714000000_reactivation_core_schema.sql` — `push_subscriptions`,
   `notification_preferences`, `notification_delivery_log`, indexes, RLS.
2. `20260714005000_notification_click_rpc.sql` — `record_notification_click()`.
3. `20260714010000_push_settings.sql` — the `push_*` settings seed.
4. `20260714020000_reactivation_cron_template.sql` — enables `pg_cron`/
   `pg_net`; the actual `cron.schedule(...)` call is a commented template
   (see "Real Supabase migration status" for why).

### RLS policies
- `push_subscriptions` / `notification_preferences`: players `SELECT`/
  `INSERT`/`UPDATE` only their own rows (`user_id = auth.uid()`); no
  `DELETE` policy for players (disabling is a column update, not a row
  delete, preserving audit history as required). `service_role` bypasses
  RLS for the scheduler/delivery functions by design.
- `notification_delivery_log`: players may `SELECT` their own rows only —
  **no `INSERT`/`UPDATE` policy at all for `authenticated`.** A normal
  client cannot insert a fake delivery log or mark a notification
  clicked/sent directly; the only write path for a click is the
  `SECURITY DEFINER` `record_notification_click()` RPC, which validates
  the row belongs to the caller before touching it.

### Edge Functions
- **`schedule-reactivation-notifications`** — Cron-invoked (service-role
  auth only), runs the centralized eligibility engine, inserts a
  delivery-log row before sending (relying on the unique index to make a
  repeated Cron tick a safe no-op), calls the shared `sendWebPush()`
  helper in-process (no HTTP hop needed between functions in the same
  runtime), updates delivery status and subscription health.
- **`send-web-push`** — thin, service-role-only delivery function for
  any caller needing an HTTP-level send (e.g. `test-web-push`); never
  makes an eligibility decision.
- **`test-web-push`** — admin-only. Requires **both** a valid admin
  session (`x-admin-session`, same mechanism as `supabase/functions/admin`)
  **and** a valid player JWT (proving a real, currently-logged-in device)
  — since subscriptions are owned by a player (`auth.uid()`), not an
  admin session, which is a separate mechanism in this project. Only ever
  sends to the calling player's own subscriptions — never accepts an
  arbitrary target user ID. Test sends use `notification_type='test'`,
  which the dedupe unique index explicitly excludes, so they never
  consume or interact with real scheduled-message limits.

### Cron
Every 15 minutes, per the recommended frequency — the function itself
determines which window (if any) is active; Cron firing doesn't itself
trigger a send. The actual `cron.schedule(...)` call could not be
committed with a real project URL/secret baked in (see "Not implemented
in this pass" in the migration's own header) — provided as a documented
template + exact manual deployment steps instead.

### Deduplication method
A partial unique index on
`(user_id, subscription_id, notification_type, game_date)` for non-test
rows. The scheduler always inserts the delivery-log row *before* sending;
a repeated Cron run's insert is rejected by the index and treated as a
safe no-op (not an error) rather than sending twice. Multiple devices
each get their own row (unique per subscription), so multi-device players
correctly receive one notification per device, not one total.

### Retry and invalid-subscription handling
`sendWebPush()` distinguishes permanent failures (push-service `404`/
`410` — the standard "this endpoint no longer exists" signal) from
temporary ones. Permanent failures disable the subscription
(`enabled=false`, `revoked_at` set) — never retried. Temporary failures
increment `failure_count` and remain retryable within the same run; there
is no separate retry-queue mechanism in this Phase 1 pass (a failed send
is recorded as `failed_temporary` and will naturally be re-attempted on
the *next* Cron tick only if the delivery-log row for that exact
`(user, subscription, type, date)` doesn't already exist — since the
unique index is what prevents duplicates, a `failed_temporary` row does
occupy that dedupe slot, meaning **Phase 1 does not automatically retry
a temporary failure on the next tick within the same game day** — flagged
as a known limitation below, since a real bounded-retry loop needing to
coexist with the dedupe index needs more design than fits this pass).

### Click tracking
`src/lib/notificationClick.ts` reads `?notification=<id>` from the URL on
app mount (`NotificationClickHandler` in `App.tsx`, mirroring the
existing `UrlErrorCleaner` mount-once pattern) and calls
`record_notification_click()` — server-validates the ID belongs to the
calling user before writing anything, then strips the query params from
the URL. No automatic play action is ever triggered by a click.

### Files added
`supabase/functions/_shared/{webpush,gameDay,eligibility}.ts`,
`supabase/functions/schedule-reactivation-notifications/index.ts`,
`supabase/functions/send-web-push/index.ts`,
`supabase/functions/test-web-push/index.ts`,
`supabase/migrations/20260714*.sql` (4 files),
`src/lib/{webPush,notificationEligibility,notificationClick}.ts`,
`src/hooks/useWebPush.ts`,
`src/components/notifications/{PrePermissionModal,ResultReminderPrompt}.tsx`,
`src/components/settings/StreakRemindersCard.tsx`,
`src/pages/admin/AdminPushTestPanel.tsx`,
`scripts/verify-notification-eligibility.ts`, `.env.example`.

### Files modified
`public/sw.js` (push/notificationclick handlers added), `src/App.tsx`
(click-tracking mount), `src/pages/SettingsPage.tsx` (new section),
`src/pages/admin/AdminSettings.tsx` (new `push` section + `SETTING_META`
entries), `src/pages/admin/AdminConfig.tsx` (new nav card),
`src/components/game/ResultModal.tsx` (post-result prompt, gated off
during cashout), `.env` (empty `VITE_VAPID_PUBLIC_KEY` placeholder added
— no real secret).

### Files removed
None.

### Environment variables and secrets
Frontend (`.env`, public): `VITE_VAPID_PUBLIC_KEY`. Supabase Edge
Function secrets (server-only, never committed): `VAPID_PRIVATE_KEY`,
`VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (`mailto:...`). See DEPLOYMENT.md for
exact generation/setup steps. No private key was generated or committed
in this pass, per instruction.

### Tests run
`scripts/verify-notification-eligibility.ts` — **24/24 passed**, real
execution: every next-day/last-call scenario the task lists, copy
selection, global/type toggles, and real `Intl`-based Madrid timing
(not mocked). Re-ran all three pre-existing scripts to confirm no
regression: `verify-result-messages.ts` 25/25,
`verify-cashout-messages.ts` 7/7, `verify-cashout-idempotency.ts` 40/40.
**96/96 total, all genuinely executed via `npx tsx`.**

`npm install` — attempted; the real npm registry returns `403 Forbidden`
in this sandbox (same restriction as every prior pass in this project,
reconfirmed, not assumed). `npx tsc --noEmit` / `npm run build` therefore
not run. The Deno Edge Functions could not be executed at all in this
environment (no Deno runtime here) — reviewed by hand, not run.

### Deployment steps
See `DEPLOYMENT.md` → "Reactivation System Phase 1 — Web Push deployment"
for the full, exact 15-step order (VAPID generation through rollback).

### Known limitations
- **Not deployed, not tested against any real browser, device, or
  Supabase project.** Every claim above is "designed and reviewed
  correctly," not "verified working."
- `npm:web-push` compatibility with the actual deployed Supabase Edge
  Functions runtime is unverified — flagged with a documented fallback.
- Cron's `cron.schedule(...)` call requires manual completion with real
  project/secret values (cannot be safely committed) — a genuine
  deployment step, not an oversight.
- No automatic retry of a `failed_temporary` send within the same game
  day (see "Retry and invalid-subscription handling" above) — the
  dedupe-index/retry interaction needs more design than fits Phase 1.
- Notification icons are SVG-only (`icon-192.svg`) — some platforms
  render push-notification icons more reliably from PNG; not addressed
  in this pass (no new image assets were generated).
- `test-web-push` requires the admin's browser to also hold a live player
  session, since admin sessions and player auth are separate mechanisms
  in this project — documented as a deliberate Phase 1 design choice, not
  a bug.
- Manual multi-device concurrency (two tabs subscribing at once, etc.)
  was reasoned about but not tested against a real browser.

## Reactivation Phase 1 — Pre-deployment Hardening

Focused hardening pass on the Web Push system before any real deployment.
Six objectives, all addressed. No new channels, no campaign builder, no
UI redesign — existing player/admin interfaces are visually unchanged.

### 1. Retry design
Root cause confirmed: the original unique dedupe index
`(user_id, subscription_id, notification_type, game_date)` meant a
`failed_temporary` row permanently occupied that slot for the rest of the
game day — a transient push-service error silently became a permanent
non-delivery. Fixed with real bounded retry:
- New columns on `notification_delivery_log`: `attempt_count`,
  `first_attempt_at`, `last_attempt_at`, `next_attempt_at`, `expires_at`.
- A fresh job is inserted with `next_attempt_at = now()` (claimable
  immediately) and `expires_at` set to the job's real usefulness
  deadline — for `last_call`, this is the **exact** Madrid cutoff
  timestamp (`nextMadridMidnight()`), never a looser approximation, so a
  retry can structurally never fire past the real cutoff.
- On temporary failure: `attempt_count` increments;
  `computeNextAttempt()` (`supabase/functions/_shared/retry.ts`, mirrored
  in `src/lib/notificationRetry.ts`) decides the next attempt time —
  **5 minutes** after the 1st failure, **15 minutes** after the 2nd,
  **no retry** after the 3rd (max 3 attempts total) or if the next
  candidate time would land at/after `expires_at`. `next_attempt_at` is
  explicitly set to `NULL` when retries stop — this is a deliberate
  inversion from the original design (where `NULL` was accidentally
  treated as "claim immediately"); `NULL` now means "never claim this
  again."
- On permanent failure (push-service `404`/`410`): `next_attempt_at =
  NULL`, subscription disabled, no retry — unchanged from before.
- On success: `next_attempt_at = NULL`, `status = 'sent'` — never sent
  again. Terminology stays accurate throughout: `sent` means "the push
  service accepted it," never "read" or "viewed."

### 2. Scheduler claim mechanism
`claim_due_notification_jobs(p_limit)` — a `SECURITY DEFINER` function
using `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)` in one
statement, atomically flipping claimed rows to `status = 'sending'` and
returning them. A concurrent second scheduler invocation's own `FOR
UPDATE SKIP LOCKED` selection simply skips any row still locked by an
in-flight first transaction — no blocking, no double-claim. If a worker
crashes before committing, Postgres releases the row lock automatically
when that connection ends, so the job becomes claimable again on the next
tick — no permanent lock is possible. Standard Postgres-native leasing,
no new infrastructure. Documented in full in the migration's own header
comment (`20260714030000_*.sql`), not just here.

### 3. Player-level frequency rule
Re-scoped the unique dedupe index from
`(user_id, subscription_id, notification_type, game_date)` to
`(user_id, notification_type, game_date)` — one logical scheduled
notification per player per type per day, matching the product rule
exactly, not per-device. **Preferred-device selection** (not fan-out to
all devices) is Phase 1's device strategy:
`selectPreferredSubscription()` (`_shared/eligibility.ts`, mirrored for
tests) picks (1) an enabled subscription, preferring (2) the one with
the most recent successful delivery, else (3) the most recently updated
active one (which subsumes "most recently created" as a corollary, since
`updated_at` defaults to `created_at` and only diverges once something
actually changes — no separate tiebreak needed). The scheduler
**re-resolves the device fresh at claim/send time**, not just at
job-creation time, so a device that became disabled between queueing and
sending is correctly skipped in favor of another active one. Test sends
remain device-specific by construction — `test-web-push` never calls
`selectPreferredSubscription` at all, it always targets the requesting
device's own subscription directly.
`push_scheduled_device_strategy` was considered but **not added** as a
config key in this pass — Phase 1 hardcodes `preferred_device` (the only
strategy that satisfies the stated per-player rule); adding the
`all_devices` alternative as a real, working option would need the
fan-out path built and tested, which is out of scope here. Not silently
reinterpreting the requirement: fan-out was rejected specifically because
it violates the per-player rule, not merely because it's less convenient.

### 4. Subscription ownership
Audited the real risk: the previous design let the browser call
`.upsert(..., { onConflict: 'endpoint' })` directly. Traced exactly what
happens when an endpoint already belongs to a different user (the real
scenario: a player logs out, a different player logs in, same
browser/device, same push subscription, no unsubscribe in between) —
the existing `UPDATE` RLS policy (`USING (user_id = auth.uid())`) would
**reject** that conflicting update outright. Not a silent hijack (the
previous owner's row can't be overwritten by an unrelated write), but a
real dead end for the new, legitimate player — they simply couldn't
subscribe. The report and this changelog are precise about that
distinction rather than overclaiming a security bug that wasn't quite
present.

Fixed with `register_push_subscription(p_endpoint, p_p256dh, p_auth,
p_user_agent, p_browser_family, p_platform, p_timezone) RETURNS uuid` —
`SECURITY DEFINER`, `SET search_path = ''`, fully-qualified references,
`REVOKE ALL ... FROM PUBLIC, anon` then `GRANT EXECUTE ... TO
authenticated`. Never accepts a client-supplied `user_id` — always reads
`auth.uid()` server-side. Validates endpoint shape (`https://`, length
bounds), `p256dh`/`auth` key lengths, before touching any row. One atomic
`INSERT ... ON CONFLICT (endpoint) DO UPDATE` reassigns `user_id` to
whoever is currently authenticated, re-enables the row
(`enabled=true, revoked_at=NULL`), and resets `failure_count = 0` — a
fresh re-registration deserves a clean failure history. The previous
owner is never exposed to the caller. The direct client `INSERT` RLS
policy on `push_subscriptions` is **dropped** — subscription creation now
only happens through this RPC; `SELECT`/`UPDATE` (own rows only, used for
reading status and the "disable this device" action, which don't need
ownership-transfer semantics) are unchanged and remain sufficient — no
extra RPC was added for disabling, since direct RLS-scoped update
already safely covers that specific action.

### 5. Prompt cooldown
Audited `ResultReminderPrompt.tsx` against the full required condition
list — all were **already correctly implemented** except the cooldown
duration and lack of versioning:
- ✅ not shown during active gameplay (only mounted inside a completed `ResultModal`)
- ✅ not shown during cashout (`!showCashoutFlow` gate in `ResultModal.tsx`)
- ✅ not shown when already subscribed / permission denied / unsupported
- ✅ not shown twice in the same result flow (single mount, local state)
- ✅ Settings remains available during cooldown (`StreakRemindersCard.tsx` never checks this cooldown — a fully separate flow)
- ✅ never auto-invokes `Notification.requestPermission()` after cooldown — always the pre-permission screen first

**Fixed**: cooldown bumped from an ad hoc 3 days to the required **7
days**, and the dismissal record is now versioned
(`sts_reminder_prompt_dismissed_v1`, a JSON `{dismissedAt, version}`
record) so a future copy/behavior change can deliberately reset the
cooldown by bumping `PROMPT_VERSION`, rather than an old dismissal
silently suppressing a materially different prompt forever. The cooldown
logic itself was extracted into `src/lib/promptCooldown.ts` (pure,
injectable-storage, actually executed by the verification script) so the
component and the tested logic are the same code, not a duplicate.

### 6. Safe initial settings
Audited the actual seeded values, not assumed: `push_global_enabled`
(`false`) and `push_test_mode` (`true`) were already correct.
**`push_next_day_enabled` and `push_last_call_enabled` were wrongly
seeded `true`** in the original migration — confirmed by direct
inspection, not memory. Fixed via a new migration (UPDATE, not another
`ON CONFLICT DO NOTHING` insert, since the original seed already ran) —
`20260714050000_*.sql` forces both to `false`, plus defensive UPDATEs
re-asserting the other two in case a differently-provisioned environment
diverged. The scheduler already checked `push_global_enabled` first,
before selecting candidates, inserting any row, or calling the push
provider, and returns a clear `{ skipped: 'global_push_disabled' }`
no-op — unchanged, reconfirmed by reading the current scheduler code
again during this pass. The Cron migration
(`20260714020000_*.sql`) was re-confirmed to contain no active,
uncommented `cron.schedule(...)` call with an embedded secret or URL —
now also verified by an automated static check in the test script (see
"Tests run"), not just manual review.

### 7. Authoritative cutoff
Traced the exact source again, explicitly for this pass: `get_madrid_today()`
(Postgres RPC) is the sole source of "what game day is it," used
identically by `get_my_state()`, `cashout_game()`, and the scheduler — no
separate or duplicated cutoff calculation exists anywhere in this
project. The actual cutoff **is** Madrid midnight — confirmed by reading
every play-eligibility code path again; there is no other configured
cutoff time in `settings` or anywhere else. "How much time remains
today" is computed via `Intl.DateTimeFormat` with the `Europe/Madrid`
identifier (`minutesUntilMadridMidnight`) — DST-safe by construction,
since `Intl` resolves the real observed offset for the given instant
rather than a hardcoded `+1`/`+2`. New in this pass:
`nextMadridMidnight()` returns the **exact cutoff timestamp**, not just a
remaining-minutes estimate — this is what makes `expires_at` a hard,
precise ceiling for last-call jobs rather than an approximation.

### 8. Dependency configuration
`web-push@3.6.7` pinned exactly (no `^`/`~` range) in all three
consuming points: the inline `npm:web-push@3.6.7` specifier in
`_shared/webpush.ts` (the actual runtime import — this is what really
determines the resolved version) and a `deno.json` in each of the three
functions that (directly or via the shared module) depend on it
(`schedule-reactivation-notifications`, `send-web-push`, `test-web-push`),
all declaring the identical pin — no divergent/incompatible versions
across functions. Still unverified against a real Deno runtime — flagged
again, not newly resolved, in "Known limitations."

### Tests run
`scripts/verify-notification-eligibility.ts` extended significantly —
**72/72 passed**, genuinely executed via `npx tsx`, covering every
required case:
- **Retry**: first/second failure schedule the right delay, max attempts
  stops retries, expiry stops a retry that would cross the real cutoff,
  retry permitted well before expiry. ("Retry before/after
  `next_attempt_at`" and "two workers can't both claim the same job" are
  properties of the SQL claim query and Postgres row-locking — not
  expressible as a pure function call; documented as static-SQL-review
  only, not pure-logic-tested, directly in the script's own comments.)
- **Frequency/device selection**: one device → that device; three
  devices → the one with the most recent successful delivery; no
  successful deliveries → most recently updated; preferred device
  disabled → falls back; no enabled device → `null`.
- **Subscription ownership** (simulation, clearly labeled): new endpoint
  registers normally; same-user re-registration isn't a reassignment;
  a different user registering the same endpoint succeeds and reassigns
  ownership; malformed endpoint rejected; revoked endpoint safely
  re-enabled.
- **Prompt cooldown**: first result shows it; dismissal hides it; still
  within the 7-day cooldown on a later result; expired cooldown shows it
  again; denied permission suppresses it regardless of cooldown state.
- **Safe defaults**: global/type-disabled both correctly block candidate
  selection; **a real static-file check** (not a live DB read) confirms
  the actual migration text seeds/forces the required values and that the
  Cron template has no active, uncommented schedule call.

Re-ran all three pre-existing scripts to confirm no regression:
`verify-result-messages.ts` 25/25, `verify-cashout-messages.ts` 7/7,
`verify-cashout-idempotency.ts` 40/40. **144/144 total, all genuinely
executed.**

### Database migrations (append-only, in order)
5. `20260714030000_reactivation_retry_and_dedupe.sql` — retry columns,
   re-scoped unique index, `claim_due_notification_jobs()`.
6. `20260714040000_subscription_registration_rpc.sql` —
   `register_push_subscription()`, drops the direct client INSERT policy.
7. `20260714050000_push_safe_defaults.sql` — forces the two
   scheduled-type toggles to `false`.

### RLS changes
`push_subscriptions_insert_own` policy dropped — subscription creation is
now RPC-only. `SELECT`/`UPDATE` (own rows) unchanged. No changes to
`notification_preferences` or `notification_delivery_log` RLS.

### Edge Function changes
`schedule-reactivation-notifications` rewritten: two explicit phases
(job creation via eligibility, then claim-and-send via the new RPC),
preferred-device resolution (re-resolved at both phases), bounded retry
on temporary failure, precise `expires_at` per type. `send-web-push` and
`test-web-push` unchanged in this pass (their responsibilities didn't
need to change).

### Known limitations
- **Still not deployed, not tested against any real browser, device, or
  Supabase project.** Every claim above is "designed, reviewed, and
  (where the logic is pure) executed correctly" — not "verified working
  end to end."
- `FOR UPDATE SKIP LOCKED` correctness is a real, well-established
  Postgres guarantee, reviewed carefully, but genuinely **not exercised
  against a live database with real concurrent connections** in this
  environment — the "two workers" test case is explicitly documented as
  static-review-only in the test script itself, not glossed over.
- `web-push@3.6.7` npm-in-Deno compatibility remains unverified — same
  flag as the previous pass, not newly resolved by pinning the version.
- The `all_devices` fan-out strategy was deliberately not built — Phase 1
  only implements `preferred_device`, the one that actually satisfies the
  per-player rule as written.
- No new `push_scheduled_device_strategy` config key was added, since
  there's only one real implemented strategy right now; adding a config
  toggle for an unbuilt option would be misleading.

## Game Time System — Global and Regional Game Clocks

Built the authoritative Game Time System foundation and refactored the
Reactivation System to use it instead of hardcoded Madrid dependencies.
**No migration in this pass has been applied to any Supabase environment
— confirmed explicitly at the start of this task, not assumed.** Global
mode remains the only active mode; Regional mode exists but cannot be
activated by anything in this codebase (no Cron, no automatic switch).

### Existing Madrid dependencies found (full audit)

| Location | Current behaviour | Authoritative or duplicated | Must change now | Notes |
|---|---|---|---|---|
| `get_madrid_today()` (SQL, ~18 migrations call it) | `SELECT (now() AT TIME ZONE 'Europe/Madrid')::date` | Authoritative — the real source every core RPC uses | Yes, internals only | Signature/callers unchanged; now delegates to the Game Time System's global region |
| `play_daily_gate`, `cashout_game`, `get_my_state`, microgame RPCs, skull-gate assignment, guest-merge | Call `get_madrid_today()` directly | Duplicated call sites, not duplicated logic | No | Automatically benefit from the delegation above with zero individual changes — see "Design decision" below |
| `_shared/gameDay.ts` (Reactivation System) | Hardcoded `Europe/Madrid` + `Intl`, independent of the SQL function | Duplicated — a second, parallel Madrid implementation | Yes | Replaced by `_shared/gameClock.ts`, generalized, region-aware, no hardcoded timezone |
| `src/lib/notificationEligibility.ts` (test mirror) | Hardcoded Madrid mirror of the above | Duplicated (test-only) | Yes | Old functions removed; superseded by `src/lib/gameClock.ts` |
| `schedule-reactivation-notifications` scheduler | Called `get_madrid_today()` + local Madrid math directly | Duplicated computation | Yes | Rewritten to use `_shared/gameClock.ts` against `game_time_regions`/`game_time_settings`, set-based per region |
| `qualification_status` (`saturday_qualified`/`sunday_qualified`) | Weekly points threshold, no time-boundary logic at all | N/A — no existing timing logic | No | Confirmed by direct inspection: nothing to preserve or conflict with; Saturday/Sunday timing is genuinely new foundation here, not a replacement |
| Result-message copy ("today"/"tomorrow"/"come back tomorrow") | Static English strings, no date computed at all | N/A | No | Reads no date; audited and found to require no change — see "Result messaging" below |
| Frontend countdown displays (`ResultModal.tsx`, `CashoutFlow.tsx`) | Client-side, initialized from real server timestamps already (from the cashout-hardening passes) | Authoritative-by-construction | No | Already correctly server-initialized; out of scope to touch further |

### Design decision: additive layer, not a rewrite of core gameplay RPCs
`get_madrid_today()` now delegates internally to
`get_game_time_state_for_region()` (the Game Time System) instead of
hardcoding the literal `'Europe/Madrid'` — but its **signature, grants,
and return type are unchanged**, so every one of the ~18 migrations that
already call it (play_daily_gate, cashout_game, get_my_state, etc.) keeps
working with **zero individual changes and zero risk to gameplay or
financial logic**. Confirmed byte-for-byte identical output in Global
mode (the only active mode) by construction — the seeded default region
(`global_madrid`) is Europe/Madrid with a 00:00 rollover, and the
rollover-math formula reduces to exactly the old `(now() AT TIME ZONE
'Europe/Madrid')::date` when the rollover time is midnight (documented
precisely in the migration's own header comment).
Making `play_daily_gate`/`cashout_game`/etc. **genuinely per-user
region-aware** was deliberately NOT done in this pass — there is no
regional player yet (Regional mode isn't active), so there's nothing for
them to get wrong today, and touching ~18 migrations' worth of core
RPCs without any live-database testing capability here would be a real,
unjustified risk. This is documented as required future work for when
Regional mode is actually activated, not silently deferred.

### Architecture
```
game_time_regions        — IANA timezone, rollover time, Sat/Sun windows, per region
game_time_settings       — singleton: mode, global_region_id, pending-switch fields
user_game_time_region     — current region assignment per player (absence = global default)
user_game_time_region_change_log — append-only audit trail

get_game_time_state_for_region(region_id)  — the actual clock math, no per-user cost
get_game_time_state_for_user(user_id)      — resolves region, delegates to the above
resolve_user_game_time_region(user_id)     — just the resolution, reusable set-based
assign_user_game_time_region(...)          — the only write path (SECURITY DEFINER)
apply_pending_game_time_mode(...)          — manual application of a scheduled mode switch
```

### Modes
`Global Game Time` (active) and `Regional Game Time` (built, not
enabled). Terminology used exactly as specified in the product/admin
UI — never "continent time system" internally.

### Region model
`game_time_regions` — IANA timezone (never a fixed UTC offset),
configurable daily rollover time-of-day, optional Saturday/Sunday
windows, `enabled`/`display_order`. Seeded with exactly one safe default:
`global_madrid` (Europe/Madrid, 00:00 rollover, enabled). No Saturday/
Sunday windows seeded (NULL — "not configured"), since none existed to
migrate in. Regional mode is designed to support an arbitrary number of
regions — nothing hardcodes a count of four; the "four regions" language
in the brief was explicitly examples only.

### Player assignment
`user_game_time_region` — one row per explicitly-assigned player.
**No row means "resolves to the global region"** — confirmed this
requires zero backfill and zero risk to existing accounts, since the
resolution functions fall back to `game_time_settings.global_region_id`
whenever no explicit (or no longer-enabled) assignment exists. Players
cannot write to this table at all (no RLS INSERT/UPDATE policy) —
`assign_user_game_time_region()` is the only write path, `SECURITY
DEFINER`, granted to `service_role` only, and logs every change to
`user_game_time_region_change_log`.

### Region-change protection
Per requirement #7: assignment is admin/server-only, every change is
logged, and — critically — `get_game_time_state_for_user()` in Global
mode **ignores any individual assignment entirely** and always uses the
global region, so even a player who somehow has an explicit region row
today cannot get a different game date than everyone else while Regional
mode is off. When Regional mode is eventually activated, the "safe future
boundary" rule (mode switches, and by extension intended region
reassignments, take effect at the next rollover, not immediately) is what
prevents a same-day double-play — this pass builds that boundary
mechanism (`pending_mode`/`pending_mode_effective_at` +
`apply_pending_game_time_mode()`) but does not yet build a player-facing
region-reassignment flow beyond the admin RPC, per the explicit
instruction not to build a complex region-change UI yet.

### Shared Game Clock
`get_game_time_state_for_region()` returns exactly the fields requested
(mode is added by the wrapper `get_game_time_state_for_user()`):
`region_id, region_key, timezone, local_now, game_date,
previous_game_date, daily_rollover_at, next_daily_rollover_at,
daily_window_open, daily_window_closed, saturday_status,
saturday_start_at, saturday_end_at, sunday_status, sunday_start_at,
sunday_end_at`. The Edge Function side (`_shared/gameClock.ts`, mirrored
in `src/lib/gameClock.ts`) implements the identical formula independently
in TypeScript/Intl — documented explicitly as intentionally parallel
(not a second source of truth in the sense of disagreeing; the same
algorithm, verified by extensive DST tests), used for scheduler
efficiency so a live RPC round-trip isn't needed per region per tick.

### Play-eligibility integration
`get_madrid_today()` is now Game-Time-System-backed (see "Design
decision" above). `play_daily_gate`/`cashout_game`/`get_my_state` were
**not** individually modified — they continue calling `get_madrid_today()`
exactly as before. `played_today`'s logical meaning ("played during the
player's current authoritative game date") is preserved in Global mode
by construction; making it genuinely region-aware for individual players
requires the future work noted above, once Regional mode is real.

### Notification integration
The scheduler no longer imports or calls `get_madrid_today()`,
`minutesUntilMadridMidnight()`, or `nextMadridMidnight()` — verified by
an automated static check in `scripts/verify-game-time.ts`, not just
manual review. Instead:
- **Next-day**: uses the player's resolved region's `game_date` and
  `previous_game_date` from the Game Clock, compared against the
  player's real `last_play_date`.
- **Last-call**: uses the player's region's `minutesUntilNextRollover`
  and the configured `push_last_call_minutes_before_cutoff`; `expires_at`
  is set to the region's exact `next_daily_rollover_at` — the real
  cutoff, never an approximation, exactly as required.
- **Dedupe**: `(user_id, notification_type, game_date, region_id)` — the
  authoritative region is now part of the key (new migration
  `20260715040000_notification_dedupe_region.sql`),
  closing the "duplicate after reassignment" scenario at the database
  level, on top of the "safe future boundary" behavioral protection.
- **Scheduler efficiency**: the Game Clock is computed **once per
  distinct region among candidates**, not once per user — region
  resolution for the whole candidate set happens in one set-based JS pass
  (mirroring `resolve_user_game_time_region()`'s SQL logic) against two
  small already-fetched queries (`user_game_time_region` rows +
  `game_time_regions`), not one RPC call per user. With Regional mode off,
  this collapses to exactly one clock computation per scheduler tick
  (unchanged practical cost from before), but the code path is genuinely
  ready for multiple regions.

### Saturday/Sunday timing foundation
`get_game_time_state_for_region()` computes real Saturday/Sunday
start/end instants and an `upcoming`/`active`/`ended`/`not_configured`
status per region, using the same ISO-week-Saturday(+5)/Sunday(+6)
derivation on both the SQL and TypeScript sides. **This is foundation
only** — it is NOT wired into the existing points-based qualification
system (`saturday_qualified`/`sunday_qualified`), which remains
completely unchanged, per the explicit instruction not to silently alter
current event rewards, qualification logic, or leaderboards. Recommended
future model, as requested: **regional event instances using the same
content and rules** (i.e., each region runs its own Saturday/Sunday
window independently, not one global leaderboard staggered by time zone)
— documented as the recommendation, not implemented, since building
actual event-instance mechanics is explicitly out of scope for this pass.

### Result-message timing
Audited every result-message string containing "today"/"tomorrow"/"next
day"/"come back tomorrow"/"starts tomorrow"
(`src/lib/resultMessages.ts`, `src/lib/cashoutMessages.ts`) — **none of
them compute or read a date at all**; they're static English strings
selected by scenario (survived/failed/milestone/etc.), not by calendar
math. No change was needed or made — confirmed by inspection, not
assumed. The result-messaging system already correctly has no
Madrid-specific dependency to refactor.

### Mode-switch safeguards
Switching modes is never immediate. Admin schedules a `pending_mode` +
`pending_mode_effective_at` (defaulted to the global region's next
rollover in the admin UI) via a plain settings update; **actually
applying it requires the separate `apply_pending_game_time_mode()` RPC to
be run explicitly after that boundary passes** — nothing in this
codebase calls it automatically (Cron stays inactive, per this task's
instructions). Regional mode cannot even be *scheduled* unless at least
one enabled region exists (checked client-side in the admin UI before
the request is made, and the underlying assignment/resolution functions
would simply keep falling back to the global region if it somehow
weren't). The admin UI requires an explicit confirmation step before
scheduling any switch.

### Migration consolidation decision
All migrations from every recent pass (cashout hardening, `get_my_state`
fixes, the Reactivation System, and this Game Time System) are confirmed
unapplied to any Supabase environment. Consolidation was considered but
**deliberately not performed** — hand-merging ~15 files of non-trivial
PL/pgSQL (especially the three sequential `cashout_game` hardening
migrations, each of which was individually reviewed and tested via
simulation) with **zero live-database verification capability in this
environment** would introduce real transcription risk for a purely
cosmetic benefit (fewer files). The migrations are not contradictory —
each one is additive or correctly-superseding, never fighting a previous
one — so there is no correctness reason to merge them. This is a
deliberate engineering judgment call, not an oversight; documented here
explicitly rather than silently defaulted to.

### Final ordered migration plan
The complete, final, unapplied migration set, in the exact order they
must be applied (`supabase db push` applies files in filename order,
which is already correct — this list is for review, not a reordering
instruction):
1. `20260713120000` — cashout `transaction_id`/`currency`
2. `20260713140000` — cashout idempotent retry
3. `20260713160000` — `get_my_state()` exposes `updated_at`
4. `20260713180000` — `get_my_state()` exposes `max_streak`/`completed_cycles`
5. `20260713200000` — cashout server-side context validation (drops the 2-arg overload)
6. `20260713220000` — cashout RPC exposure hardening (drops the legacy no-arg overload, removes defaults)
7. `20260714000000` — Reactivation System core schema
8. `20260714005000` — notification click RPC
9. `20260714010000` — push settings seed
10. `20260714020000` — Cron extensions + commented template (inactive)
11. `20260714030000` — retry fields + player-level dedupe + job-claim RPC
12. `20260714040000` — subscription registration RPC
13. `20260714050000` — forces `push_next_day_enabled`/`push_last_call_enabled` to `false`
14. `20260715000000` — **Game Time System core schema** (new)
15. `20260715010000` — **Game Time System safe default config** (new)
16. `20260715020000` — **Game Time System Game Clock RPCs** (new)
17. `20260715030000` — **`get_madrid_today()` delegates to the Game Time System** (new)
18. `20260715040000` — **notification dedupe includes region** (new)

The final migrated state: cashout RPC hardening preserved (step 6 is the
final word on it), `get_my_state()` fields preserved (steps 3-4), Web
Push tables/RPCs preserved (steps 7-13), Game Time System added (14-18),
Madrid-only notification dependencies replaced (implicit in 17-18 plus
the Edge Function rewrite), scheduled push stays disabled (step 13, and
re-confirmed by the new migration-consistency static checks), Cron stays
inactive (step 10, re-confirmed).

### Tests run
`scripts/verify-game-time.ts` (new) — **40/40 passed**, genuinely
executed via `npx tsx`: Global-mode-unchanged behavior, two regions
producing different game dates for the identical physical instant, real
DST transitions across four actual IANA timezones (Europe/Madrid,
America/New_York, Asia/Tokyo — no DST at all, Australia/Sydney — DST in
the opposite hemisphere), Saturday/Sunday window boundary conditions
including an inverted/degenerate window, and static migration-consistency
checks (scheduled push stays disabled, Cron stays inactive, the scheduler
no longer calls any Madrid-specific helper, cashout/get_my_state
hardening is present in the final migration files).

`scripts/verify-notification-eligibility.ts` was updated — the Madrid-
specific DST test section it used to contain (which called functions
removed from `notificationEligibility.ts` during this refactor) was
**removed, not left broken**: it's superseded by the new, more thorough
multi-timezone coverage in `verify-game-time.ts`, not just relocated
wholesale. Re-ran the full suite: `verify-result-messages.ts` 25/25,
`verify-cashout-messages.ts` 7/7, `verify-cashout-idempotency.ts` 40/40,
`verify-notification-eligibility.ts` 57/57 (down from 72 — the 15 removed
tests are the ones superseded above, not silently dropped coverage).
**169/169 total, all genuinely executed.**

A real mistake was caught and fixed during this pass, worth being honest
about: the initial refactor left `verify-notification-eligibility.ts`
importing functions that had just been deleted from
`notificationEligibility.ts`, which crashed the script at import time.
Caught by actually running the full suite before declaring this pass
done, not just by individually running the new script.

### Files added
`supabase/migrations/20260715*.sql` (5 files),
`supabase/functions/_shared/gameClock.ts`,
`src/lib/gameClock.ts`, `src/pages/admin/AdminGameTimeSection.tsx`,
`scripts/verify-game-time.ts`.

### Files modified
`supabase/functions/_shared/gameDay.ts` — **removed** (replaced by
`gameClock.ts`); `supabase/functions/schedule-reactivation-notifications/index.ts`
(rewritten, region-aware); `supabase/functions/_shared/eligibility.ts`,
`supabase/functions/_shared/retry.ts` (comment fixes only — the
eligibility/retry logic itself was already timezone-agnostic and needed
no functional change); `src/lib/notificationEligibility.ts` (Madrid-only
functions removed); `src/pages/admin/AdminConfig.tsx` (new nav card +
routing branch); `scripts/verify-notification-eligibility.ts` (import
fix + redundant-section removal).

### Known limitations
- **No migration in this pass has been applied anywhere.** Everything
  above is designed, cross-referenced against the actual current schema
  by direct inspection, and verified via pure-logic execution — not
  verified against a live Postgres instance.
- `play_daily_gate`, `cashout_game`, and other core RPCs are not yet
  genuinely per-user region-aware — safe today (Regional mode is off) but
  real future work before Regional mode can be activated for real
  players.
- Saturday/Sunday timing is foundation only, not wired into the actual
  qualification/event system — deliberately, per scope.
- The admin Game Time UI does not support creating/editing additional
  regions yet — only status display and a safeguarded mode-switch
  scheduling flow. Only one region exists, so this wasn't blocking.
- `apply_pending_game_time_mode()` is never called automatically by
  anything — a real background trigger for this (once Cron is ever
  activated) is future work, not built here since Cron must stay
  inactive per this task's instructions.

## Game Time System — Regional Activation Guard

Small, focused safety hardening pass. No redesign of the Game Time
System; no refactor of play RPCs, cashout, qualification, Saturday/Sunday
events, or notifications — confirmed by an explicit static check in this
pass's own test additions that the notification scheduler wasn't touched.

### Why the guard was added
The Game Time System foundation is real and correct, but the previous
pass's own documentation was explicit: core gameplay RPCs
(`play_daily_gate`, `cashout_game`, `get_my_state`, qualification,
Saturday/Sunday events) are **not yet genuinely per-user region-aware**.
Before this pass, Regional mode *could* technically be scheduled and
applied by an admin (gated only by "at least one enabled region exists")
— that's a real correctness gap: a player could resolve to a non-global
region for notification purposes while every gameplay RPC still silently
treated them as being on the global clock. This pass closes that gap with
a real, database-level block, not just an admin-UI omission.

### What remains global-only
Everything. Global Game Time (Europe/Madrid) is the only clock any
player's gameplay, streak, cashout, or qualification logic can ever use
right now — this was already true before this pass and remains true
after it; this pass only makes it **impossible to accidentally or
deliberately change that** until a real readiness decision is made.

### Backend guard
New column: `game_time_settings.regional_game_time_live_enabled boolean
NOT NULL DEFAULT false` — a developer/system readiness flag, deliberately
separate from `regional_mode_enabled` (which just reflects current
state) and from any normal product setting.

`apply_pending_game_time_mode()` (`CREATE OR REPLACE`, same signature —
safe, grants preserved) now checks this flag **before** ever applying a
switch to `'regional'` mode:
```sql
IF v_settings.pending_mode = 'regional' AND NOT v_settings.regional_game_time_live_enabled THEN
  RAISE EXCEPTION 'Regional Game Time is not enabled for live gameplay yet.';
END IF;
```
The pending request is left in place (not silently discarded) so an
admin can see it's still pending and understand why. Switching back to
`'global'` is never blocked by this flag — only activation of Regional
mode is guarded. This is the **authoritative** block — a direct RPC
call, a future admin bypass, or a UI bug cannot activate Regional mode
while the flag is false; the database itself refuses.

### Admin UI guard
`AdminGameTimeSection.tsx`:
- The "Switch to Regional Game Time" button is now **conditionally
  rendered, not just disabled** — it does not exist in the DOM at all
  unless `regional_game_time_live_enabled` is true AND at least one
  region is enabled (both checked via the shared, real, executed pure
  function `canScheduleRegionalActivation()` in the new
  `src/lib/gameTimeGuard.ts` — the admin UI uses this function directly,
  not a re-implemented duplicate check).
- Regional Game Time is shown as a labeled "Foundation built · Not
  live-ready" future capability, with the exact required warning copy
  (`REGIONAL_NOT_READY_MESSAGE`, verified word-for-word in the test
  script).
- The readiness flag itself is displayed as **read-only status text**
  (`regional_game_time_live_enabled: false (developer/system readiness
  flag — not a product setting; not editable from this screen)`) — there
  is no toggle, button, or `onChange`/`onClick` anywhere in this
  component that can flip it. Flipping it requires a direct database
  change by someone who understands what it gates, not an admin-panel
  click.
- Global Game Time switching remains available and unchanged.

### Readiness setting
`regional_game_time_live_enabled` — `boolean NOT NULL DEFAULT false`,
added via `ALTER TABLE`. Not exposed via the generic `settings` key/value
table (which is genuinely a product-config surface); kept on
`game_time_settings` itself, next to the other Game Time System
configuration it specifically gates.

### Safe first deployment state (re-confirmed, not just re-asserted)
All seven required defaults are now covered by an explicit, executed
static check in `scripts/verify-game-time.ts`'s new "Safe first
deployment state" section, reading the actual migration files rather
than restating them from memory: Global Game Time active, Europe/Madrid
global region, Regional mode disabled, Regional Game Time not live-ready
(new), scheduled push disabled, push test mode enabled, Cron inactive.

### Tests run
Extended `scripts/verify-game-time.ts` — **61/61 passed** (up from 40),
genuinely executed via `npx tsx`:
- Global mode remains active by default (static check against the actual
  seed migration).
- The pure `canScheduleRegionalActivation()` guard refuses scheduling
  while the readiness flag is false, both with and without a valid
  region — and correctly distinguishes the two different refusal reasons
  once the flag is true.
- Static checks against the actual new migration file confirm: the
  readiness column defaults to `false`, the exact required refusal
  error string is present, the readiness check runs *before* the
  activating `UPDATE` (ordering matters — checked by string-index
  comparison, not just presence), and the guard only applies to
  activation toward `'regional'`, never to switching back to `'global'`.
- Static checks against the admin component confirm it calls the shared
  guard function (not a duplicate), shows the exact required warning
  copy, conditionally renders (not just disables) the activation button,
  and never exposes the readiness flag as an editable control.
- A static check confirms the notification scheduler was not touched in
  this pass at all (no reference to the new flag), directly supporting
  "notifications still run in Global mode only, unchanged."
- Re-ran the full five-script suite to confirm zero regressions:
  `verify-result-messages.ts` 25/25, `verify-cashout-messages.ts` 7/7,
  `verify-cashout-idempotency.ts` 40/40,
  `verify-notification-eligibility.ts` 57/57 (unchanged from the
  previous pass — this pass touched nothing they cover),
  `verify-game-time.ts` 61/61. **190/190 total, all genuinely executed.**

### Files added
`supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql`,
`src/lib/gameTimeGuard.ts`.

### Files modified
`src/pages/admin/AdminGameTimeSection.tsx` (guard wiring, hidden
activation button, warning copy, read-only readiness display),
`scripts/verify-game-time.ts` (new test section).

### Remaining future work before Regional mode can go live
Unchanged from the previous pass's documented limitations, restated here
since this pass's whole purpose is to make sure nothing skips past them:
`play_daily_gate`, `cashout_game`, `get_my_state`, qualification, and
Saturday/Sunday event logic must all become genuinely per-user
region-aware. Only once that real gameplay work is done and verified
should `regional_game_time_live_enabled` ever be flipped to `true` —
and even then, only as a deliberate, direct, understood database change,
not an admin-panel toggle.

### Known limitations
- Not applied to any Supabase environment — same as every migration in
  every recent pass. Verified by static inspection and pure-logic
  execution only.

## Game Time System — Region-Aware Core Gameplay

Made core gameplay and reporting genuinely per-user-region-aware. Regional
Game Time remains disabled by default and `regional_game_time_live_enabled`
stays `false` — this pass makes the backend technically ready, it does
not switch anything on. **No migration in this or any prior pass has
been applied to any Supabase environment** — confirmed at the start of
this task, not assumed; Bolt tokens are expected back 18 July.

### Audit results

| Area | Current time source (before this pass) | Current game-date field | Region-aware now? | Must change now? | Risk |
|---|---|---|---|---|---|
| `play_daily_gate` | `get_madrid_today()` direct call | `plays.play_date` | No → **Yes** | Yes | High (financial/RNG) — mitigated by line-by-line diff, see below |
| `cashout_game` | `get_madrid_today()` (for `played_today` only) | n/a (reads `game_state`) | No → **Yes (audit metadata only)** | Yes, minimally | High (financial) — mitigated by diff; context/idempotency hardening untouched |
| `get_my_state` | **Independent inline** `(now() AT TIME ZONE 'Europe/Madrid')::date` — a second, previously-undiscovered hardcoded literal, separate from `get_madrid_today()` | `plays.play_date` via `played_today` | No → **Yes** | Yes | Medium — read-only function, diffed to confirm all existing fields preserved |
| `get_madrid_today` | Hardcoded `'Europe/Madrid'` (fixed in the previous pass) | n/a | Yes (delegates to Game Time System) | No — already done | Low |
| `get_game_time_state_for_user` / `_for_region` | Already region-parameterized (previous pass) | n/a | Yes | No | Low |
| `plays` table | `play_date` only, no region column, **no unique constraint of any kind** | `play_date` | No → **Yes (column added)** | Yes | High — see "real duplicate-play protection" below |
| `game_state` table | `last_play_date` set from whatever the caller computed | `last_play_date` | Now inherits from region-aware `play_daily_gate` | No (no schema change needed) | Low |
| `weekly_qualification_status` / `qualification_rules` | Points-based, keyed by `week_start_date`; week computed by **`get_current_week_start()`, a third independent hardcoded `'Europe/Madrid'` literal**, found this pass | `week_start_date` | No → **Yes (week boundary only)** | Yes | Medium — thresholds/values untouched, diffed to confirm |
| Saturday/Sunday event tables/functions | No time-window logic existed at all (confirmed again) — points threshold only | n/a | N/A → **foundation helper added** | Foundation only | Low |
| leaderboard/reporting views/functions | None existed grouping by game date/region | `created_at`/`play_date` ad hoc | No → **Yes (new view added)** | Yes (additive) | Low |
| notification scheduler | Already region-aware (previous pass) | `clock.gameDate` per resolved region | Yes | No — re-verified, not rebuilt | Low |
| `wallet_ledger` | No region field | n/a | No → **Yes (cashout rows only, audit)** | Minimal | Low |
| result messaging | No date computation of any kind (confirmed again) | n/a | N/A | No | None |
| cashout context logic | `p_context_id` vs `game_state.updated_at` — timezone-independent by design | n/a | Already correct | No | None |
| admin Game Time UI | Status display + guarded mode switch (previous two passes) | n/a | Yes | Minor addition (backend-readiness note) | Low |

Two previously-undiscovered hidden Madrid dependencies were found this
pass, neither caught by the earlier `get_madrid_today`-focused searches:
`get_my_state()`'s own inline `(now() AT TIME ZONE 'Europe/Madrid')::date`,
and `get_current_week_start()`'s independent hardcoded literal (used by
qualification). Both fixed the same way as `get_madrid_today()` —
delegated to the Game Time System, same signature, same return type.

### Final architecture
No new tables beyond what the previous two passes already built.
Additive columns: `plays.game_time_region_id`,
`weekly_qualification_status.region_id`. New functions:
`get_current_game_date_for_user()`, `get_current_week_start_for_user()`,
`get_saturday_sunday_status_for_user()`, `get_user_game_time_region_info()`.
New view: `v_plays_by_game_date_region`. `get_madrid_today()`,
`get_current_week_start()`, `play_daily_gate()`, `cashout_game()`,
`get_my_state()`, and `update_weekly_qualification()` were all
`CREATE OR REPLACE`d with unchanged signatures — no new overloads, no
breaking changes for any existing caller.

### Play RPC changes
`play_daily_gate()` — diffed against the live Economy v1 version
(`20260618112003_*.sql`) programmatically in
`scripts/verify-region-aware-gameplay.ts`, not just described as safe:
every RNG/probability/pot/jackpot/pool-contribution line is asserted
present verbatim. The only real changes: date/region resolution
(`get_madrid_today()` → `resolve_user_game_time_region()` +
`get_current_game_date_for_user()`), `game_time_region_id` stored on the
play row and in `meta`, and a defensive `game_id = 'daily_gate'` added to
the duplicate-play check (harmless today — every row already has that
value — but correct if a second game type is ever added to this table).

### Duplicate-play protection
**Found a genuine pre-existing gap**: no database-level uniqueness
constraint existed on `plays` at all — the only protection was an
application-level `SELECT` check running *before* the `game_state` row
lock, a real (if narrow) race-condition window for two concurrent
requests with different idempotency keys. Added
`UNIQUE (user_id, game_id, play_date)` — **not** including region,
per the task's own guidance that "one daily play per user per game date"
is the safer default than "one per region." The migration checks for
existing duplicates first and skips adding the constraint (with a clear
`NOTICE`, not a failure) if any are found — this table predates July
2026 and its live state has not been verified from this environment.

### `get_my_state()` changes
Full diff confirms every existing field (`user`, `game_state.*` including
`updated_at`/`max_streak`/`completed_cycles`, `wallet_balance_cents`,
`jackpot_cents`, `played_today`, `available_tiers`) is preserved exactly.
Added: a `game_time` object with all 15 requested fields, sourced
directly from `get_game_time_state_for_user()` (no duplicated
computation). Fixed the function's own independent hardcoded Madrid
literal.

### Cashout changes
Diffed against the live hardened version — every piece of the previous
three cashout-hardening passes is confirmed still present: the mandatory
3-argument signature (no defaults), idempotency key format validation,
context-mismatch and stale-context guards, the `unique_violation`
defense-in-depth handler, server-computed amount, hardcoded `EUR`
currency, and the `authenticated`-only grant with no legacy overload.
The only additions: `game_time_region_id` resolved once and recorded in
new ledger rows' `meta` for audit — explicitly **not** part of the
idempotency/replay fingerprint — and `played_today` in the response now
uses the region-aware date helper. Day 30 badge/cycle logic remains
fully independent (confirmed again by inspection — it's driven by a
separate trigger on `plays`, untouched).

### Qualification changes
Found the model precisely: points-based, aggregated weekly via
`player_game_progress` (already correctly dated once `play_daily_gate`
became region-aware) into `weekly_qualification_status`, keyed by
`(user_id, week_start_date)`. The **only** change:
`update_weekly_qualification()` now computes `week_start_date` via the
new region-aware `get_current_week_start_for_user()` instead of the
global-only (and, it turned out, still-hardcoded-Madrid)
`get_current_week_start()`. Point values and thresholds are byte-for-byte
unchanged — asserted directly in the test script, not just claimed. No
new uniqueness rule was needed: the existing `UNIQUE (user_id,
week_start_date)` constraint, combined with the Game Time System's
"region changes only take effect from a safe future boundary" rule
(previous pass), already prevents duplicate qualification from a region
reassignment.

### Saturday Showdown / Sunday Crown changes
Foundation only, as scoped: `get_saturday_sunday_status_for_user()`
combines the already-region-aware time window
(`get_game_time_state_for_region`) with the already-region-aware
qualification status — no event-instance mechanics, no leaderboard
changes, no threshold changes. Recommended MVP model documented again
(regional event instances, not a staggered global leaderboard) — not
built, since building it is real future work distinct from "make the
timing foundation region-aware."

### Reporting changes
`v_plays_by_game_date_region` — a `security_invoker` view over `plays`
joined to `game_time_regions`, exposing `game_date`, `region_key`,
`timezone`, and the existing outcome/stake/streak dimensions. Historic
rows (before this pass) show NULL region fields via the `LEFT JOIN` —
Global-mode reporting by `game_date` alone is completely unaffected. No
dashboard UI was rewritten — this is the data layer the task asked to
have ready.

### Notification consistency
Re-checked, not rebuilt: the scheduler's `playedToday` check
(`gs?.last_play_date === clock.gameDate`) already compares against
exactly what `play_daily_gate` now writes to `game_state.last_play_date`
via the same region-resolution algorithm (the scheduler's JS-side
`resolveRegionsForUsers` and the SQL side's `resolve_user_game_time_region`
implement the identical fallback logic, confirmed by re-reading both,
not assumed identical). A static check now asserts the scheduler's
executable code has no new dependency on anything added this pass — it
didn't need one. Scheduled push remains disabled by default,
re-confirmed.

### Region assignment utilities
`assign_user_game_time_region()` (write path, previous pass) was
untouched. Added its read-only companion,
`get_user_game_time_region_info(p_user_id)` — current resolved region,
whether it's explicit or the global default, and the most recent
change-log entry — for admin/test-account inspection in Supabase/Bolt.
No new UI was built for this; a documented helper RPC is enough for this
pass, per the task's own scope guidance.

### Admin UI
Small addition to the existing Regional Game Time section: a status line
noting core gameplay logic is now region-aware but not yet
database-tested, without encouraging activation — the activation button
remains conditionally hidden behind `regional_game_time_live_enabled`
exactly as the previous pass built it; nothing about that guard changed.

### Region activation readiness decision
**`regional_game_time_live_enabled` remains `false`.** Backend systems
now genuinely region-aware: `play_daily_gate`, `cashout_game` (audit),
`get_my_state`, qualification week boundaries, the Saturday/Sunday
foundation, and reporting. What remains before the readiness flag could
ever responsibly be considered: **none of this has run against a real
Postgres instance.** No migration in this pass, or any of the six prior
passes, has been applied anywhere. Required before flipping the flag:
migrations apply successfully in a test Supabase project; `npm run
build` passes; real play/cashout/qualification/notification tests pass
with real (or realistic test) users across at least two distinct
regions; and — per the task's own closing instruction — explicit human
approval. This is a decision to document, not a flag to flip.

### Migration strategy
All July 2026 migrations (cashout hardening through this pass) are
confirmed unapplied everywhere. Consolidation was considered again and,
as in the previous pass, **not performed** for the same reason: no live
database to verify a hand-merge against, and the migrations are not
contradictory — each one is either additive or a clean
`CREATE OR REPLACE` supersession, never fighting a previous one. No
existing July migration file was rewritten in place; every change in
this pass is a new, append-only file.

### Final migration order (complete, unapplied set)
1-6. Cashout hardening chain (`20260713120000` through `20260713220000`)
7-13. Reactivation System core (`20260714000000` through `20260714050000`)
14-18. Game Time System foundation (`20260715000000` through `20260715040000`)
19. Regional activation guard (`20260716000000`)
20. `20260717000000` — plays region column + conditional duplicate-play constraint
21. `20260717010000` — region-aware date/week helpers (+ `get_current_week_start()` delegation)
22. `20260717020000` — `play_daily_gate()` region-aware
23. `20260717030000` — `get_my_state()` region-aware
24. `20260717040000` — `cashout_game()` region metadata
25. `20260717050000` — qualification region-aware
26. `20260717060000` — Saturday/Sunday status helper
27. `20260717070000` — reporting view + region inspection RPC

This order preserves, in the final state: cashout RPC hardening (step 6,
untouched by later steps except step 24's additive metadata), no legacy
cashout overloads (steps 5-6), the 3-argument cashout signature (step 6,
confirmed unchanged by step 24's diff), cashout context binding (step 6,
confirmed unchanged by step 24's diff), `get_my_state()`'s `updated_at`/
`max_streak`/`completed_cycles` fields (steps 3-4, confirmed unchanged by
step 23's diff), the Web Push schema and retry system (steps 7-13,
untouched), the Game Time System schema (steps 14-18, untouched), the
Regional activation guard (step 19, untouched — re-confirmed by a static
check in this pass), scheduled push disabled (step 9/13, re-confirmed),
and Cron inactive (step 10, re-confirmed).

### Tests run
`scripts/verify-region-aware-gameplay.ts` (new) — **72/72 passed**,
genuinely executed via `npx tsx`. Notably includes real structural diffs
(not just claims) against the previous known-good `play_daily_gate`,
`get_my_state`, and `update_weekly_qualification` bodies, asserting
specific economy/hardening/threshold lines are present verbatim in the
new versions. Re-ran the complete prior suite to confirm zero
regressions: `verify-result-messages.ts` 25/25,
`verify-cashout-messages.ts` 7/7, `verify-cashout-idempotency.ts` 40/40,
`verify-notification-eligibility.ts` 57/57, `verify-game-time.ts` 61/61.
**262/262 total, all genuinely executed.**

Two real test-authoring mistakes were made and caught before finishing
this pass, worth stating plainly: an overly strict line-diff assertion
flagged a punctuation-only change (a trailing comma added because a new
field follows) as if it were a real removal, and a scheduler
"unmodified" check matched a legitimate pre-existing comment from an
earlier pass. Both were found by actually running the script and reading
the failures, not assumed away — fixed by making the assertions more
precise, not by weakening what they check.

### Build status
`npm install` — attempted; the real npm registry returns `403 Forbidden`
in this sandbox, same restriction as every prior pass, reconfirmed just
now. `npx tsc --noEmit` / `npm run build` therefore not run.

### Deno status
Unchanged from every prior pass — no Deno runtime available in this
environment. The scheduler was not modified in this pass regardless.

### Real Supabase status
**Not applied anywhere.** Every claim above about SQL behavior is based
on direct inspection of the actual migration text (including
programmatic structural diffs against known-good prior versions) plus
pure-logic test execution — never a live query, never a real transaction.

### Remaining limitations
- No migration has been applied to any Supabase environment.
- The `plays` table's live state (whether any historic duplicate
  `(user_id, game_id, play_date)` row already exists from the identified
  pre-existing race window) has not been verified — the new unique
  constraint migration handles this safely (skips with a `NOTICE` rather
  than failing) but the actual outcome needs to be checked once applied.
- Saturday Showdown / Sunday Crown region-aware **event mechanics**
  (participation records, region-scoped leaderboards) are not built —
  only the timing/status foundation.
- `regional_game_time_live_enabled` remains `false`; flipping it requires
  everything listed in "Region activation readiness decision" above,
  none of which is possible from this environment.

## Game Time System — Duplicate Play and Region Reassignment Hardening

Focused hardening pass closing three specific risks before Bolt upload
and real migration testing. No new features, no economy/RTP/probability/
wallet/cashout-value/result-message changes, Regional Game Time and
scheduled push remain disabled, Cron remains inactive.

### What was wrong with the silent duplicate-constraint skip
The previous pass's migration checked for existing duplicate
`(user_id, game_id, play_date)` rows and, if any were found, logged a
`NOTICE` and **skipped adding the unique constraint entirely** — leaving
the system with zero database-level duplicate-play protection in that
branch, with only an easy-to-miss log line marking it. That's not
acceptable for something whose entire purpose is preventing a
duplicate-play integrity bug.

### Final duplicate-play protection
Replaced the skip with a mandatory outcome:
1. **Backfill**: every existing `plays` row with `game_time_region_id
   IS NULL` is set to the current global region — safe, not a
   reinterpretation, since no other region has ever been active.
2. **Detect** duplicate `(user_id, game_id, play_date)` groups.
3. **If none found** → add the real, full
   `UNIQUE (user_id, game_id, play_date)` constraint. No partial index
   was needed — the backfill already means every row has a region, so
   the partial-vs-full distinction the task offered as an alternative
   became moot once backfilled.
4. **If duplicates ARE found** → the migration **fails outright** with a
   `RAISE EXCEPTION` naming the exact count and pointing at the new audit
   view. This blocks the migration chain rather than continuing silently
   — exactly the required outcome.

### Duplicate audit view
`v_duplicate_daily_plays` — `user_id, game_id, play_date,
duplicate_count, play_ids, created_at_min, created_at_max`, exactly the
requested shape. Granted to `service_role` only, revoked from
`PUBLIC`/`anon`/`authenticated` — not exposed to normal application
roles, since it can reveal an individual player's play pattern.

### Region reassignment effective-boundary rule
Audited the actual live code (not the previous report's description) and
confirmed a real gap: `assign_user_game_time_region()` took
`p_effective_from` as a **caller-supplied, unvalidated** parameter, and
`resolve_user_game_time_region()` never checked `effective_from` at all.
The "safe future boundary" rule was documented in a previous pass's
comments but not enforced in code. Fixed:
- `resolve_user_game_time_region()` now requires
  `effective_from <= now()` — a future-dated assignment is ignored until
  its boundary passes.
- `assign_user_game_time_region()` — **signature changed** (the old
  5-arg version, with caller-controlled `p_effective_from`, is dropped,
  matching the same "never leave an insecure overload reachable"
  principle already applied to `cashout_game`). The new signature
  computes `effective_from` itself as
  `GREATEST(old_region_next_rollover, new_region_next_rollover)` — the
  later of the player's *current* region's next rollover and the
  *target* region's next rollover — so a reassignment can never take
  effect before either region's current game date has actually ended.
  A first-ever assignment (no previous region) uses only the new
  region's rollover, since there's no old-region window to protect
  against.

### How old and new regions are considered
Both regions' `next_daily_rollover_at` are read via the existing
`get_game_time_state_for_region()` — no new time-computation logic was
introduced, the safe boundary is built entirely from the same Game Clock
already used everywhere else.

### `user_game_time_region` schema / simplification, documented
`effective_from` already existed (confirmed by inspection, not assumed —
it was added in the original Game Time System migration). It just wasn't
being checked on read or computed safely on write; both are fixed now.
One honest simplification, documented rather than silently assumed
equivalent to a full solution: `user_game_time_region` is a
single-row-per-user table, not a history table — a new assignment
overwrites the previous row immediately, so the *specific old region's
identity* is not preserved as a distinct queryable row between
reassignment and the boundary passing. `resolve_user_game_time_region()`
falls back to the **global region** during that gap instead — the same
safe-default pattern used everywhere else in the Game Time System
(unassigned/invalid → global). This is the "smallest safe equivalent"
the task explicitly permits if full history preservation is more
complexity than this pass needs; a true history table is real future
work if a product need for it ever arises.

### Test-only immediate override
`p_force_effective_immediately_for_test boolean DEFAULT false` — grants
restrict `assign_user_game_time_region()` to `service_role` only
(`REVOKE ALL ... FROM PUBLIC, anon, authenticated`), so this can never be
reached by a player or a normal admin-panel action. Every use is logged
with a `[IMMEDIATE TEST OVERRIDE]` prefix in `change_reason` — never
silently indistinguishable from a normal, safely-scheduled assignment.

### `play_daily_gate()` duplicate handling
The pre-existing application-level check (`SELECT 1 FROM plays WHERE
user_id = ... AND game_id = ... AND play_date = ...`) already had no
region filter at all, so it already correctly considered historical
null-region rows and new region-tagged rows uniformly — this requirement
was already satisfied by the previous pass, re-confirmed here rather than
assumed. New in this pass: the `plays` INSERT is wrapped in a
`unique_violation` handler, now that a real mandatory constraint exists
to potentially fire on a genuine concurrent-request race — it raises the
identical `'Already played today'` message the early check already uses,
so the caller sees one consistent error regardless of which layer caught
it. Postgres rolls back everything already done in the same function
call (wallet deduction, pool contributions, jackpot contribution)
automatically when a statement inside it fails — confirmed Postgres
transaction behavior, not something the exception handler needs to undo
manually. Diffed against the previous version to confirm no economy line
changed.

### Qualification / notification reassignment protection
No new code was needed for these — both were already correctly
protected by mechanisms from prior passes, re-verified (not re-built)
this pass: `weekly_qualification_status`'s original
`UNIQUE (user_id, week_start_date)` constraint (unchanged) already
prevents duplicate qualification records; `notification_delivery_log`'s
dedupe key already includes `region_id` (added in the Game Time System
pass). Both are now asserted directly by the new test script.

### Saturday/Sunday readiness clarification
Updated wording everywhere (this changelog, `AI_HANDOFF_NOTES.md`, and
the admin Game Time UI) to state precisely:

> Daily play, cashout audit, get_my_state, qualification week
> boundaries, notification timing, and reporting are region-aware at
> code level.
>
> Saturday Showdown and Sunday Crown have region-aware timing foundation
> only. Region-scoped event participation, leaderboards, rewards, and
> finalization still need implementation before Regional Game Time can
> go live.

### Regional activation classification
**B — Partially code-ready, but Regional activation still blocked due to
weekend-event mechanics.** Daily gameplay, cashout audit, `get_my_state`,
qualification week boundaries, notification timing, and reporting are
genuinely region-aware. Saturday Showdown and Sunday Crown are not —
only their timing/status foundation exists, not region-scoped
participation, leaderboards, rewards, or finalization. Classification A
("code-ready except real database/device testing") would overstate this;
not chosen. `regional_game_time_live_enabled` remains `false`, and the
backend guard (`apply_pending_game_time_mode()`, previous pass) still
refuses activation regardless of this pass's changes — untouched and
re-confirmed by a static test.

### Tests run
`scripts/verify-duplicate-and-region-reassignment.ts` (new) —
**38/38 passed**, genuinely executed via `npx tsx`: real execution of
the pure boundary-computation model (later-of-two-rollovers logic, the
test-override path, first-assignment edge case) and of the
region-resolution `effective_from` gating (future ignored, past applied,
exact boundary counts as effective, disabled region never resolved to,
no-assignment falls back to global); static checks confirming the audit
view's shape and restricted grants, the hard-fail behavior (no more
`NOTICE`-and-skip), the dropped legacy 5-arg assignment overload and its
`service_role`-only replacement, the `unique_violation` handling in
`play_daily_gate`, and the exact required Saturday/Sunday wording in all
three required locations. Re-ran the complete prior suite to confirm
zero regressions: `verify-result-messages.ts` 25/25,
`verify-cashout-messages.ts` 7/7, `verify-cashout-idempotency.ts` 40/40,
`verify-notification-eligibility.ts` 57/57, `verify-game-time.ts` 61/61,
`verify-region-aware-gameplay.ts` 72/72. **300/300 total, all genuinely
executed.**

One real test-authoring mistake, caught and fixed before finishing: an
overly broad regex check for "no `p_effective_from` parameter in the new
signature" accidentally matched the migration's own rollback
documentation (which legitimately mentions the old parameter name to
describe how to revert). Fixed by scoping the check to just the function
body text, not the whole file.

### Migrations added
`20260718000000_duplicate_play_hard_guard.sql`,
`20260718010000_region_reassignment_effective_boundary.sql`,
`20260718020000_play_daily_gate_unique_violation_handling.sql`.

### Migrations modified or superseded
No existing migration file was edited in place — every change in this
pass is a new, append-only file, `CREATE OR REPLACE`-ing or explicitly
dropping-and-recreating the specific functions that needed to change.
The previous pass's `20260717000000_*.sql` (which added the
now-superseded skip-with-`NOTICE` behavior) is functionally superseded
by `20260718000000_*.sql`'s hard-fail version — both remain in the
migration set (neither was rewritten), since `20260717000000_*.sql`'s
column/index additions are still needed and correct; only its final
constraint-handling step is superseded by running the later migration
after it.

### Final migration order
Unchanged prefix (steps 1-27 from the previous pass's report), plus:
28. `20260718000000` — duplicate-play hard guard (backfill, audit view, mandatory-or-fail constraint)
29. `20260718010000` — region reassignment effective-boundary enforcement
30. `20260718020000` — `play_daily_gate()` unique_violation handling

### Files added
`src/lib/regionReassignment.ts`,
`scripts/verify-duplicate-and-region-reassignment.ts`.

### Files modified
`src/pages/admin/AdminGameTimeSection.tsx` (Saturday/Sunday readiness
wording, status badge corrected to reflect classification B).

### Build status
`npm install` — attempted; the real npm registry returns `403 Forbidden`
in this sandbox, same restriction as every prior pass, reconfirmed just
now. `npx tsc --noEmit` / `npm run build` therefore not run.

### Deno status
Unchanged — no Deno runtime available in this environment. No Edge
Function was modified in this pass.

### Real Supabase status
**Not applied anywhere.** Every claim above about SQL/constraint
behavior is based on direct inspection of the actual migration text plus
pure-logic execution of the boundary-computation model — never a live
query, never a real transaction, never a real concurrent-request test.

### Remaining limitations
- Whether the `plays` table's live state actually contains any historic
  duplicate has still not been verified from this environment — the new
  migration handles either outcome safely (protects it or fails loudly
  with remediation guidance), but the real outcome is unknown until
  applied.
- The `unique_violation` handling in `play_daily_gate` has not been
  exercised against a real concurrent-request race — reviewed carefully,
  not tested live.
- `user_game_time_region`'s single-row-per-user design (not a true
  history table) is a documented simplification, not a complete
  "preserve the exact old region until the boundary" implementation —
  see "How old and new regions are considered" above.
- Saturday Showdown / Sunday Crown region-scoped event mechanics remain
  entirely unbuilt — this is the primary reason Regional Game Time
  activation readiness is classified B, not A.

## Game Time System — Assignment History and Regional Weekend Events

Resolved both remaining structural blockers before Regional Game Time
could ever be considered live-ready: the single-row assignment
simplification, and the complete absence of region-scoped weekend-event
mechanics. Regional Game Time remains disabled; `regional_game_time_live_enabled`
remains `false`; scheduled push and Cron remain untouched and inactive.

### Assignment model audit

| Area | Current behaviour (found by inspection) | Risk | Required change |
|---|---|---|---|
| `user_game_time_region` | Single-row-per-user; a new assignment overwrites the previous row via `ON CONFLICT (user_id) DO UPDATE` | High — an active assignment's identity is lost the instant a pending reassignment is created | Replace with a history table |
| `resolve_user_game_time_region()` | Checked `effective_from <= now()` (from the previous pass) but had nothing to fall back to except the global region once the old row was overwritten | High | Rewrite to select from history |
| `assign_user_game_time_region()` | Computed a safe `effective_from` boundary (previous pass) but immediately destroyed the old assignment on write | High | Preserve the old row until the boundary |
| `get_user_game_time_region_info()` | Read the single-row table directly; could not show "pending" separately from "active" | Medium (admin/test visibility gap, not a safety gap) | Read from history, report both |
| `get_game_time_state_for_user()` | Ignores individual assignment entirely in Global mode | None — already correct, unaffected by this rewrite | None |
| notification region resolution | Scheduler resolves region per candidate via the same fallback logic `resolve_user_game_time_region()` implements | None — inherits the fix automatically, no scheduler code touched | None |
| play region resolution | `play_daily_gate()` calls `resolve_user_game_time_region()` directly | None — inherits the fix automatically | None |
| qualification region resolution | `update_weekly_qualification()` calls `resolve_user_game_time_region()` via `get_current_week_start_for_user()` | None — inherits the fix automatically | None |
| admin Game Time UI | Displayed status/mode-switch guard only; no assignment history view | Low | Not built in this pass (out of scope — see Known limitations) |
| migration chain | `20260717000000` → `20260718000000` duplicate-constraint chain | Requested audit | Traced concretely; no actual conflict found (see below) |

### Final assignment model
`user_game_time_region_assignments` — the preferred model from the task,
adapted minimally: `id, user_id, region_id, effective_from,
effective_until, status (pending/active/superseded/cancelled),
assigned_by, assignment_reason, force_effective_immediately_for_test,
created_at, updated_at`. Every assignment is its own row; a reassignment
closes off the previous open-ended row (`effective_until = <new
boundary>`) instead of overwriting it. The deprecated single-row
`user_game_time_region` table is left in place, unused, not dropped —
its existing data (if any) is copied forward into the new table by a
one-time backfill `INSERT ... SELECT`.

### Resolution behaviour
`resolve_user_game_time_region()` selects the row whose effective window
actually contains "now" — `effective_from <= now()` and (`effective_until
IS NULL` or in the future) — excluding `status = 'cancelled'` and
disabled regions. By construction there is at most one such row per user
at any instant (assignment always closes the previous open row exactly
at the new one's start), so no ordering ambiguity exists; `ORDER BY
effective_from DESC LIMIT 1` is kept as a defensive backstop, not a
correctness requirement. Falls back to the global region only when no
row matches — the same "no valid assignment → global" pattern used
everywhere in the Game Time System. **No background job is required** —
resolution is fully dynamic, exactly as requirement #5 prefers; nothing
was activated to support it.

### Effective boundary behaviour
Unchanged formula from the previous pass — `GREATEST(old_region_next_
rollover, new_region_next_rollover)`, or `now()` under the
`service_role`-only, always-logged test override — but now the OLD
region's row is preserved (closed off, not deleted or overwritten) so it
remains genuinely resolvable right up until that exact instant.

### Duplicate-play reassignment safety
Re-verified, not re-built: `plays_user_game_date_unique` has no
`region_id` in its key, so a mid-transition player (still resolving to
their old region, or freshly moved to the new one) can never get a
second play for the same authoritative `game_date` regardless of which
row `resolve_user_game_time_region()` currently returns. Confirmed by a
static check that this constraint was untouched by the assignment-history
rewrite.

### Qualification / notification reassignment safety
Same conclusion — `weekly_qualification_status`'s `UNIQUE (user_id,
week_start_date)` and `notification_delivery_log`'s region-inclusive
dedupe key are both unaffected by how the active region is resolved
internally; both were re-confirmed present and untouched, not silently
assumed.

### Saturday/Sunday audit

| Event area | Current implementation (found by inspection, not assumed) | Region-aware now? | Required change |
|---|---|---|---|
| Saturday/Sunday qualification | `weekly_qualification_status.saturday_qualified`/`sunday_qualified` — points/games-played threshold | Yes (week boundary, previous pass) | None further |
| **Event participation** | **A complete, working system already existed**: `weekend_event_entries` table, `enter_weekend_event()` RPC — found by reading the actual schema, not assumed absent | No | Region-scope it |
| **Finalization/rewards** | **`admin_finalize_event()` already exists and pays a real wallet reward** (`wallet_ledger` type `JACKPOT_WIN`), creates winner announcements | No | Add optional region scoping |
| Leaderboards | None existed | No | Add region-scoped views |
| "Showdown"/"Crown" naming | `event_game_id = 'saturday_main_event'` is literally named `'Saturday Showdown'` in the `games` table; `'sunday_winners_event'` is the Sunday counterpart | N/A | Reuse directly, no new naming invented |

**Two real, pre-existing bugs found while auditing this** (not
region-awareness issues — genuine bugs, found only because this pass
required reading `enter_weekend_event()` end to end):
1. **Two coexisting overloads.** `enter_weekend_event(text, uuid)`
   (April 8) and `enter_weekend_event(text)` (April 23) are different
   Postgres signatures, both callable. Checked
   `src/hooks/useWeekendEvents.ts` directly: the frontend calls the
   1-arg version only. The 2-arg version was dead code — dropped.
2. **Response-shape mismatch.** The live 1-arg version returned `{ ok,
   event_game_id }`; the frontend hook expects `{ entry_id, status }`
   (`data as { entry_id: string; status: string }`). A genuine
   pre-existing contract bug, fixed as part of this same refactor.

### Event instance model
`event_instances` — `id, event_type, game_time_region_id, event_date,
starts_at, ends_at, status (scheduled/open/closed/finalized/cancelled),
rules_version, created_at, updated_at`, `UNIQUE (event_type,
game_time_region_id, event_date)`, `CHECK (ends_at > starts_at)`.
`event_type` reuses the existing `event_game_id` values directly — no
translation layer. **No separate `event_participations` table** —
`weekend_event_entries` (the real, existing participation table) is
extended with `event_instance_id`/`game_time_region_id` instead, per
"adapt to existing project conventions" rather than building a parallel,
overlapping mechanism. `get_or_create_event_instance(event_type,
region_id, event_date)` is idempotent (`ON CONFLICT ... DO NOTHING` then
`SELECT`), rejects disabled regions, rejects a missing or inverted
window, never finalizes or rewards anything.

### Saturday participation changes
`enter_weekend_event()` (consolidated to the single live signature):
resolves the player's region and region-aware week, computes the
event_date as that week's Saturday, and — **only if the region has a
configured Saturday window** — requires the window to be currently
`'active'` and links the entry to a real `event_instances` row. **If no
window is configured** (the seeded default global region, today's only
active state), the window-active check is skipped entirely and no
instance is created — preserving exact existing Global-mode behavior,
confirmed deliberately rather than assumed safe. A pre-insert existence
check now returns a clean `already_entered` status instead of letting a
genuine double-entry race hit the table's unique constraint unhandled.

### Sunday participation changes
Identical treatment, mirrored for `'sunday_winners_event'`.

### Leaderboard/reporting foundation
Four new read-only views, `security_invoker = true` throughout (RLS
respected, not bypassed): `v_event_instances_by_region` (with a live
participant count), `v_event_participants_by_instance`,
`v_saturday_leaderboard_by_region`, `v_sunday_leaderboard_by_region`
(both scoped so no region's entries are ever mixed with another's,
ordered by region first). No dashboard UI was built or redesigned —
data layer only, per requirement #13's explicit scope.

### Reward/finalization safety decision
`admin_finalize_event()` already existed and already pays real wallet
rewards — confirmed, not assumed. Extended, not rewritten: a new
`p_event_instance_id uuid DEFAULT NULL` parameter, defaulting to
preserve byte-for-byte identical behavior for every existing caller.
When provided, both `UPDATE weekend_event_entries` statements are scoped
to that instance in addition to the existing filters, and the
`JACKPOT_WIN` ledger meta records `event_instance_id`/
`game_time_region_id`. **Deliberately not fixed in this pass, and stated
plainly rather than hidden**: this function has never had built-in
idempotency — calling it twice for the same winner would insert two
reward ledger rows. This predates this pass and is not a
region-awareness gap; fixing it would mean touching the core
finalization/payout mechanism further without any live-database testing
capability, which is a real risk this pass chooses not to take. This is
the specific, named reason Regional activation is not classified fully
code-ready.

### Regional activation classification
**B — still partially code-ready.** Every item on classification A's
checklist is now genuinely true **except one**: "no automatic rewards/
finalization gap can cause inconsistency" is not satisfied —
`admin_finalize_event()`'s lack of idempotency is exactly such a gap,
narrow and admin-invoked-only, but real and undocumented-no-longer.
Everything else — region assignment history, daily play, `get_my_state`,
cashout audit, qualification, notifications, Saturday/Sunday event
participation, event-instance uniqueness — is genuinely region-aware at
code level. This is real, substantial progress from the previous pass's
classification (which cited entire missing mechanics, not one specific
documented gap) — stated accurately as such, not overstated to A.
`regional_game_time_live_enabled` remains `false`; the backend guard
(`apply_pending_game_time_mode()`) still refuses activation regardless.

### Migration strategy
Audited the `20260717000000` → `20260718000000` duplicate-constraint
chain concretely, as requested: both target the identical constraint
name (`plays_user_game_date_unique`) with an idempotent `IF NOT EXISTS`
guard, so re-running the later migration after the earlier one already
succeeded is already a safe no-op — traced through both possible
outcomes explicitly. **No actual conflicting or confusing duplicate
index/constraint was found.** The requested corrective migration
(`20260719070000_*.sql`) documents this finding directly rather than
fabricating an unnecessary fix, and adds a defensive final-state
assertion so this property can never silently regress. No existing
migration file was edited in place.

### Final migration order
Unchanged prefix (steps 1-30 from the previous pass), plus:
31. `20260719000000` — region assignment history table
32. `20260719010000` — history-aware resolution + assignment (+ data migration from the deprecated single-row table)
33. `20260719020000` — admin inspection: current + pending visibility
34. `20260719030000` — `event_instances` schema + `get_or_create_event_instance()`
35. `20260719040000` — `enter_weekend_event()` consolidated and region-aware
36. `20260719050000` — `admin_finalize_event()` optional region/instance scoping
37. `20260719060000` — event reporting/leaderboard views
38. `20260719070000` — duplicate-play constraint chain audit (documentation + defensive assertion)

### Tests run
`scripts/verify-assignment-history-and-events.ts` (new) —
**59/59 passed**, genuinely executed via `npx tsx`: real execution of the
pure history-resolution model (active/pending coexistence, boundary
transition continuity — resolves to the old region one second before the
boundary and the new region one second after, cancelled/disabled-region
exclusion, no-assignment fallback), plus static structural checks for
event-instance uniqueness/idempotency/window validation, the two
`enter_weekend_event` bug fixes, `admin_finalize_event`'s
backward-compatible extension, region-scoped reporting, the migration-
chain audit finding, and the admin UI's five-dimension readiness wording.
`scripts/verify-duplicate-and-region-reassignment.ts` was updated (not
weakened) — one wording check that tested now-superseded admin-UI text
was replaced with an explanatory note; the underlying protections it
also checks (activation guard, Cron, scheduled push, legacy overloads)
were re-verified unchanged, still passing. Re-ran the complete prior
suite: `verify-result-messages.ts` 25/25, `verify-cashout-messages.ts`
7/7, `verify-cashout-idempotency.ts` 40/40,
`verify-notification-eligibility.ts` 57/57, `verify-game-time.ts` 61/61,
`verify-region-aware-gameplay.ts` 72/72,
`verify-duplicate-and-region-reassignment.ts` 37/37. **358/358 total,
all genuinely executed.**

Two real test-authoring mistakes were made and caught before finishing
this pass, same honesty standard as every prior pass: an exact-count
assertion (`=== 4`) was too strict against a 5th legitimate mention of
`security_invoker` in a migration's own documentation comment; and a
regex checking "no editable toggle for the readiness flag" was run
against the whole file collapsed to one line, letting `.*` span
completely unrelated parts of the component and produce a false match.
Both fixed by making the checks more precise (an inequality instead of
exact equality; a line-scoped check instead of a whole-file one) rather
than by loosening what they verify.

### Build status
`npm install` — attempted; the real npm registry returns `403 Forbidden`
in this sandbox, same restriction as every prior pass, reconfirmed just
now. `npx tsc --noEmit` / `npm run build` therefore not run.

### Deno status
Unchanged — no Deno runtime available in this environment. No Edge
Function was modified in this pass.

### Real Supabase status
**Not applied anywhere.** Every claim above about SQL/constraint
behavior is based on direct inspection of the actual migration text plus
pure-logic execution of the resolution/transition model — never a live
query, never a real transaction, never a real concurrent reassignment
tested against an actual database.

### Remaining limitations
- `admin_finalize_event()` has no built-in idempotency — the specific,
  named reason Regional activation remains classified B, not A. Real
  future work before Regional mode can be considered fully code-ready.
- No admin UI was built for browsing a player's assignment history
  (active + pending + past) — `get_user_game_time_region_info()` exposes
  it via RPC, but no screen displays it; out of scope for this pass.
- Event-instance `status` lifecycle (`scheduled → open → closed →
  finalized`) is not automatically advanced by anything — it starts at
  `'scheduled'` and is only ever moved to `'finalized'` by
  `admin_finalize_event()` when instance-scoped; no code transitions it
  through `'open'`/`'closed'` yet. Documented as a placeholder lifecycle,
  not a bug — Cron/background automation remains explicitly inactive.
- The `weekend_event_entries` table's existing RLS still allows a direct
  client `INSERT` (`WITH CHECK (auth.uid() = user_id)`) alongside the
  RPC path — a pre-existing property, not introduced or fixed by this
  pass; noted during the audit but out of scope to change here.
- No migration has been applied to any Supabase environment.

## Weekend Event Finalization and Entry Hardening

Final focused hardening pass before Bolt/Supabase migration testing.
Closes the three specific, named gaps from the previous pass's
classification. Regional Game Time remains disabled;
`regional_game_time_live_enabled` remains `false`; scheduled push and
Cron remain untouched and inactive.

### Finalization audit

| Area | Current behaviour (found by direct inspection) | Risk | Required change |
|---|---|---|---|
| `admin_finalize_event()` | No frontend/admin caller exists anywhere (confirmed by search) — a manually-invoked RPC. Pays a real `JACKPOT_WIN` wallet reward with no protection against being called twice | High | Real idempotency gate |
| `weekend_event_entries` RLS | `"Users can insert own event entries"` (`WITH CHECK (auth.uid() = user_id)`) allows direct client INSERT, bypassing every check in `enter_weekend_event()` | High | Drop the policy by exact name |
| `wallet_ledger` | No idempotency key of its own for `JACKPOT_WIN` rows | Medium | Gate via a dedicated finalization table, not a broad new index on `wallet_ledger` |
| `winner_announcements` | No link to a finalization — a duplicate finalize call would duplicate the announcement too | Medium | Only ever inserted inside the same idempotency-gated path |
| `event_instances.status` | Only set at creation/finalization; never transitions through open/closed since Cron is inactive | Low — `enter_weekend_event()` already computes fresh window status via `get_game_time_state_for_region()`, confirmed by re-reading it, not assumed | Add a reusable derived-status function for anywhere a real-time decision is needed |
| leaderboard views | Already region-scoped (previous pass) | None | Unaffected by this pass, re-confirmed |
| `enter_weekend_event()` | Pre-insert existence check present; INSERT itself had no `unique_violation` backstop | Low (narrow race) | Same defense-in-depth pattern already used in `play_daily_gate`/`cashout_game` |
| admin authentication pattern | Separate `admin_sessions` mechanism, not player JWTs (confirmed in an earlier pass) | N/A | `admin_finalize_event()` stays `service_role`-only, consistent with every other admin financial RPC |

### Idempotency design
`event_finalizations` — one row per successful finalization, ever. Two
partial unique indexes (not one combined constraint, since NULL is never
equal to NULL in a unique index — multiple `event_instance_id IS NULL`
rows would otherwise all coexist): `idx_event_finalizations_instance`
(`UNIQUE (event_instance_id) WHERE event_instance_id IS NOT NULL`) for
region-scoped calls, `idx_event_finalizations_legacy` (`UNIQUE
(event_game_id, event_date) WHERE event_instance_id IS NULL`) for
legacy/global calls. `admin_finalize_event()` attempts this INSERT
**first** — success means it legitimately won the right to finalize;
every subsequent step (wallet credit, entry updates, instance status
update, announcement) happens only in that same winning path, inside the
same function call, which is already one Postgres transaction. A
`unique_violation` means already finalized — the existing row is looked
up and returned, nothing else is touched.

### Wallet ledger protection
No broad new unique index was added to `wallet_ledger` itself (the task
explicitly warned against this, and it would have risked unrelated
entries) — `event_finalizations`'s unique indexes are the real
idempotency mechanism; the ledger insert is simply unreachable a second
time because it lives inside the code path gated by them. `JACKPOT_WIN`
meta now records `event_instance_id`, `game_time_region_id`, and
`finalization_id` for audit. Cashout ledger logic (`cashout_game`) and
deposit/other wallet accounting are completely untouched by this pass —
confirmed by a static check, not just asserted.

### Finalization locking
For instance-scoped calls, `event_instances` is locked (`SELECT ... FOR
UPDATE`) before deriving its status — this provides a *consistent* read
within the transaction, not the double-payout guarantee itself (the
unique index on `event_finalizations` provides that unconditionally,
even without the row lock). Verified with a real concurrent-call model
in the test script: two "simultaneous" calls against the same
finalization-row set resolve to exactly one `finalized` and one
`already_finalized`, never two `finalized`.

### Finalization eligibility
Derived status gates instance-scoped calls: `cancelled` refuses
outright; `scheduled`/`open` refuse unless `p_force = true` (an explicit
admin override, recorded in `admin_audit_log`); `closed` proceeds.
**New in this pass**: a `no_entries` safety check applies to *both* the
instance-scoped and legacy paths — if no `weekend_event_entries` row
exists for the event/date, finalization returns `'no_entries'` without
consuming the idempotency slot, so it remains retryable. This is a
genuine behavior change from the original version (which had no such
check), applied safely because the function has never had a live caller
(confirmed by search) — no compatibility risk.

### Derived event status without Cron
`get_event_instance_derived_status(p_instance_id)` implements the exact
priority order requested — cancelled → finalized → scheduled → open →
closed — reading `starts_at`/`ends_at` directly rather than trusting the
stored `status` column for anything time-based. `enter_weekend_event()`
was already using fresh, real-time window status via
`get_game_time_state_for_region()` (confirmed, not newly built);
`admin_finalize_event()` now uses the same principle via this shared
function. The stored `status` column remains meaningful for its two real
admin-action states (`cancelled`, `finalized`); reporting exposes both
`stored_status` and `derived_status` side by side, per requirement #6.

### RLS / direct-insert hardening
`DROP POLICY IF EXISTS "Users can insert own event entries" ON
weekend_event_entries` — the exact policy name, verified against the
migration that actually created it (not assumed). The player SELECT-own
policy is untouched. `enter_weekend_event()` (`SECURITY DEFINER`)
continues to insert successfully regardless, since it runs with the
function owner's privileges, not the calling role's — dropping the
policy only closes the direct-client bypass, confirmed by the same
pattern already relied on throughout this project (e.g.
`play_daily_gate` writing to RLS-protected `plays`).

### `enter_weekend_event()` final state
Single live signature (the dead 2-arg overload was dropped in the
previous pass). This pass adds the `unique_violation` backstop on the
INSERT itself — now the sole write path (RLS bypass closed), worth
defending precisely for that reason. Diffed against the immediately
prior version to confirm only that one change was made. Response shape
(`{ entry_id, status }`) unchanged, still matching what the frontend
hook expects.

### Region-scoped finalization behaviour
Unchanged from the previous pass, re-verified: winner/entries updates
are always filtered to `event_instance_id = p_event_instance_id` when
one is provided — a region's finalization can never touch another
region's entries, and leaderboard views remain region-scoped
(unaffected by this pass).

### Announcement dedupe
`winner_announcements` is only ever inserted inside the idempotency-
gated winning path — after the `event_finalizations` unique-constraint
check has already succeeded — so a duplicate `admin_finalize_event()`
call can never create a duplicate announcement; it returns
`already_finalized` before reaching that insert at all. Verified by a
static check confirming the announcement insert's position in the
function body relative to the idempotency gate.

### Regional activation classification
**A — structurally code-ready but not deployment-tested.** Every item on
classification A's checklist is now genuinely true: assignment history,
daily play, `get_my_state`, cashout audit, qualification, and
notification timing were already region-aware (prior passes); weekend
entry was already region-scoped (previous pass); and this pass closes
the three specific, named remaining gaps — finalization is now genuinely
idempotent and region-scoped, the direct-INSERT bypass is closed, and
`event_instances` status is safe without Cron. **This does not mean
Regional Game Time is ready to activate.** Per the task's explicit
instruction, even having reached classification A:
`regional_game_time_live_enabled` remains `false`, Regional mode is not
enabled, Cron is not activated, scheduled push is not enabled, and real
Supabase migration application plus real device/browser testing remain
required before any activation decision — none of which is possible
from this environment.

### Migration strategy
No existing migration file was edited in place. Four new, append-only
migrations, each `CREATE OR REPLACE`-ing or explicitly extending the
specific object that needed to change; the direct-INSERT policy is
dropped by its exact, verified name rather than guessed at.

### Final migration order
Unchanged prefix (steps 1-38 from the previous pass), plus:
39. `20260720000000` — `event_finalizations` schema, derived-status function, RLS policy drop
40. `20260720010000` — `admin_finalize_event()` idempotent, derived-status-gated, region-scoped
41. `20260720020000` — `enter_weekend_event()` unique_violation backstop
42. `20260720030000` — reporting: expose derived status alongside stored status

### Tests run
`scripts/verify-weekend-finalization-hardening.ts` (new) —
**54/54 passed**, genuinely executed via `npx tsx`: real execution of the
pure finalization-idempotency model (first call pays, second returns
already_finalized with zero new rows, a genuine concurrent-call model
resolving to exactly one winner, cancelled/open-without-force refused,
open-with-force allowed, no-entries safe no-op, legacy and
instance-scoped paths never colliding) and the pure derived-status
formula (including exact-boundary instants); static structural checks
confirming the idempotency-gate ordering inside the real migration text,
the RLS policy drop against the actual originally-created policy name,
the `unique_violation` diff against the immediately prior
`enter_weekend_event` version, and that cashout/deposit logic remains
untouched. Re-ran the complete prior suite: `verify-result-messages.ts`
25/25, `verify-cashout-messages.ts` 7/7, `verify-cashout-idempotency.ts`
40/40, `verify-notification-eligibility.ts` 57/57, `verify-game-time.ts`
61/61, `verify-region-aware-gameplay.ts` 72/72,
`verify-duplicate-and-region-reassignment.ts` 37/37,
`verify-assignment-history-and-events.ts` 59/59. **412/412 total, all
genuinely executed.**

One real test-authoring mistake, same honesty standard as every prior
pass: a check meant to confirm cashout logic was untouched searched for
the literal string `cashout_game` anywhere in the migration file,
matching this migration's own documentation comment (which references
`cashout_game`'s replay handling as a design precedent). Fixed by
checking specifically for a `cashout_game` function redefinition instead
of any mention of the name.

### Build status
`npm install` — attempted; the real npm registry returns `403 Forbidden`
in this sandbox, same restriction as every prior pass, reconfirmed just
now. `npx tsc --noEmit` / `npm run build` therefore not run.

### Deno status
Unchanged — no Deno runtime available in this environment. No Edge
Function was modified in this pass.

### Real Supabase status
**Not applied anywhere.** Every claim above about SQL/constraint
behavior is based on direct inspection of the actual migration text plus
pure-logic execution of the idempotency/derived-status models — never a
live query, never a real transaction, never a real concurrent
finalization tested against an actual database.

### Known limitations
- No migration has been applied to any Supabase environment — classification
  A means "structurally code-ready," explicitly not "deployment-tested,"
  and the task's own final safeguard applies regardless: real migration
  application, real build verification, real device/browser testing, and
  explicit approval are all still required before any activation
  decision.
- The concurrent-finalization guarantee rests on Postgres's real unique-
  index enforcement, which is a well-established mechanism reviewed
  carefully here, but has not been exercised against a live database
  with genuinely concurrent connections in this environment.
- `event_instances.status` is still never automatically advanced through
  `'open'`/`'closed'` by anything (by design — Cron stays inactive); the
  derived-status function is the answer to that, not a background job,
  and every consumer that needs a real-time answer now uses it.
- No admin UI displays `event_finalizations` history or lets an admin
  trigger `admin_finalize_event()` through a screen — it remains a
  manually-invoked RPC, exactly as before this pass; building that UI is
  out of scope here.
