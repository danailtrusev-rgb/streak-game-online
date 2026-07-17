// test-web-push
//
// Admin-only. Design note (see PROJECT_CHANGELOG.md "Admin settings"):
// this project's admin panel uses its own session mechanism
// (admin_sessions table + x-admin-session header — see supabase/functions
// /admin/index.ts), completely separate from player Supabase Auth. A
// test send needs a real subscription to deliver to, and subscriptions
// are owned by a player (auth.uid()), not an admin session. So this
// function requires BOTH a valid player JWT (Authorization header,
// proving "this is a real, currently logged-in device") AND a valid
// admin session (x-admin-session header, proving "the person using this
// device is a legitimate admin") — and only ever sends to THAT player's
// own active subscriptions. It never accepts an arbitrary target user ID
// from the request body, per "Do not allow an admin to freely enter
// another user ID and send arbitrary messages."
//
// Test sends never touch schedule-reactivation-notifications' dedupe
// logic or per-day limits — they're recorded with
// notification_type='test', which the delivery log's unique dedupe index
// explicitly excludes (see 20260714000000_*.sql).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { loadVapidConfig, sendWebPush, buildPayload } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-admin-session",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function validateAdminSession(supabase: ReturnType<typeof createClient>, sessionToken: string): Promise<string | null> {
  if (!sessionToken) return null;
  const { data } = await supabase.from("admin_sessions").select("username, expires_at").eq("id", sessionToken).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at as string) < new Date()) return null;
  return data.username as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const adminClient = createClient(supabaseUrl, serviceKey);

    const adminSessionToken = req.headers.get("x-admin-session") || "";
    const adminUsername = await validateAdminSession(adminClient, adminSessionToken);
    if (!adminUsername) return json({ error: "Unauthorized — admin session required" }, 401);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized — a logged-in device is required to receive the test" }, 401);

    const vapid = loadVapidConfig();
    if (!vapid) return json({ error: "VAPID not configured" }, 500);

    let body: { type?: "next_day" | "last_call" } = {};
    try { body = await req.json(); } catch { /* body is optional */ }
    const type = body.type === "last_call" ? "last_call" : "next_day";

    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("user_id", user.id)
      .eq("enabled", true)
      .is("revoked_at", null);

    if (!subs || subs.length === 0) {
      return json({ error: "No active subscription on this device — enable reminders first" }, 400);
    }

    const { data: gameDateData } = await adminClient.rpc("get_madrid_today");
    const gameDate = String(gameDateData ?? new Date().toISOString().slice(0, 10));

    const title = type === "last_call" ? "Test: Last-call reminder" : "Test: Next-day reminder";
    const body_ = type === "last_call"
      ? "This is a test of the last-call notification. No real cutoff applies."
      : "This is a test of the next-day reminder. No real challenge state applies.";

    const results = [];
    for (const sub of subs) {
      const { data: logRow } = await adminClient
        .from("notification_delivery_log")
        .insert({
          user_id: user.id, subscription_id: sub.id, notification_type: "test",
          game_date: gameDate, scheduled_for: new Date().toISOString(), status: "sending",
          dedupe_key: `test:${user.id}:${sub.id}:${Date.now()}`,
          payload_meta: { sent_by_admin: adminUsername, test_type: type },
        })
        .select("id").single();

      const payload = buildPayload({
        notificationId: logRow?.id ?? crypto.randomUUID(),
        type: "test", title, body: body_, route: "/", gameDate,
      });

      const outcome = await sendWebPush(vapid, { endpoint: sub.endpoint, p256dhKey: sub.p256dh_key, authKey: sub.auth_key }, payload);

      if (logRow) {
        await adminClient.from("notification_delivery_log").update({
          status: outcome.ok ? "sent" : (outcome.permanent ? "failed_permanent" : "failed_temporary"),
          attempted_at: new Date().toISOString(),
          delivered_at: outcome.ok ? new Date().toISOString() : null,
          provider_status: outcome.providerStatus,
          failure_code: outcome.ok ? null : outcome.failureCode,
          updated_at: new Date().toISOString(),
        }).eq("id", logRow.id);
      }

      results.push({ subscriptionId: sub.id, ...outcome });
    }

    return json({ ok: true, sentBy: adminUsername, results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
