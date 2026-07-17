// Pure, Node-testable MIRROR of supabase/functions/_shared/gameClock.ts.
// See that file for the real, canonical Deno logic and the SQL formula it
// mirrors (get_game_time_state_for_region()). Keep both in sync by hand.

export interface RegionTimeConfig {
  timezone: string;
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

function localTimeToInstant(dateStr: string, time: { hour: number; minute: number; second: number }, timezone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
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

// ── Weekend window computation (mirror — see _shared/gameClock.ts) ──────
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
  const d = new Date(localDateStr + 'T00:00:00Z');
  const isoDow = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - isoDow);
  const saturday = new Date(monday);
  saturday.setUTCDate(monday.getUTCDate() + 5);
  return saturday.toISOString().slice(0, 10);
}

function addDaysExported(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeWeekendWindow(config: WeekendWindowConfig, dayOffsetFromSaturday: 0 | 1, now: Date): WeekendWindow {
  if (!config.startLocalTime) return { status: 'not_configured', startAt: null, endAt: null };

  const clock = computeGameClockState({ timezone: config.timezone, rolloverLocalTime: config.rolloverLocalTime }, now);
  const localDateStr = clock.gameDate;
  const saturdayDate = isoWeekSaturday(localDateStr);
  const targetDate = dayOffsetFromSaturday === 0 ? saturdayDate : addDaysExported(saturdayDate, 1);

  const start = parseTimeOfDay(config.startLocalTime);
  const end = parseTimeOfDay(config.endLocalTime ?? '23:59:59');
  const startAt = localTimeToInstant(targetDate, start, config.timezone);
  const endAt = localTimeToInstant(targetDate, end, config.timezone);

  const status: WeekendStatus = now.getTime() < startAt.getTime() ? 'upcoming' : now.getTime() <= endAt.getTime() ? 'active' : 'ended';
  return { status, startAt, endAt };
}

export function computeSaturdayWindow(config: WeekendWindowConfig, now: Date = new Date()): WeekendWindow {
  return computeWeekendWindow(config, 0, now);
}

export function computeSundayWindow(config: WeekendWindowConfig, now: Date = new Date()): WeekendWindow {
  return computeWeekendWindow(config, 1, now);
}
