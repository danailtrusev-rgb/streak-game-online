// ─────────────────────────────────────────────────────────────────────────────
// Landing page copy — centralized so non-engineers (or future AI edits) can
// update marketing text without touching component logic.
//
// IMPORTANT — audience separation:
//   playerLandingContent   -> public player-facing copy ONLY.
//                              No retention / operator / monetization / gambling
//                              language. Keep it fun, simple, mainstream.
//   operatorLandingContent -> public B2B copy for the /operators page ONLY.
//                              Can discuss retention, reactivation, campaigns,
//                              white-label, integrations. Still must avoid
//                              RTP / backend odds / wallet ledger / gambling
//                              or casino positioning.
//
// Do not mix these two objects into the same page.
// ─────────────────────────────────────────────────────────────────────────────

export const playerLandingContent = {
  hero: {
    headline: 'Can you survive 30 days?',
    subheadline: 'One daily challenge. One streak to protect. One mistake and it resets.',
    body:
      'Survive the Streak is a daily survival challenge where your goal is simple: keep your streak alive for 30 days. Each day brings a short trial. Survive, and your streak grows. Fail, and you start again.',
    primaryCta: 'Start the Challenge',
    secondaryCta: 'How It Works',
  },
  howItWorks: {
    title: 'How it works',
    cards: [
      {
        title: 'Play once per day',
        text: 'Every day, you face a short challenge. Make your move and reveal if your streak survives.',
      },
      {
        title: 'Protect your streak',
        text: 'The longer you survive, the more every decision matters.',
      },
      {
        title: 'Reach day 30',
        text: 'Keep going until you complete the 30-day survival run.',
      },
    ],
  },
  everyDay: {
    title: 'Every day feels different',
    text:
      'Survive through different trials, themes, and reveal moments. Each challenge is short, but the pressure builds as your streak gets longer.',
    examples: ['Skull Gate', 'Torch Trial', 'Glyph Gate', 'More trials coming soon'],
  },
  weekend: {
    title: 'The weekend changes everything',
    text:
      'Active players can unlock special weekend events. Build your week, qualify for bigger moments, and see who can survive when the pressure is highest.',
  },
  mobile: {
    title: 'Made for mobile',
    text:
      'Open the game, play your daily challenge, check your streak, and share your result. Survive the Streak is designed for fast daily play in portrait mode.',
  },
  finalCta: {
    title: 'Your streak starts with day one.',
    text: 'Start the challenge and see how long you can survive.',
    cta: 'Start the Challenge',
  },
} as const;

export const operatorLandingContent = {
  hero: {
    headline: 'A daily streak engine for operators who need users to come back.',
    subheadline:
      'Survive the Streak turns short daily challenges into repeat engagement, social sharing, and high-retention player journeys.',
    body:
      'Survive the Streak is a mobile-first challenge platform built around daily participation, streak protection, social sharing, and weekend events. It gives operators a simple way to create repeat engagement without asking users to spend long sessions inside the product.',
    primaryCta: 'Request Operator Access',
    secondaryCta: 'View Product Concept',
  },
  problem: {
    title: 'Most users do not need more content. They need a reason to return.',
    text:
      'Operators often struggle with the same problem: users sign up, try the product, and disappear. Survive the Streak creates a lightweight daily reason to come back, built around progress, anticipation, and streak protection.',
  },
  whatItAdds: {
    title: 'What Survive the Streak can add',
    cards: [
      {
        title: 'Daily return loop',
        text: 'Players receive a simple daily challenge that gives them a clear reason to return.',
      },
      {
        title: 'Streak-based motivation',
        text: 'The longer the streak continues, the more invested the user becomes.',
      },
      {
        title: 'Weekend event layer',
        text: 'Weekly qualification and weekend events create a larger rhythm beyond the daily challenge.',
      },
      {
        title: 'Social sharing',
        text: 'Players can share progress, streaks, wins, and survival moments across social channels.',
      },
      {
        title: 'Campaign flexibility',
        text: 'The product can work as a standalone destination, white-label campaign, or integrated challenge layer.',
      },
    ],
  },
  useCases: {
    title: 'Use cases',
    chips: [
      'Retention campaign',
      'Reactivation campaign',
      'Influencer traffic activation',
      'Loyalty challenge',
      'Seasonal promotion',
      'White-label daily game',
      'Community challenge',
      'Partner promotion',
    ],
  },
  formats: {
    title: 'Product formats',
    cards: [
      {
        title: 'Standalone campaign',
        text: 'Send users to a branded Survive the Streak campaign page and measure daily participation.',
      },
      {
        title: 'White-label version',
        text: 'Run the experience under an operator or partner brand with adjusted visuals and campaign rules.',
      },
      {
        title: 'Integrated challenge layer',
        text: 'Connect the streak mechanic into an existing user base, CRM, loyalty system, or campaign flow.',
      },
    ],
  },
  whyItWorks: {
    title: 'Why the model works',
    text:
      'Survive the Streak is built around proven engagement patterns: daily rhythm, visible progress, streak protection, social proof, and event-based peaks. The result is a simple product that can create repeat interaction without requiring long gameplay sessions.',
  },
  finalCta: {
    title: 'Want to test a daily streak campaign?',
    text:
      'We are preparing early operator pilots for selected partners. Request access to discuss campaign setup, integration options, and launch structure.',
    cta: 'Request Operator Access',
  },
} as const;
