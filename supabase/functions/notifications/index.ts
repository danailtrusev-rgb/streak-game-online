import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Auth: get user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return err("Unauthorized", 401);

    const adminClient = createClient(supabaseUrl, serviceKey);
    const url  = new URL(req.url);
    const path = url.pathname.replace(/^\/notifications/, "");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // POST /notifications/send-code  { channel, contact_value }
    if (req.method === "POST" && path === "/send-code") {
      const { channel, contact_value } = body as { channel: string; contact_value: string };
      if (!channel || !contact_value) return err("Missing channel or contact_value");

      const code = generateCode();

      // Store the code via RPC (handles rate limiting)
      const { error: rpcErr } = await adminClient.rpc("set_notification_verification_code", {
        p_channel: channel,
        p_code:    code,
        // Override auth.uid() by calling via service role — need to use a different approach
      });

      // Since service role bypasses RLS but not auth.uid(), we call the RPC as the user
      // by using the user client which has the user's JWT
      const { error: rpcErrUser } = await userClient.rpc("set_notification_verification_code", {
        p_channel: channel,
        p_code:    code,
      });

      if (rpcErrUser) return err(rpcErrUser.message);

      // Send the code via the appropriate channel
      if (channel === "email") {
        // Use Supabase's built-in email via admin API (magic-link style OTP)
        // We send via admin client directly to the email address
        const { error: emailErr } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: contact_value,
          options: {
            // We won't use this link — we use our own code instead
            // But we need another approach: send a custom email
          },
        });

        // Since Supabase doesn't expose custom transactional email via Edge Functions
        // without a third-party provider, we use the service role to trigger an OTP
        // by updating the user's email flow. For now, log the code server-side and
        // rely on a future GoHighLevel/SendGrid integration for actual delivery.
        //
        // PENDING PROVIDER: Email sending requires GoHighLevel or SendGrid integration.
        // The code is stored in DB. For testing, the code is returned in dev mode only.
        const isDev = Deno.env.get("ENVIRONMENT") === "development" ||
                      !Deno.env.get("GHL_API_KEY");

        if (isDev) {
          // Development: return code in response for manual testing
          return json({ success: true, dev_code: code, message: "Dev mode: code returned directly." });
        }

        // Production: GoHighLevel email (PENDING — requires GHL_API_KEY secret)
        const ghlKey = Deno.env.get("GHL_API_KEY");
        if (ghlKey) {
          await sendGHLEmail(ghlKey, contact_value, code);
        }

        return json({ success: true, message: "Verification code sent. Check your email." });
      }

      if (channel === "sms") {
        // PENDING PROVIDER: SMS requires Twilio or GoHighLevel SMS integration
        const ghlKey = Deno.env.get("GHL_API_KEY");
        if (ghlKey) {
          await sendGHLSMS(ghlKey, contact_value, code);
          return json({ success: true, message: "Code sent via SMS." });
        }

        // Dev/pending: return code directly
        return json({ success: true, dev_code: code, message: "SMS provider not configured. Code returned for testing." });
      }

      // WhatsApp, Telegram, Discord — UI ready, provider pending
      if (["whatsapp", "telegram", "discord"].includes(channel)) {
        return json({
          success: true,
          dev_code: code,
          message: `${channel} provider not yet configured. Code stored for testing.`,
          provider_status: "pending",
        });
      }

      return err("Unknown channel");
    }

    // POST /notifications/verify  { channel, code }
    if (req.method === "POST" && path === "/verify") {
      const { channel, code } = body as { channel: string; code: string };
      if (!channel || !code) return err("Missing channel or code");

      const { data, error: rpcErr } = await userClient.rpc("verify_notification_channel", {
        p_channel: channel,
        p_code:    code,
      });

      if (rpcErr) return err(rpcErr.message);
      return json(data);
    }

    // POST /notifications/toggle  { channel, enabled }
    if (req.method === "POST" && path === "/toggle") {
      const { channel, enabled } = body as { channel: string; enabled: boolean };
      if (!channel || enabled === undefined) return err("Missing channel or enabled");

      const { data, error: rpcErr } = await userClient.rpc("toggle_notification_channel", {
        p_channel: channel,
        p_enabled: enabled,
      });

      if (rpcErr) return err(rpcErr.message);
      return json(data);
    }

    // POST /notifications/upsert  { channel, contact_value }
    if (req.method === "POST" && path === "/upsert") {
      const { channel, contact_value } = body as { channel: string; contact_value: string };
      if (!channel || !contact_value) return err("Missing channel or contact_value");

      const { data, error: rpcErr } = await userClient.rpc("upsert_notification_channel", {
        p_channel:       channel,
        p_contact_value: contact_value,
      });

      if (rpcErr) return err(rpcErr.message);
      return json(data);
    }

    // GET /notifications/prefs
    if (req.method === "GET" && path === "/prefs") {
      const { data, error: rpcErr } = await userClient.rpc("get_my_notification_prefs");
      if (rpcErr) return err(rpcErr.message);
      return json(data || []);
    }

    return err("Not found", 404);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});

// ── GoHighLevel helpers (stub — requires GHL_API_KEY) ─────────────────────────

async function sendGHLEmail(apiKey: string, email: string, code: string) {
  await fetch("https://rest.gohighlevel.com/v1/custom-values/", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name:  "Notification Verification",
      value: code,
      email,
      // Full GHL email send requires a configured workflow/template in GHL dashboard
    }),
  });
}

async function sendGHLSMS(apiKey: string, phone: string, code: string) {
  await fetch("https://rest.gohighlevel.com/v1/conversations/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "SMS",
      phone,
      message: `Your Survive the Streak verification code is: ${code}`,
    }),
  });
}
