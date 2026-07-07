# AI Handoff Notes

## Source of truth
As of 2026-07-07 (final domain architecture), this file supersedes all
earlier versions. See `PROJECT_CHANGELOG.md` → "2026-07-07 — Final Domain
Architecture and Bundle Separation" for the full change list, and
`DEPLOYMENT.md` for exact hosting/DNS/env-var steps.

## Permanent domain rules

1. **`survivethestreak.com` is the main player brand, marketing site, and
   game domain.** Routes: `/` (player landing), `/about`, `/play` (the
   game), all existing game/account/wallet/event/settings/leaderboard
   routes, and `/sys/admin`.
2. **`surviveday30.com` and `survive30days.com` (+ `www` variants)
   permanently redirect to `survivethestreak.com`**, preserving path and
   query string. Handled in `middleware.ts`. No content is ever served
   directly on these domains.
3. **`partners.survivethestreak.com` is the private, gated operator/partner
   website.** Routes: `/` (gate, or redirect to `/overview` once a session
   exists), `/overview`, `/contact`, `/deck`.
4. **The product is never renamed.** The brand is "Survive the Streak." "Can
   you survive 30 days?" is marketing copy / a game objective, not a domain
   name or product rename.

## Bundle separation — this is the load-bearing rule

The player, operator-gate, and protected-operator experiences are **three
separate Vite entry points**, each with its own HTML file and its own React
root, not one app hiding parts of itself with state:

| Entry | HTML | Script | React root |
|---|---|---|---|
| Player | `index.html` | `src/main-player.tsx` | `src/PlayerApp.tsx` |
| Operator gate | `operator-gate.html` | `src/main-operator-gate.tsx` | `src/OperatorAccessApp.tsx` |
| Protected operator | `operator.html` | `src/main-operator.tsx` | `src/OperatorApp.tsx` |

**Hard rules, do not violate:**
- `src/PlayerApp.tsx` must never import anything from `src/OperatorApp.tsx`,
  `src/OperatorAccessApp.tsx`, `src/pages/operator/*`,
  `src/components/operator/*`, `src/content/operatorLandingContent.ts`, or
  `src/content/operatorAccessContent.ts`.
- `src/OperatorAccessApp.tsx` (the gate) must never import
  `src/OperatorApp.tsx`, `src/pages/operator/OperatorOverviewPage.tsx`, or
  `src/content/operatorLandingContent.ts` — the gate bundle must contain
  zero operator proposition copy.
- `src/OperatorApp.tsx` (protected) intentionally contains **no gate UI at
  all** — there is no access-code form anywhere in that bundle. It cannot
  "fall back to the gate" because the gate isn't in it; instead it does a
  hard `window.location.href = '/'` navigation, which forces the browser to
  re-request the page from the server so `middleware.ts` can decide again.
- Which HTML/JS a visitor receives is decided by `middleware.ts`
  (server-side), never by client-side React state. Do not reintroduce a
  `getSiteMode()`-style client branch that imports both apps into one
  bundle — that was the previous (now removed) architecture and it does not
  satisfy "the player browser must not download the operator bundle."
- Before adding any new shared component, check whether it will be used by
  both the player and operator entries. Shared **structural/style**
  components (e.g. `LandingShell`, `CTASection`, `FeatureCards`) are fine.
  Shared **copy** must never cross the boundary — copy lives only in the
  four `src/content/*.ts` files, each imported by exactly one bundle.

## Content architecture — do not mix these

- `src/content/playerLandingContent.ts` — player landing page (`/`), imported only by `src/PlayerApp.tsx`'s tree.
- `src/content/aboutPageContent.ts` — `/about`, same tree.
- `src/content/operatorLandingContent.ts` — protected operator site, imported only by `src/OperatorApp.tsx`'s tree.
- `src/content/operatorAccessContent.ts` — the gate screen only, imported only by `src/OperatorAccessApp.tsx`.

## Player vs. operator messaging

**Players should see:** a daily survival challenge, one challenge per day, a
streak to protect, a 30-day objective, different game trials, weekend
events, sharing progress with friends, mobile-first gameplay.

**Players must never see:** retention, reactivation, engagement metrics,
DAU strategy, behavioral psychology, loss-aversion language, operator
language, white-label language, integration language, monetization
strategy, RTP, probability systems, house margin, wallet ledger
architecture, payment processing, KYC, gambling/betting/casino positioning.

**Operators may see:** retention/reactivation, daily return loops, repeat
engagement, session frequency, streak mechanics, social sharing, campaign
use cases, white-label possibilities, CRM/loyalty integrations, standalone
campaign formats, operator-branded formats, pilot/integration options — but
never internal economy figures, RTP, margin targets, probability details,
fraud systems, or confidential backend architecture.

## Operator access protection

- Real protection is server-side and pre-render: `middleware.ts` verifies
  the session cookie and decides, for every request to
  `partners.survivethestreak.com`, whether to rewrite to
  `operator-gate.html` or `operator.html` — an unauthenticated request
  literally never receives the protected bundle's JavaScript.
- `api/operator-access.ts` verifies the code against `OPERATOR_ACCESS_CODE`
  and sets an HttpOnly, Secure, SameSite=Lax, HMAC-signed session cookie
  (`server/operatorAuth.ts`).
- `api/operator-session.ts` is how the client asks "is my session still
  valid?" (defense-in-depth for sessions that expire mid-visit) — the
  HttpOnly cookie itself is never read by client JS.
- `api/operator-logout.ts` backs "Lock access".
- Rate limiting in `server/operatorAuth.ts` is a **best-effort, per-instance,
  in-memory limiter** — stated explicitly as MVP protection, not a
  distributed rate limiter. Upgrade to a real store (e.g. Upstash Redis) if
  stronger protection is needed later.
- `OPERATOR_ACCESS_CODE` / `OPERATOR_SESSION_SECRET` are never in frontend
  source, never `VITE_`-prefixed, and the endpoints fail closed if unset.

## Operator contact form

`api/operator-contact.ts` requires a valid operator session and forwards to
`OPERATOR_CONTACT_WEBHOOK_URL` if set; otherwise it tells the user the form
isn't connected yet rather than faking success. No new database table.

## Bolt development vs. production routing — do not confuse these

- **Bolt development / local dev uses path-based preview routing**:
  `/partner-preview` (gate), `/partner-preview/overview`,
  `/partner-preview/contact`, `/partner-preview/deck`. This exists only
  because the current Bolt environment has no custom domains attached and
  cannot run hostname-based Vercel Edge Middleware.
- **Production uses hostname-based routing**: `partners.survivethestreak.com`
  serves the gate or protected app directly at `/`, `/overview`,
  `/contact`, `/deck` — no `/partner-preview` prefix, ever.
- **`/partner-preview` must never become a public production route.** It is
  explicitly blocked on `survivethestreak.com` in both `middleware.ts` and
  `PlayerApp.tsx`'s client-side blocked-path list. If you ever see
  `/partner-preview` mentioned in navigation, a sitemap, or canonical
  metadata outside of `DEPLOYMENT.md`'s dev section, that's a bug — fix it.
- **The three-bundle separation still applies in preview.** Bolt preview
  routing is implemented as a dev-only Vite plugin
  (`vite-plugins/partnerPreview.ts`) that rewrites which **existing**
  HTML/JS bundle is served for a given path — it does not, and must not,
  merge the player, gate, and protected-operator bundles back into one
  React root. If you're tempted to "just import OperatorApp into PlayerApp
  behind a flag for easier preview," don't — that reintroduces exactly the
  single-app architecture this project moved away from.
- **A preview-only gate is not production security**, even though the Bolt
  preview gate genuinely runs server-side (in the Vite dev server, not
  client React state). It uses a separate cookie name
  (`ss_operator_preview`), a separate/ephemeral signing secret, and a
  separate access code (`PARTNER_PREVIEW_CODE`) — never the real
  `OPERATOR_ACCESS_CODE`. Do not let this be the last word on protection;
  the production checklist in `DEPLOYMENT.md` is what matters for the real
  site.
- All operator-site internal links, redirects, and the `OperatorApp`
  router's `basename` go through `getPartnerBasePath()`
  (`src/lib/partnerBasePath.ts`) — never hardcode `/partner-preview` or a
  bare path directly in a component.

## Always-preserved

`/play` remains the game entry. `/sys/admin` remains the admin route.
Existing game, wallet, Supabase, authentication, and backend logic must
remain unchanged — only marketing/landing/operator surface area should be
touched by future "landing page" or "domain" tasks.
