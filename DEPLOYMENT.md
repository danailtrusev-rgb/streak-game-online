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
