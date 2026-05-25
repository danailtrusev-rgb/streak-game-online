import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400, code?: string) {
  return new Response(JSON.stringify({ error: message, ...(code ? { code } : {}) }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${salt}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const token = authHeader.slice(7);

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

/**
 * Reliably check if an email is already registered to any auth user.
 * Uses the check_email_registered DB function (SECURITY DEFINER) instead of
 * listUsers() pagination, which can miss users or fail under load.
 *
 * Returns: { registered: boolean, ownerId: string | null }
 */
async function checkEmailRegistered(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<{ registered: boolean; ownerId: string | null }> {
  const { data, error } = await adminClient.rpc("check_email_registered", {
    p_email: email.toLowerCase().trim(),
  });

  if (error) {
    console.error("[account-upgrade] check_email_registered RPC error:", error);
    // Fall back to listUsers as a safety net
    const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (!listData) return { registered: false, ownerId: null };
    const match = listData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase() ||
             (u.email_change && u.email_change.toLowerCase() === email.toLowerCase()),
    );
    return match ? { registered: true, ownerId: match.id } : { registered: false, ownerId: null };
  }

  // RPC returns an array of rows; empty = not found
  if (!data || data.length === 0) return { registered: false, ownerId: null };
  const row = data[0];
  return { registered: row.is_registered, ownerId: row.owner_id ?? null };
}

async function sendEmailCode(toEmail: string, code: string): Promise<{ sent: boolean; devCode?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const isDev = Deno.env.get("ENVIRONMENT") === "development" || !resendKey;

  if (isDev) {
    console.log(`[account-upgrade] DEV MODE: Verification code for ${toEmail} is ${code}`);
    return { sent: false, devCode: code };
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@survive.gg",
      to: toEmail,
      subject: "Your Survive verification code",
      html: `<p>Your verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>This code expires in 15 minutes.</p>`,
      text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
    }),
  });

  return { sent: resp.ok };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/account-upgrade/, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── POST /send-code (also accepts legacy path) ───────────────────────────
    if ((path === "/send-code" || path === "/send-email-upgrade-code") && req.method === "POST") {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse("Unauthorized", 401);

      const body = await req.json();
      const email: string = (body.email ?? "").trim().toLowerCase();

      if (!email.includes("@") || !email.includes(".") || email.length < 5) {
        return errorResponse("Invalid email address");
      }

      if (email.endsWith("@survive.local")) {
        return errorResponse("Invalid email address");
      }

      // ── Reliable email existence check via DB function ─────────────────────
      const { registered, ownerId } = await checkEmailRegistered(adminClient, email);

      if (registered) {
        if (ownerId === userId) {
          // Current user already owns this email — they're already upgraded
          return errorResponse(
            "This email is already linked to your account.",
            400,
            "ACCOUNT_ALREADY_UPGRADED",
          );
        }
        // Email belongs to a different user
        return errorResponse(
          "This email is already registered. Please log in instead.",
          400,
          "EMAIL_ALREADY_EXISTS",
        );
      }

      // ── Check resend throttle ──────────────────────────────────────────────
      const { data: existing } = await adminClient
        .from("account_upgrade_verifications")
        .select("resend_available_at, verified_at")
        .eq("user_id", userId)
        .eq("channel", "email")
        .maybeSingle();

      if (existing?.verified_at) {
        return errorResponse("Email already verified");
      }

      if (existing?.resend_available_at) {
        const resendAt = new Date(existing.resend_available_at);
        if (resendAt > new Date()) {
          const secondsLeft = Math.ceil((resendAt.getTime() - Date.now()) / 1000);
          return errorResponse(`Resend not available yet. Try again in ${secondsLeft} seconds.`);
        }
      }

      const code = generateCode();
      const salt = crypto.randomUUID();
      const codeHash = await hashCode(code, salt);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      const resendAvailableAt = new Date(now.getTime() + 2 * 60 * 1000);

      const { error: upsertErr } = await adminClient
        .from("account_upgrade_verifications")
        .upsert({
          user_id: userId,
          channel: "email",
          target_value: email,
          code_hash: `${salt}:${codeHash}`,
          expires_at: expiresAt.toISOString(),
          resend_available_at: resendAvailableAt.toISOString(),
          attempts: 0,
          verified_at: null,
        }, { onConflict: "user_id,channel" });

      if (upsertErr) {
        console.error("[account-upgrade] upsert error:", upsertErr);
        return errorResponse("Failed to store verification code", 500);
      }

      const { sent, devCode } = await sendEmailCode(email, code);
      const response: Record<string, unknown> = { ok: true, sent };
      if (devCode !== undefined) response.devCode = devCode;

      return jsonResponse(response);
    }

    // ── POST /verify-code ────────────────────────────────────────────────────
    if ((path === "/verify-code" || path === "/verify-email-upgrade-code") && req.method === "POST") {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse("Unauthorized", 401);

      const body = await req.json();
      const code: string = (body.code ?? "").trim();
      const email: string = (body.email ?? "").trim().toLowerCase();

      if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        return errorResponse("Invalid code format");
      }

      const { data: row, error: fetchErr } = await adminClient
        .from("account_upgrade_verifications")
        .select("*")
        .eq("user_id", userId)
        .eq("channel", "email")
        .maybeSingle();

      if (fetchErr || !row) return errorResponse("No pending verification found");
      if (row.target_value !== email) return errorResponse("Email does not match the pending verification");
      if (row.verified_at) return errorResponse("Code already verified");

      if (new Date(row.expires_at) < new Date()) {
        return errorResponse("Verification code has expired. Please request a new one.");
      }

      if (row.attempts >= 5) {
        return errorResponse("Too many failed attempts. Please request a new code.");
      }

      const [salt, storedHash] = (row.code_hash as string).split(":");
      const submittedHash = await hashCode(code, salt);

      if (submittedHash !== storedHash) {
        await adminClient
          .from("account_upgrade_verifications")
          .update({ attempts: row.attempts + 1 })
          .eq("user_id", userId)
          .eq("channel", "email");

        const attemptsLeft = 4 - row.attempts;
        if (attemptsLeft <= 0) {
          return errorResponse("Too many failed attempts. Please request a new code.");
        }
        return errorResponse(`Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`);
      }

      const { error: verifyErr } = await adminClient
        .from("account_upgrade_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("channel", "email");

      if (verifyErr) return errorResponse("Failed to mark verification", 500);

      return jsonResponse({ ok: true, verified: true });
    }

    // ── POST /complete ───────────────────────────────────────────────────────
    if ((path === "/complete" || path === "/complete-email-upgrade") && req.method === "POST") {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse("Unauthorized", 401);

      const body = await req.json();
      const email: string = (body.email ?? "").trim().toLowerCase();
      const password: string | undefined = body.password;

      if (!email) return errorResponse("Email required");

      const { data: row, error: fetchErr } = await adminClient
        .from("account_upgrade_verifications")
        .select("*")
        .eq("user_id", userId)
        .eq("channel", "email")
        .maybeSingle();

      if (fetchErr || !row) return errorResponse("No verified upgrade found");
      if (!row.verified_at) return errorResponse("Email not yet verified");
      if (row.target_value !== email) return errorResponse("Email mismatch");

      // Double-check email not taken by another user (race condition guard)
      const { registered, ownerId } = await checkEmailRegistered(adminClient, email);
      if (registered && ownerId !== userId) {
        return errorResponse(
          "This email is already registered. Please log in instead.",
          400,
          "EMAIL_ALREADY_EXISTS",
        );
      }

      const updatePayload: { email: string; email_confirm: boolean; password?: string } = {
        email,
        email_confirm: true,
      };
      if (password && password.length >= 8) {
        updatePayload.password = password;
      }

      const { data: updatedUser, error: updateErr } = await adminClient.auth.admin.updateUserById(userId, updatePayload);

      if (updateErr || !updatedUser) {
        console.error("[account-upgrade] admin.updateUserById error:", updateErr);
        return errorResponse(updateErr?.message ?? "Failed to update account", 500);
      }

      await adminClient
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          channel: "email",
          contact_value: email,
          verified: true,
          verified_at: new Date().toISOString(),
        }, { onConflict: "user_id,channel" });

      await adminClient
        .from("account_upgrade_verifications")
        .delete()
        .eq("user_id", userId)
        .eq("channel", "email");

      return jsonResponse({ ok: true, userId });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    console.error("[account-upgrade] unhandled error:", err);
    return errorResponse("Internal server error", 500);
  }
});
