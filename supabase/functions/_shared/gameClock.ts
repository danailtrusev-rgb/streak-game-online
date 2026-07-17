// Shared, region-aware Game Clock for the Reactivation System.
//
// Supersedes the old Madrid-hardcoded gameDay.ts. This module does NOT
// hardcode any timezone or rollover time — every function takes a
// RegionTimeConfig (IANA timezone + local rollover time-of-day), sourced
// from the `game_time_regions` table (via the scheduler's own query, or
// by resolving through the Game Time System's RPCs). The formula here is
// intentionally identical to get_game_time_state_for_region()'s SQL —
// see that function's header comment in
// 20260715020000_20260715_game_time_clock_rpcs.sql for the shared
// derivation — so the Edge Function and the database never disagree
// about what "today" or "the next rollover" means for a given region.
//
// Uses Intl.DateTimeFormat for all timezone math (DST-safe by
// construction — the real observed offset for the given instant is
// resolved from the IANA database, never a hardcoded +1/+2), exactly the
// approach the original Madrid-only version already used, now
// generalized rather than rewritten from scratch.

export interface RegionTimeConfig {
  timezone: string; // IANA identifier, e.g. 'Europe/Madrid', 'America/New_York'
  /** Local rollover time-of-day, "HH:MM" or "HH:MM:SS". Defaults to "00:00:00" (midnight) if omitted. */
  rolloverLocalTime?: string;
}

function parseTimeOfDay(value: string | undefined): { hour: number; minute: number; second: number } {
  const [h, m, s] = (value ?? '00:00:00').split(':').map((n) => Number(n) || 0);
  return { hour: h, minute: m, second: s };
}

function localParts(timezone: string, now: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

function toDateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Converts a region-local calendar date + time-of-day into a real
 * instant, by finding the UTC instant whose Intl-observed local time in
 * that timezone matches the target — a small binary-search-free
 * approach that works because we only need second-level precision and
 * the offset only ever has a small number of possible values near a
 * given date. Iterative correction handles any DST-boundary edge case
 * without hardcoding offsets.
 */
function localTimeToInstant(dateStr: string, time: { hour: number; minute: number; second: number }, timezone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Start with a naive UTC guess, then correct using the actual observed offset.
  let guess = new Date(Date.UTC(y, m - 1, d, time.hour, time.minute, time.second));
  for (let i = 0; i < 3; i++) {
    const observed = localParts(timezone, guess);
    const observedAsUTC = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    const targetAsUTC = Date.UTC(y, m - 1, d, time.hour, time.minute, time.second);
    const diff = targetAsUTC - observedAsUTC;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

export interface GameClockState {
  gameDate: string;
  previousGameDate: string;
  dailyRolloverAt: Date;
  nextDailyRolloverAt: Date;
  minutesUntilNextRollover: number;
}

export function computeGameClockState(region: RegionTimeConfig, now: Date = new Date()): GameClockState {
  const rollover = parseTimeOfDay(region.rolloverLocalTime);
  const local = localParts(region.timezone, now);
  const localDateStr = toDateString(local.year, local.month, local.day);
  const localSecondsToday = local.hour * 3600 + local.minute * 60 + local.second;
  const rolloverSeconds = rollover.hour * 3600 + rollover.minute * 60 + rollover.second;

  const gameDate = localSecondsToday < rolloverSeconds ? addDays(localDateStr, -1) : localDateStr;
  const previousGameDate = addDays(gameDate, -1);
  const nextGameDate = addDays(gameDate, 1);

  const nextDailyRolloverAt = localTimeToInstant(nextGameDate, rollover, region.timezone);
  const dailyRolloverAt = localTimeToInstant(gameDate, rollover, region.timezone);
  const minutesUntilNextRollover = Math.max(0, (nextDailyRolloverAt.getTime() - now.getTime()) / 60000);

  return { gameDate, previousGameDate, dailyRolloverAt, nextDailyRolloverAt, minutesUntilNextRollover };
}

export function isWithinLastCallWindow(windowMinutes: number, region: RegionTimeConfig, now: Date = new Date()): boolean {
  const { minutesUntilNextRollover } = computeGameClockState(region, now);
  return minutesUntilNextRollover > 0 && minutesUntilNextRollover <= windowMinutes;
}

// ── Weekend window computation (mirrors get_game_time_state_for_region()'s
//    Saturday/Sunday SQL logic exactly — same ISO-week-Saturday/+5,
//    Sunday/+6 derivation, same 'not_configured'/'upcoming'/'active'/
//    'ended' status model). Foundation only — not wired into the actual
//    qualification/event RPCs in this pass (see PROJECT_CHANGELOG.md
//    "Saturday/Sunday timing foundation").

export interface WeekendWindowConfig extends RegionTimeConfig {
  startLocalTime: string | null;
  endLocalTime: string | null;
}

export type WeekendStatus = 'not_configured' | 'upcoming' | 'active' | 'ended';

export interface WeekendWindow {
  status: WeekendStatus;
  startAt: Date | null;
  endAt: Date | null;
}

function isoWeekSaturday(localDateStr: string): string {
  // date_trunc('week', d) in Postgres returns the Monday of that ISO
  // week; Saturday is Monday + 5. Compute the same way in JS using a
  // UTC-anchored date (calendar-only arithmetic, no timezone conversion
  // needed here since we're just walking whole days).
  const d = new Date(localDateStr + 'T00:00:00Z');
  const isoDow = (d.getUTCDay() + 6) % 7; // 0=Monday..6=Sunday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - isoDow);
  const saturday = new Date(monday);
  saturday.setUTCDate(monday.getUTCDate() + 5);
  return saturday.toISOString().slice(0, 10);
}

function computeWeekendWindow(config: WeekendWindowConfig, dayOffsetFromSaturday: 0 | 1, now: Date): WeekendWindow {
  if (!config.startLocalTime) return { status: 'not_configured', startAt: null, endAt: null };

  const clock = computeGameClockState({ timezone: config.timezone, rolloverLocalTime: config.rolloverLocalTime }, now);
  const localDateStr = clock.gameDate; // using the game date's local calendar date as the week anchor
  const saturdayDate = isoWeekSaturday(localDateStr);
  const targetDate = dayOffsetFromSaturday === 0 ? saturdayDate : addDaysExported(saturdayDate, 1);

  const start = parseTimeOfDay(config.startLocalTime);
  const end = parseTimeOfDay(config.endLocalTime ?? '23:59:59');
  const startAt = localTimeToInstant(targetDate, start, config.timezone);
  const endAt = localTimeToInstant(targetDate, end, config.timezone);

  const status: WeekendStatus = now.getTime() < startAt.getTime() ? 'upcoming' : now.getTime() <= endAt.getTime() ? 'active' : 'ended';
  return { status, startAt, endAt };
}

function addDaysExported(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeSaturdayWindow(config: WeekendWindowConfig, now: Date = new Date()): WeekendWindow {
  return computeWeekendWindow(config, 0, now);
}

export function computeSundayWindow(config: WeekendWindowConfig, now: Date = new Date()): WeekendWindow {
  return computeWeekendWindow(config, 1, now);
}
