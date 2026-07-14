// Manual verification script for the result-messaging system.
//
// No test framework (vitest/jest/etc.) is configured in this project yet,
// and adding one is out of scope for this audit pass — so this is a
// plain, dependency-free script rather than a wired-up test suite. Run it
// directly:
//
//   npx tsx scripts/verify-result-messages.ts
//
// If/when a real test framework is added to the project, these same
// assertions should become proper unit tests (e.g.
// src/lib/resultMessages.test.ts) instead of a standalone script.

import { selectResultMessage, type ResultMessageContext } from '../src/lib/resultMessages';
import { getMilestoneInfo, daysToNextMilestone } from '../src/lib/gateUtils';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ok  - ${label}`);
  } else {
    failed++;
    console.log(`FAIL  - ${label}${detail ? ` (${detail})` : ''}`);
  }
}

function baseCtx(overrides: Partial<ResultMessageContext>): ResultMessageContext {
  return {
    survived: true,
    streak: 5,
    previousBestStreak: 3,
    nextMilestoneDay: 7,
    daysToNextMilestone: 2,
    timeUntilNextPlay: '08:00:00',
    qualification: null,
    variantSeed: 'seed-1',
    ...overrides,
  };
}

console.log('\n== Personal-best detection ==');
{
  // Previous best 10, new streak 11 -> personal best
  const msg = selectResultMessage(baseCtx({ streak: 11, previousBestStreak: 10, daysToNextMilestone: 3 }));
  check('prev 10, streak 11 -> personal_best', msg.eventType === 'personal_best', msg.eventType);
}
{
  // Previous best 10, new streak 10 -> not personal best
  const msg = selectResultMessage(baseCtx({ streak: 10, previousBestStreak: 10, daysToNextMilestone: 3 }));
  check('prev 10, streak 10 -> not personal_best', msg.eventType !== 'personal_best', msg.eventType);
}
{
  // Previous best 10, new streak 9 -> not personal best (also shouldn't happen on survive, but guard anyway)
  const msg = selectResultMessage(baseCtx({ streak: 9, previousBestStreak: 10, daysToNextMilestone: 3 }));
  check('prev 10, streak 9 -> not personal_best', msg.eventType !== 'personal_best', msg.eventType);
}
{
  // Previous best unavailable (null), new streak 1 -> not personal best
  const msg = selectResultMessage(baseCtx({ streak: 1, previousBestStreak: null, daysToNextMilestone: 2 }));
  check('prev null, streak 1 -> not personal_best', msg.eventType !== 'personal_best', msg.eventType);
}
{
  // Previous best unavailable (null), new streak 20 -> not personal best
  const msg = selectResultMessage(baseCtx({ streak: 20, previousBestStreak: null, daysToNextMilestone: 3 }));
  check('prev null, streak 20 -> not personal_best', msg.eventType !== 'personal_best', msg.eventType);
}

console.log('\n== Survive priority ==');
{
  // Personal best beats near-milestone
  const msg = selectResultMessage(baseCtx({ streak: 11, previousBestStreak: 10, daysToNextMilestone: 1 }));
  check('personal best beats near-milestone', msg.eventType === 'personal_best', msg.eventType);
}
{
  // Near-milestone beats qualification-progress
  const msg = selectResultMessage(baseCtx({
    streak: 6, previousBestStreak: 10, daysToNextMilestone: 1,
    qualification: { pointsBefore: 5, pointsAfter: 8, pointsThreshold: 20, alreadyQualified: false },
  }));
  check('near-milestone beats qualification-progress', msg.eventType === 'milestone_eve', msg.eventType);
}
{
  // Qualification-progress beats long-streak
  const msg = selectResultMessage(baseCtx({
    streak: 9, previousBestStreak: 20, daysToNextMilestone: 5,
    qualification: { pointsBefore: 5, pointsAfter: 8, pointsThreshold: 20, alreadyQualified: false },
  }));
  check('qualification-progress beats long-streak', msg.eventType === 'qualification_progress', msg.eventType);
}
{
  // Long streak, nothing else applies -> long_streak
  const msg = selectResultMessage(baseCtx({ streak: 9, previousBestStreak: 20, daysToNextMilestone: 5, qualification: null }));
  check('long streak alone -> long_streak', msg.eventType === 'long_streak', msg.eventType);
}
{
  // Standard
  const msg = selectResultMessage(baseCtx({ streak: 4, previousBestStreak: 20, daysToNextMilestone: 3, qualification: null }));
  check('nothing special -> standard', msg.eventType === 'standard', msg.eventType);
}

console.log('\n== Fail priority ==');
{
  const msg = selectResultMessage(baseCtx({ survived: false, streak: 6, daysToNextMilestone: 1, previousBestStreak: 20 }));
  check('fail near-milestone', msg.eventType === 'near_milestone', msg.eventType);
}
{
  const msg = selectResultMessage(baseCtx({ survived: false, streak: 9, daysToNextMilestone: 5, previousBestStreak: 20 }));
  check('fail long-streak', msg.eventType === 'long_streak', msg.eventType);
}
{
  const msg = selectResultMessage(baseCtx({
    survived: false, streak: 4, daysToNextMilestone: 5, previousBestStreak: 20,
    qualification: { pointsBefore: 5, pointsAfter: 8, pointsThreshold: 20, alreadyQualified: false },
  }));
  check('fail qualification-retained (genuine progress)', msg.eventType === 'qualification_retained', msg.eventType);
}
{
  // Qualification object present but NOT genuinely relevant (no points change captured) -> falls back to standard
  const msg = selectResultMessage(baseCtx({
    survived: false, streak: 4, daysToNextMilestone: 5, previousBestStreak: 20,
    qualification: { pointsBefore: null, pointsAfter: 8, pointsThreshold: 20, alreadyQualified: false },
  }));
  check('fail with unproven qualification data -> standard (not qualification_retained)', msg.eventType === 'standard', msg.eventType);
}
{
  // Already qualified -> qualification messaging should not fire even if points present
  const msg = selectResultMessage(baseCtx({
    survived: false, streak: 4, daysToNextMilestone: 5, previousBestStreak: 20,
    qualification: { pointsBefore: 5, pointsAfter: 8, pointsThreshold: 20, alreadyQualified: true },
  }));
  check('already-qualified -> standard, not qualification_retained', msg.eventType === 'standard', msg.eventType);
}
{
  const msg = selectResultMessage(baseCtx({ survived: false, streak: 2, daysToNextMilestone: 5, previousBestStreak: 20, qualification: null }));
  check('fail standard', msg.eventType === 'standard', msg.eventType);
}

console.log('\n== Variant stability ==');
{
  const ctx = baseCtx({ streak: 4, variantSeed: 'play-123' });
  const a = selectResultMessage(ctx);
  const b = selectResultMessage(ctx);
  check('same context -> identical message id', a.messageId === b.messageId, `${a.messageId} vs ${b.messageId}`);
}
{
  const a = selectResultMessage(baseCtx({ streak: 4, variantSeed: '' }));
  const b = selectResultMessage(baseCtx({ streak: 4, variantSeed: '' }));
  check('empty seed -> deterministic (not random)', a.messageId === b.messageId, `${a.messageId} vs ${b.messageId}`);
}
{
  const a = selectResultMessage(baseCtx({ streak: 4, variantSeed: 'play-A' }));
  const b = selectResultMessage(baseCtx({ streak: 4, variantSeed: 'play-B' }));
  console.log(`  info - different seeds -> ${a.messageId} vs ${b.messageId} (may or may not differ, both valid)`);
}

console.log('\n== Interpolation safety ==');
{
  const msg = selectResultMessage(baseCtx({ streak: 4, daysToNextMilestone: 3 }));
  const noRaw = !/\{[a-zA-Z]+\}/.test(msg.headline + msg.consequence + msg.tomorrowHook);
  check('no raw {placeholder} left in output', noRaw, JSON.stringify(msg));
  check('no literal "undefined"/"null"/"NaN" in output', !/undefined|null|NaN/.test(msg.headline + msg.consequence + msg.tomorrowHook));
}

console.log('\n== Milestone math (wraparound fix) ==');
{
  const info = getMilestoneInfo(30);
  check('streak 30 -> target 31, daysLeft 1 (not negative)', info.target === 31 && info.daysLeft === 1, JSON.stringify(info));
}
{
  const info = getMilestoneInfo(31);
  check('streak 31 -> target 33, daysLeft 2', info.target === 33 && info.daysLeft === 2, JSON.stringify(info));
}
{
  const info = getMilestoneInfo(45);
  check('streak 45 -> non-negative daysLeft', info.daysLeft >= 0, JSON.stringify(info));
}
{
  const d = daysToNextMilestone(60);
  check('daysToNextMilestone(60) is non-negative', d >= 0, String(d));
}
{
  const info = getMilestoneInfo(5);
  check('streak 5 (unwrapped) -> target 7, daysLeft 2 unaffected by fix', info.target === 7 && info.daysLeft === 2, JSON.stringify(info));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
