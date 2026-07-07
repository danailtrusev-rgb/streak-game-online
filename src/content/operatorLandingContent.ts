// Operator-facing copy for partners.survivethestreak.com (private, gated).
// Never import this content into any player-facing component or page.

export const operatorLandingContent = {
  meta: {
    // Deliberately neutral — this title is visible even to search engines
    // that ignore noindex, so it must not reveal commercial positioning.
    title: 'Private Partner Access',
  },
  hero: {
    headline: 'A daily streak engine built to bring users back.',
    subheadline: 'Turn one short daily challenge into a reason to return tomorrow.',
    body: 'Survive the Streak is a mobile-first challenge platform built around daily participation, visible progress, social sharing, and weekly event peaks.',
    primaryCta: 'Request a Pilot',
    secondaryCta: 'Explore the Model',
  },
  problem: {
    title: 'Most users do not need more content. They need a reason to return.',
    points: [
      'Sign-up without repeat activity',
      'Campaign traffic that quickly disappears',
      'Loyalty systems that feel passive',
      'Promotions without a continuing narrative',
    ],
  },
  system: {
    title: 'One engagement rhythm, six moving parts',
    text: 'Each element feeds the next, creating a repeating weekly cycle rather than a single one-off session.',
    steps: [
      'Daily challenge',
      'Streak progression',
      'Social sharing',
      'Weekly qualification',
      'Weekend event',
      'Repeat cycle',
    ],
  },
  value: {
    title: 'What Survive the Streak can add',
    cards: [
      { title: 'Daily return behaviour', text: 'A lightweight reason to open the product again tomorrow.', metric: 'Daily participation' },
      { title: 'Reactivation campaigns', text: 'Re-engage dormant users with a low-friction daily hook.', metric: 'Campaign reactivation' },
      { title: 'Repeat sessions', text: 'Streak protection keeps players coming back day after day.', metric: 'Streak continuation' },
      { title: 'Social reach', text: 'Players share streaks and challenge friends organically.', metric: 'Share rate' },
      { title: 'Campaign storytelling', text: 'A narrative arc — day 1 to day 30 — that campaigns can build around.', metric: 'Repeat session rate' },
      { title: 'Flexible reward structures', text: 'Reward logic can be configured per campaign or partner.', metric: 'Qualification rate' },
    ],
  },
  useCases: {
    title: 'Use cases',
    chips: [
      'Retention campaign',
      'Reactivation campaign',
      'Loyalty challenge',
      'Influencer traffic activation',
      'Seasonal promotion',
      'Community challenge',
      'Partner promotion',
      'Operator-branded daily game',
    ],
  },
  formats: {
    title: 'Product formats',
    cards: [
      { title: 'Standalone campaign', text: 'A separately branded campaign destination with daily challenges and measurable participation.' },
      { title: 'White-label version', text: 'An operator-branded experience using the same core streak system. Can be configured to match partner branding.' },
      { title: 'Integrated challenge layer', text: 'A planned integration model connecting to an existing CRM, loyalty program, user base, or campaign flow, subject to technical scoping.' },
    ],
  },
  pilot: {
    title: 'How an early pilot works',
    steps: [
      'Select campaign objective',
      'Define audience and reward structure',
      'Configure visual branding and challenge flow',
      'Launch a controlled pilot',
      'Review participation and return behaviour',
      'Decide on broader rollout',
    ],
  },
  finalCta: {
    title: 'Want to test a daily streak campaign?',
    text: 'We are preparing early operator pilots for selected partners. Request access to discuss campaign setup, integration options, and launch structure.',
    cta: 'Request a Private Pilot',
  },
  nav: {
    viewPlayerExperience: 'View Player Experience',
    playerUrl: 'https://survivethestreak.com',
  },
} as const;
