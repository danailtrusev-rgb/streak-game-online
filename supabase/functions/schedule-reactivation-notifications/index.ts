// schedule-reactivation-notifications
//
// Refactored to use the shared Game Time System instead of hardcoded
// Madrid dependencies (get_madrid_today / minutesUntilMadridMidnight /
// nextMadridMidnight are no longer used here — see
// PROJECT_CHANGELOG.md "Game Time System"). Still Global-mode-only in
// practice (Regional mode is not enabled), but the implementation is
// genuinely region-aware and will not need rewriting when it is.
//
// Scheduler efficiency (requirement #11): the game clock is computed
// ONCE PER DISTINCT REGION among the candidate set, not once per user —
// `game_time_settings` + all enabled `game_time_regions` are fetched in
// two small queries, each candidate user's effective region is resolved
// via a single set-based join (their `user_game_time_region` row, or the
// global default), and users are grouped locally by region_id before the
// (small, bounded-by-region-count) clock computation runs.
//
// Two phases per tick, same as before: Phase A creates one logical job
// per (user, type, game_date, region) that doesn't already exist; Phase B
// atomically claims due jobs (fresh + retryable) and sends, with bounded
// retry that never crosses a job's real expiry.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { loadVapidConfig, sendWebPush, buildPayload } from "../_shared/webpush.ts";
import { computeGameClockState, isWithinLastCallWindow, type RegionTimeConfig, type GameClockState } from "../_shared/gameClock.ts";
import {
  isEligibleForNextDay, isEligibleForLastCall, selectNextDayCopy, selectLastCallCopy,
  selectPreferredSubscription, type EligibilityConfig, type PlayerNotificationState, type SubscriptionCandidate,
} from "../_shared/eligibility.ts";
import { computeNextAttempt } from "../_shared/retry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const ALLOWED_ROUTES = new Set(["/", "/play"]);
const CLAIM_BATCH_LIMIT = 100;

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(url, key);
}

async function loadSettings(supabase: ReturnType<typeof createClient>): Promise<Record<string, unknown>> {
  const { data } = await supabase.from("settings").select("key, value_json").like("key", "push_%");
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key as string] = row.value_json;
  return map;
}

function toCandidate(sub: { id: string; enabled: boolean; last_success_at: string | null; updated_at: string; created_at: string }): SubscriptionCandidate {
  return { id: sub.id, enabled: sub.enabled, lastSuccessAt: sub.last_success_at, updatedAt: sub.updated_at, createdAt: sub.created_at };
}

/**
 * Resolves the effective game-time region for a set of users in ONE
 * query pass (not one RPC call per user) — mirrors
 * resolve_user_game_time_region()'s SQL logic (explicit assignment if one
 * exists and is enabled, otherwise the global default), computed here in
 * JS against two small already-fetched result sets rather than a second
 * round-trip per user.
 */
function resolveRegionsForUsers(
  userIds: string[],
  assignments: Array<{ user_id: string; region_id: string }>,
  enabledRegionIds: Set<string>,
  globalRegionId: string,
): Map<string, string> {
  const assignmentMap = new Map(assignments.map((a) => [a.user_id, a.region_id]));
  const result = new Map<string, string>();
  for (const userId of userIds) {
    const assigned = assignmentMap.get(userId);
    result.set(userId, assigned && enabledRegionIds.has(assigned) ? assigned : globalRegionId);
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = getSupabase();
  const vapid = loadVapidConfig();
  if (!vapid) return json({ error: "VAPID not configured" }, 500);

  const settings = await loadSettings(supabase);
  const config: EligibilityConfig = {
    globalPushEnabled: Boolean(settings.push_global_enabled),
    nextDayEnabled: Boolean(settings.push_next_day_enabled),
    lastCallEnabled: Boolean(settings.push_last_call_enabled),
    lastCallMinutesBeforeCutoff: Number(settings.push_last_call_minutes_before_cutoff ?? 120),
    minSpacingHours: Number(settings.push_min_spacing_hours ?? 4),
  };

  // Global switch is checked BEFORE selecting candidates, resolving any
  // region, inserting any delivery row, or calling the push provider.
  if (!config.globalPushEnabled) {
    return json({ ok: true, skipped: "global_push_disabled", created: 0, sent: 0 });
  }

  // ── Game Time System: fetch settings + enabled regions once ──────────
  const { data: gtSettings } = await supabase.from("game_time_settings").select("mode, global_region_id").eq("id", true).maybeSingle();
  if (!gtSettings) return json({ error: "Game Time System not configured" }, 500);
  const { data: regions } = await supabase.from("game_time_regions").select("id, timezone, daily_rollover_local_time").eq("enabled", true);
  const regionById = new Map((regions ?? []).map((r) => [r.id as string, r]));
  const enabledRegionIds = new Set(regionById.keys());
  const now = new Date();

  // Precompute the game clock ONCE PER DISTINCT REGION (not per user).
  const clockByRegion = new Map<string, GameClockState>();
  const lastCallActiveByRegion = new Map<string, boolean>();
  for (const [regionId, region] of regionById) {
    const rc: RegionTimeConfig = { timezone: region.timezone as string, rolloverLocalTime: region.daily_rollover_local_time as string };
    clockByRegion.set(regionId, computeGameClockState(rc, now));
    lastCallActiveByRegion.set(regionId, isWithinLastCallWindow(config.lastCallMinutesBeforeCutoff, rc, now));
  }

  const anyNextDayPossible = config.nextDayEnabled;
  const anyLastCallPossible = config.lastCallEnabled && [...lastCallActiveByRegion.values()].some(Boolean);

  let created = 0;

  // ── Phase A: job creation (eligibility) ──────────────────────────────
  if (anyNextDayPossible || anyLastCallPossible) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, push_enabled, next_day_enabled, last_call_enabled")
      .eq("push_enabled", true);

    if (prefs && prefs.length > 0) {
      const userIds = prefs.map((p) => p.user_id as string);

      const { data: users } = await supabase.from("users").select("id, status").in("id", userIds);
      const { data: gameStates } = await supabase.from("game_state").select("user_id, current_streak, last_play_date").in("user_id", userIds);
      const { data: subs } = await supabase
        .from("push_subscriptions").select("id, user_id, enabled, last_success_at, updated_at, created_at")
        .in("user_id", userIds).eq("enabled", true).is("revoked_at", null);
      const { data: regionAssignments } = await supabase
        .from("user_game_time_region").select("user_id, region_id").in("user_id", userIds);

      // Region resolution — one set-based pass for every candidate.
      const regionByUser = resolveRegionsForUsers(userIds, (regionAssignments ?? []) as { user_id: string; region_id: string }[], enabledRegionIds, gtSettings.global_region_id as string);

      // "Already sent today" and "minutes since last notification" are
      // both PER-REGION-GAME-DATE concepts now — fetch per user's
      // resolved region's current game_date, grouped, in one query per
      // distinct (region, game_date) pair actually present (in practice
      // just one pair while Regional mode is off).
      const gameDatesInPlay = new Set<string>();
      for (const regionId of new Set(regionByUser.values())) {
        const clock = clockByRegion.get(regionId);
        if (clock) gameDatesInPlay.add(clock.gameDate);
      }
      const { data: todayLogs } = await supabase
        .from("notification_delivery_log").select("user_id, notification_type, region_id, game_date")
        .in("user_id", userIds).in("game_date", [...gameDatesInPlay])
        .in("status", ["queued", "sending", "sent", "clicked", "failed_temporary"]);
      const { data: recentLogs } = await supabase
        .from("notification_delivery_log").select("user_id, last_attempt_at, attempted_at")
        .in("user_id", userIds).order("created_at", { ascending: false });

      const userMap = new Map((users ?? []).map((u) => [u.id, u]));
      const stateMap = new Map((gameStates ?? []).map((g) => [g.user_id, g]));
      const subsByUser = new Map<string, typeof subs>();
      for (const s of subs ?? []) {
        const list = subsByUser.get(s.user_id as string) ?? [];
        list.push(s);
        subsByUser.set(s.user_id as string, list as never);
      }
      const sentTodayByUser = new Map<string, Set<string>>();
      for (const l of todayLogs ?? []) {
        // Only counts as "already sent today" if it matches THIS user's
        // currently-resolved region's game_date — a stale row from a
        // different region/game_date (e.g. right after a reassignment)
        // never blocks a genuinely new day's notification.
        const userRegion = regionByUser.get(l.user_id as string);
        const userClock = userRegion ? clockByRegion.get(userRegion) : undefined;
        if (!userClock || l.game_date !== userClock.gameDate) continue;
        const set = sentTodayByUser.get(l.user_id as string) ?? new Set();
        set.add(l.notification_type as string);
        sentTodayByUser.set(l.user_id as string, set);
      }
      const lastNotifByUser = new Map<string, string>();
      for (const l of recentLogs ?? []) {
        const ts = (l.last_attempt_at as string | null) ?? (l.attempted_at as string | null);
        if (ts && !lastNotifByUser.has(l.user_id as string)) lastNotifByUser.set(l.user_id as string, ts);
      }

      for (const pref of prefs) {
        const userId = pref.user_id as string;
        const user = userMap.get(userId);
        const gs = stateMap.get(userId);
        const userSubs = (subsByUser.get(userId) ?? []).map(toCandidate);
        const regionId = regionByUser.get(userId);
        const clock = regionId ? clockByRegion.get(regionId) : undefined;
        if (!user || userSubs.length === 0 || !regionId || !clock) continue;

        const playedToday = gs?.last_play_date === clock.gameDate;
        const lastNotifAt = lastNotifByUser.get(userId);
        const minutesSinceLastNotification = lastNotifAt ? (now.getTime() - new Date(lastNotifAt).getTime()) / 60000 : null;

        const state: PlayerNotificationState = {
          userStatus: user.status as string,
          currentStreak: Number(gs?.current_streak ?? 0),
          lastPlayDate: (gs?.last_play_date as string | null) ?? null,
          pushEnabled: Boolean(pref.push_enabled),
          nextDayEnabled: Boolean(pref.next_day_enabled),
          lastCallEnabled: Boolean(pref.last_call_enabled),
          hasActiveSubscription: userSubs.length > 0,
          alreadySentNextDayToday: sentTodayByUser.get(userId)?.has("next_day") ?? false,
          alreadySentLastCallToday: sentTodayByUser.get(userId)?.has("last_call") ?? false,
          minutesSinceLastNotification,
        };

        const preferredSub = selectPreferredSubscription(userSubs);
        if (!preferredSub) continue;

        const lastCallActive = lastCallActiveByRegion.get(regionId) ?? false;
        const minutesLeft = clock.minutesUntilNextRollover;

        const nextDayResult = config.nextDayEnabled
          ? isEligibleForNextDay(state, config, clock.previousGameDate, playedToday)
          : { eligible: false, reason: "next_day_type_disabled" };
        const lastCallResult = config.lastCallEnabled && lastCallActive
          ? isEligibleForLastCall(state, config, minutesLeft, playedToday)
          : { eligible: false, reason: "outside_last_call_window" };

        for (const [type, result] of [["next_day", nextDayResult], ["last_call", lastCallResult]] as const) {
          if (!result.eligible) continue;

          // expires_at: next_day is useful until the end of the current
          // game date (this region's next rollover); last_call's ceiling
          // is the REAL, exact regional cutoff — the same value, since
          // both are bounded by "this game date is still current."
          const expiresAt = clock.nextDailyRolloverAt;

          const { error: insertErr } = await supabase.from("notification_delivery_log").insert({
            user_id: userId,
            subscription_id: preferredSub.id,
            notification_type: type,
            game_date: clock.gameDate,
            region_id: regionId,
            scheduled_for: now.toISOString(),
            status: "queued",
            attempt_count: 0,
            next_attempt_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            dedupe_key: `${userId}:${type}:${clock.gameDate}:${regionId}`,
          });
          // A unique-constraint violation means a job for this
          // (user, type, game_date, region) already exists — expected,
          // safe, not an error.
          if (!insertErr) created++;
        }
      }
    }
  }

  // ── Phase B: claim & send ─────────────────────────────────────────────
  const { data: claimed, error: claimErr } = await supabase.rpc("claim_due_notification_jobs", { p_limit: CLAIM_BATCH_LIMIT });
  if (claimErr) return json({ error: "Claim failed", detail: claimErr.message, created }, 500);

  let sent = 0;
  let failedTemp = 0;
  let failedPermanent = 0;
  const details: Array<{ userId: string; type: string; result: string }> = [];

  for (const job of claimed ?? []) {
    const userId = job.user_id as string;
    const jobExpiresAt = job.expires_at ? new Date(job.expires_at as string) : null;

    const { data: activeSubs } = await supabase
      .from("push_subscriptions").select("id, endpoint, p256dh_key, auth_key, enabled, last_success_at, updated_at, created_at")
      .eq("user_id", userId).eq("enabled", true).is("revoked_at", null);

    const preferred = selectPreferredSubscription((activeSubs ?? []).map(toCandidate));
    const targetSub = (activeSubs ?? []).find((s) => s.id === preferred?.id);

    if (!targetSub) {
      await supabase.from("notification_delivery_log").update({
        status: "failed_permanent", next_attempt_at: null, failure_code: "no_active_subscription",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      failedPermanent++;
      continue;
    }

    const { data: gs } = await supabase.from("game_state").select("current_streak").eq("user_id", userId).maybeSingle();
    const currentStreak = Number(gs?.current_streak ?? 0);
    const type = job.notification_type as "next_day" | "last_call";
    const copy = type === "next_day"
      ? selectNextDayCopy(currentStreak, {
          title: String(settings.push_next_day_title ?? "Today's challenge is ready"),
          bodyStreak: String(settings.push_next_day_body_streak ?? ""),
          bodyNoStreak: String(settings.push_next_day_body_no_streak ?? ""),
        })
      : selectLastCallCopy(currentStreak, {
          titleStreak: String(settings.push_last_call_title_streak ?? ""),
          bodyStreak: String(settings.push_last_call_body_streak ?? ""),
          titleNoStreak: String(settings.push_last_call_title_no_streak ?? ""),
          bodyNoStreak: String(settings.push_last_call_body_no_streak ?? ""),
        });
    const route = ALLOWED_ROUTES.has(String(settings.push_click_route)) ? String(settings.push_click_route) : "/";
    const payload = buildPayload({ notificationId: job.id as string, type, title: copy.title, body: copy.body, route, gameDate: job.game_date as string });

    const outcome = await sendWebPush(vapid, { endpoint: targetSub.endpoint, p256dhKey: targetSub.p256dh_key, authKey: targetSub.auth_key }, payload);
    const nowIso = new Date().toISOString();

    if (outcome.ok) {
      await supabase.from("notification_delivery_log").update({
        status: "sent", attempted_at: nowIso, delivered_at: nowIso, next_attempt_at: null,
        subscription_id: targetSub.id, provider_status: outcome.providerStatus, updated_at: nowIso,
      }).eq("id", job.id);
      await supabase.from("push_subscriptions").update({ last_success_at: nowIso, failure_count: 0, updated_at: nowIso }).eq("id", targetSub.id);
      sent++;
      details.push({ userId, type, result: "sent" });
    } else if (outcome.permanent) {
      await supabase.from("notification_delivery_log").update({
        status: "failed_permanent", next_attempt_at: null, subscription_id: targetSub.id,
        provider_status: outcome.providerStatus, failure_code: outcome.failureCode, updated_at: nowIso,
      }).eq("id", job.id);
      await supabase.from("push_subscriptions").update({ enabled: false, revoked_at: nowIso, last_failure_at: nowIso, updated_at: nowIso }).eq("id", targetSub.id);
      failedPermanent++;
      details.push({ userId, type, result: "failed_permanent" });
    } else {
      const newAttemptCount = (job.attempt_count as number) + 1;
      const decision = computeNextAttempt(newAttemptCount, jobExpiresAt, new Date());
      await supabase.from("notification_delivery_log").update({
        status: "failed_temporary",
        attempt_count: newAttemptCount,
        next_attempt_at: decision.nextAttemptAt ? decision.nextAttemptAt.toISOString() : null,
        subscription_id: targetSub.id, provider_status: outcome.providerStatus, failure_code: outcome.failureCode,
        updated_at: nowIso,
      }).eq("id", job.id);
      await supabase.from("push_subscriptions").update({
        last_failure_at: nowIso, failure_count: ((targetSub as { failure_count?: number }).failure_count ?? 0) + 1, updated_at: nowIso,
      }).eq("id", targetSub.id);
      failedTemp++;
      details.push({ userId, type, result: decision.retry ? "failed_temporary_will_retry" : "failed_temporary_exhausted" });
    }
  }

  return json({
    ok: true, mode: gtSettings.mode, created, claimed: (claimed ?? []).length,
    sent, failedTemp, failedPermanent, details,
  });
});
