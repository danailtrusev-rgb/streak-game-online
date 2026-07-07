// Player-facing copy for /about on survivethestreak.com.
// Explains the concept in more depth. Still no operator/business language.

export const aboutPageContent = {
  meta: {
    title: 'About Survive the Streak',
    description: 'How the 30-day survival challenge works: daily trials, streaks, weekend events, and sharing.',
  },
  intro: {
    title: 'What is Survive the Streak?',
    text: 'Survive the Streak is a daily survival challenge. Every day brings one short trial. Survive it, and your streak grows. The goal: reach day 30.',
  },
  sections: [
    {
      title: 'The 30-day objective',
      text: 'Your streak counts every day you survive in a row. The full run is 30 days — a long, tense climb where every day matters more than the last.',
    },
    {
      title: 'Daily trials',
      text: 'Each day unlocks a short challenge, like Skull Gate, Torch Trial, or Glyph Gate. New trials appear as the game grows.',
    },
    {
      title: 'Streak progression',
      text: 'Survive, and your streak climbs. It is the one number that matters — a visible record of how far you have come.',
    },
    {
      title: 'Weekend events',
      text: 'Active players can qualify for special weekend events — Saturday Qualification Trials and the Sunday Last Survivors event.',
    },
    {
      title: 'Sharing and community',
      text: 'Share your streak, challenge friends, and celebrate milestones as you climb toward day 30.',
    },
    {
      title: 'What happens when a streak resets',
      text: 'One mistake ends the run. Your streak resets to day one, and the challenge begins again.',
    },
  ],
  finalCta: {
    title: 'Ready to start your run?',
    cta: 'Start the Challenge',
  },
} as const;
