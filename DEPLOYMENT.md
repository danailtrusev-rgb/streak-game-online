# Deployment Guide

Two clearly separate contexts:

1. **Current Bolt development/preview** — runs on a `.bolt.host` (or
   similar) domain, no custom domains attached yet, no Vercel Edge
   Middleware execution. Uses **path-based** preview routing.
2. **Final production** — `survivethestreak.com` /
   `partners.survivethestreak.com` / redirect domains, all on one Vercel
   project. Uses **hostname-based** routing via `middleware.ts`.

Path-based preview routing is a development convenience only. It is not,
and must never become, the production routing mechanism.

---

## 1. Current Bolt development testing

### Player preview
Open the Bolt preview URL directly:
- `/` — player landing page
- `/about` — player About page
- `/play` — the game
- All other existing player routes work unchanged

### Partner preview
Open `<your-bolt-preview-url>/partner-preview`:
- `/partner-preview` — the access gate (same `OperatorAccessGate` component
  used in production, same UI)
- After entering a valid **preview** code → `/partner-preview/overview`
- `/partner-preview/contact` — contact form (submissions report "not
  connected" in preview, matching production's unconfigured-webhook
  behavior — nothing is silently discarded as a fake success)
- `/partner-preview/deck` — protected placeholder

A small **"Preview Environment"** badge is shown on the gate and the
protected nav in this mode so nobody mistakes it for the real site.

### How this works
`vite-plugins/partnerPreview.ts` is a dev-only Vite plugin
(`configureServer` / `configurePreviewServer`) that:
- Rewrites requests under `/partner-preview*` to serve `operator-gate.html`
  or `operator.html` depending on a **preview session cookie**
  (`ss_operator_preview` — a different cookie name than production's
  `ss_operator`, so the two can never be confused).
- Implements `/api/operator-access`, `/api/operator-session`,
  `/api/operator-logout`, `/api/operator-contact` **in Node**, at the same
  paths the production Vercel Functions use — so `OperatorAccessGate`,
  `useOperatorSession`, and `OperatorContactForm` need zero preview-specific
  code; they call the same relative `/api/...` URLs everywhere.

This plugin only ever runs inside `vite dev` / `vite preview`. It has no
presence in — and cannot affect — the actual static production deployment,
which doesn't run a Vite dev server at all.

### This is genuinely server-side, but still not production security
The session check runs on the Node dev-server process, not in client React
state, so `/partner-preview/overview` really is blocked without a valid
cookie — closer to production than a pure client-side gate. That said, it
is explicitly **not equivalent** to production protection:
- The signing secret is a random value generated once per dev-server
  process start (not `OPERATOR_SESSION_SECRET`) — restarting the dev server
  invalidates all preview sessions.
- The cookie omits `Secure` (Bolt/local dev may be plain HTTP internally).
- Rate limiting is the same best-effort in-memory limiter as production,
  which is itself only MVP-level.
- Anyone with access to the Bolt project/dev server has effectively full
  access regardless of the code.

### Required development variables
| Variable | Required | Notes |
|---|---|---|
| `PARTNER_PREVIEW_CODE` | For preview access | The **preview-only** code. Never the real `OPERATOR_ACCESS_CODE`. Deliberately **not** `VITE_`-prefixed — Vite treats `VITE_*` variables as potentially client-exposed, and an access code should never carry that risk even if nothing currently reads it client-side. Read only server-side (`process.env.PARTNER_PREVIEW_CODE` inside `vite-plugins/partnerPreview.ts`). |
| `VITE_ENABLE_PARTNER_PREVIEW` | Optional | Set to `true` to force preview-base-path behavior on a hostname the auto-detector doesn't recognize (see below). Not needed on `localhost` or a `*.bolt.host` / `*.webcontainer-api.io` / `*.stackblitz.io` domain — those are auto-detected. |

If `PARTNER_PREVIEW_CODE` isn't set, `/api/operator-access` in preview
fails closed (`500 not_configured`) rather than accepting anything.

### Base-path handling
`src/lib/partnerBasePath.ts` → `getPartnerBasePath()` returns
`/partner-preview` on a detected dev/Bolt hostname (or when
`VITE_ENABLE_PARTNER_PREVIEW=true`), and `''` otherwise. It's used for:
- `OperatorApp`'s `<BrowserRouter basename={...}>`
- `OperatorAccessApp`'s post-access hard redirect
- `RequireOperatorSession`'s hard redirect on session loss / Lock Access

No component hardcodes `/partner-preview` or a bare production path
directly — they all go through this helper.

### Testing all three bundles in Bolt
- `npm run dev`, then visit `/`, `/partner-preview`, and (after entering the
  preview code) `/partner-preview/overview` — three different bundles are
  served for these, confirmed by the fact that the gate contains no
  proposition copy in its source and the player app contains neither.
- To inspect the built output directly: `npm run build` produces
  `dist/index.html`, `dist/operator-gate.html`, `dist/operator.html` as
  independent files with independent script tags.

---

## 2. Final production domain setup

### Domain map
| Domain | Role |
|---|---|
| `survivethestreak.com` (+`www`) | Player brand, marketing, and game |
| `partners.survivethestreak.com` | Private, gated operator/partner site |
| `surviveday30.com` (+`www`) | Redirect only → `survivethestreak.com` |
| `survive30days.com` (+`www`) | Redirect only → `survivethestreak.com` |

### Build
- **Build command:** `npm run build` (`vite build`)
- **Output directory:** `dist`
- Produces three HTML entries (`index.html`, `operator-gate.html`,
  `operator.html`) — see `vite.config.ts` → `build.rollupOptions.input`.

### Attach domains (Vercel → Settings → Domains)
Add all four domains (`survivethestreak.com`, `www.survivethestreak.com`,
`partners.survivethestreak.com`, `surviveday30.com` + `www`,
`survive30days.com` + `www`) to the same project. `middleware.ts` decides
what each hostname receives.

### DNS
Use the exact records Vercel's dashboard shows when you add each domain
(apex domains typically get an `A` record, `www`/subdomains typically get a
`CNAME` to `cname.vercel-dns.com` — these can change, don't hardcode).

### Environment variables (server-only, never `VITE_`-prefixed for the real ones)
| Variable | Required | Notes |
|---|---|---|
| `OPERATOR_ACCESS_CODE` | Yes | Real production access code. |
| `OPERATOR_SESSION_SECRET` | Yes | Long random string signing production session cookies. |
| `OPERATOR_CONTACT_WEBHOOK_URL` | Optional | Where production pilot/contact submissions forward to. |

Do **not** set `PARTNER_PREVIEW_CODE` / `VITE_ENABLE_PARTNER_PREVIEW`
in the production environment — they're development-only, and since the
dev Vite plugin never runs in the production static deployment anyway,
they'd have no effect there regardless, but omit them for clarity.

### Middleware behavior in production
`middleware.ts` (Vercel Edge Middleware):
1. Redirects `surviveday30.com` / `survive30days.com` (+`www`) → `https://survivethestreak.com`, preserving path + query, 308.
2. On `partners.survivethestreak.com`: verifies the real session cookie
   (`ss_operator`, signed with `OPERATOR_SESSION_SECRET`) and rewrites to
   `operator-gate.html` or `operator.html` accordingly; serves a
   `Disallow: /` `robots.txt` and 404 `sitemap.xml`; adds
   `X-Robots-Tag: noindex, nofollow, noarchive`.
3. On `survivethestreak.com`: redirects `/operators`, `/operator`,
   `/overview`, `/deck`, `/partner`, `/partners`, and **`/partner-preview`
   (+ subpaths)** to `/` — the preview path must never work as a real
   production route, and this is blocked both at the edge (`middleware.ts`)
   and again client-side (`PlayerApp.tsx`'s blocked-route list) as
   defense-in-depth.

### Redeploy
Environment variable changes require a fresh deployment to take effect.

### Verification checklist
- `https://survivethestreak.com/` → player landing page; view source has no operator language.
- `https://survivethestreak.com/partner-preview` → redirects to `/`, does not show a gate.
- `https://partners.survivethestreak.com/` → gate (no session); `/overview` direct → still the gate.
- Enter the real `OPERATOR_ACCESS_CODE` → `/overview` loads; refresh persists; "Lock Access" returns to the gate.
- `https://partners.survivethestreak.com/robots.txt` → `Disallow: /`.
- `https://survive30days.com/about?utm=1` → 308 to `https://survivethestreak.com/about?utm=1`; `www` too; no loops.

## If you are not on Vercel

`middleware.ts` uses the Vercel Edge Middleware contract (the
`x-middleware-rewrite` response header, plus `@vercel/edge`'s `next()`
helper). This is Vercel-specific. If deployed elsewhere:
- **Netlify**: port to a Netlify Edge Function + `netlify.toml` redirects.
- **Cloudflare Pages**: port to a Cloudflare Worker.

`server/operatorAuth.ts` (production) and the logic in
`vite-plugins/partnerPreview.ts` (preview) are both Web-Crypto-only and
platform-agnostic — only the routing glue is Vercel-specific.

Do not consider either the domain split or the operator protection "live"
until the relevant checklist above passes against the real, running
environment — code being present in the repo is not the same as it running.
