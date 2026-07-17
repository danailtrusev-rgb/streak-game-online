// send-web-push
//
// Service-role/internal use only. Sends a pre-built payload to one or
// more subscriptions and returns structured results — it does not decide
// player eligibility (that's schedule-reactivation-notifications' job)
// and it does not read the delivery log or update it itself; callers are
// responsible for recording outcomes. Kept as its own function per the
// architecture's "preferred separation" even though
// schedule-reactivation-notifications calls the shared sendWebPush helper
// directly in-process for its own sends (no HTTP round-trip needed
// between two functions running in the same runtime family) — this
// function exists for any caller that needs delivery over HTTP
// specifically (e.g. test-web-push, or a future channel).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { loadVapidConfig, sendWebPush, type STSPushPayload } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface SendRequest {
  subscriptions: Array<{ endpoint: string; p256dhKey: string; authKey: string }>;
  payload: STSPushPayload;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return json({ error: "Unauthorized — internal use only" }, 401);
  }

  const vapid = loadVapidConfig();
  if (!vapid) return json({ error: "VAPID not configured" }, 500);

  let body: SendRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.subscriptions) || body.subscriptions.length === 0) {
    return json({ error: "No subscriptions supplied" }, 400);
  }
  if (!body.payload || typeof body.payload.title !== "string" || typeof body.payload.body !== "string") {
    return json({ error: "Invalid payload" }, 400);
  }

  const results = await Promise.all(
    body.subscriptions.map(async (sub) => {
      const outcome = await sendWebPush(vapid, sub, body.payload);
      return { endpoint: sub.endpoint, ...outcome };
    }),
  );

  return json({ ok: true, results });
});
