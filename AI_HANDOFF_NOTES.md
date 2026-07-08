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

## Always-preserved
`/play` remains the game entry. `/sys/admin` remains the admin route.
Existing game, wallet, Supabase, authentication, and backend logic must
remain unchanged — this cleanup touched only landing-page-adjacent files
that existed solely to support the now-removed operator site.
