// Player-facing copy for the "/" landing page on survivethestreak.com.
// Fun, simple, mainstream. No retention/operator/economy/gambling language.

export const playerLandingContent = {
  meta: {
    title: 'Survive the Streak — Can You Survive 30 Days?',
    description:
      'Face one short challenge every day, protect your streak, and see if you can survive all 30 days.',
  },
  hero: {
    eyebrow: 'A daily survival challenge',
    headline: 'Can you survive 30 days?',
    subheadline: 'One daily challenge. One streak to protect. One mistake and it resets.',
    primaryCta: 'Start the Challenge',
    secondaryCta: 'See How It Works',
  },
  motif: {
    title: 'Day 1 to day 30',
    text: 'Every day you survive moves you one step further through the gate. Fall, and the path resets.',
    milestones: [
      { day: 1, label: 'First Trial' },
      { day: 7, label: 'One Week In' },
      { day: 14, label: 'Halfway' },
      { day: 21, label: 'Deep In' },
      { day: 30, label: 'Survivor' },
    ],
  },
  howItWorks: {
    title: 'How it works',
    steps: [
      {
        title: 'Enter today\u2019s trial',
        text: 'Every day unlocks one short challenge. Step up to the gate and make your move.',
      },
      {
        title: 'Survive and protect your streak',
        text: 'Each result either grows your streak or resets it. Every choice carries weight.',
      },
      {
        title: 'Reach day 30',
        text: 'Keep surviving, day after day, until you complete the full 30-day run.',
      },
    ],
  },
  challenges: {
    title: 'Every day feels different',
    text: 'Different trials, different tension. Each challenge is short — but the stakes rise with your streak.',
    items: [
      { name: 'Skull Gate', text: 'Choose your path through the gate and reveal your fate.' },
      { name: 'Torch Trial', text: 'Pick the flame that survives the night.' },
      { name: 'Glyph Gate', text: 'Read the signs before they read you.' },
      { name: 'More trials coming', text: 'New challenges are added as the streak grows.' },
    ],
  },
  weekend: {
    title: 'The weekend changes everything',
    text: 'Active players can unlock special weekend events. Build your week, qualify for bigger moments, and see who can survive when the pressure is highest.',
    stages: [
      { label: 'Saturday', title: 'Qualification Trials', text: 'Prove yourself across the week to earn your place.' },
      { label: 'Sunday', title: 'Last Survivors', text: 'Only qualified players face the final event.' },
    ],
  },
  social: {
    title: 'Share your survival',
    text: 'Show your streak, challenge friends, and celebrate milestones as you go.',
    bullets: ['Share your current streak', 'Challenge a friend to beat it', 'Celebrate day 30'],
  },
  mobile: {
    title: 'Made for mobile',
    text: 'Open the game, play your daily challenge, check your streak, and share your result. Survive the Streak is built for fast daily play in portrait mode.',
  },
  finalCta: {
    title: 'Your streak starts with day one.',
    text: 'Start the challenge and see how long you can survive.',
    cta: 'Start the Challenge',
  },
} as const;
