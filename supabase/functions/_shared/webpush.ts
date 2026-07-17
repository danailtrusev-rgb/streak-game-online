// Shared Web Push sending helper — used by send-web-push and test-web-push.
//
// Library choice: npm:web-push@3 (https://github.com/web-push-libs/web-push).
// This is the standard, widely-used, actively-maintained library for VAPID
// JWT signing and RFC 8291 ("aes128gcm") payload encryption. Supabase Edge
// Functions run on Deno, which supports `npm:` specifiers for npm-published
// packages — this is a documented, current Supabase Edge Functions
// capability, not a custom shim. IMPORTANT: this has not been executed in
// this environment (no Deno runtime available here) — verify the import
// resolves and a real send succeeds against a real Supabase project before
// relying on it. If `npm:web-push` does not resolve in the actual deployed
// runtime, the documented fallback is a Deno-native VAPID/Web-Push
// implementation using the Web Crypto API directly (more code, no npm
// dependency) — not implemented in this pass; flagged in
// PROJECT_CHANGELOG.md "Known limitations".
//
// Never hand-roll unencrypted push payload delivery — every message sent
// through this module is encrypted per RFC 8291 by the web-push library
// itself; there is no "send plaintext" path here.

import webpush from "npm:web-push@3.6.7";

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string; // "mailto:..."
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export interface STSPushPayload {
  notificationId: string;
  type: "next_day" | "last_call" | "test";
  title: string;
  body: string;
  route: string;
  tag: string;
  gameDate: string;
}

export type SendOutcome =
  | { ok: true; providerStatus: string }
  | { ok: false; permanent: boolean; providerStatus: string; failureCode: string };

export function loadVapidConfig(): VapidConfig | null {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/**
 * Sends one encrypted Web Push message to one subscription. Never throws —
 * always returns a structured outcome so the caller can update the
 * delivery log and subscription health without a try/catch at every call
 * site. Distinguishes permanent failures (expired/gone subscription —
 * disable it, don't retry) from temporary ones (network/5xx — safe to
 * retry within the notification's useful window).
 */
export async function sendWebPush(
  vapid: VapidConfig,
  sub: PushSubscriptionKeys,
  payload: STSPushPayload,
): Promise<SendOutcome> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
  };

  try {
    const result = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { ok: true, providerStatus: String(result.statusCode ?? 201) };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 404/410 = the push service has confirmed this endpoint no longer
    // exists (expired, unsubscribed, or the browser/OS revoked it) — this
    // is the standard permanent-failure signal for Web Push and must not
    // be retried; the subscription should be disabled.
    const permanent = statusCode === 404 || statusCode === 410;
    return {
      ok: false,
      permanent,
      providerStatus: String(statusCode ?? "unknown"),
      failureCode: err instanceof Error ? err.message.slice(0, 200) : "unknown_error",
    };
  }
}

/** Builds the actual payload sent over the wire — never includes wallet, cashout, or other sensitive data. Route is validated against an allow-list by the caller before this is ever constructed. */
export function buildPayload(input: {
  notificationId: string;
  type: STSPushPayload["type"];
  title: string;
  body: string;
  route: string;
  gameDate: string;
}): STSPushPayload {
  return {
    notificationId: input.notificationId,
    type: input.type,
    title: input.title,
    body: input.body,
    route: input.route,
    tag: `sts-${input.type}-${input.gameDate}`,
    gameDate: input.gameDate,
  };
}
