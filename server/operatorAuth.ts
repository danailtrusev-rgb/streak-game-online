// ─────────────────────────────────────────────────────────────────────────────
// Server-only helpers for the operator access gate.
//
// IMPORTANT: this file must never be imported from src/ (client) code — it
// is only for files under /api. It reads secrets from process.env, never
// from VITE_-prefixed (client-exposed) environment variables.
//
// Required environment variables (set in your hosting provider, NOT in
// .env / VITE_ variables):
//   OPERATOR_ACCESS_CODE   — the real access code partners enter
//   OPERATOR_SESSION_SECRET — a long random string used to sign sessions
// ─────────────────────────────────────────────────────────────────────────────

export const OPERATOR_COOKIE_NAME = 'ss_operator';
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Creates a signed session token: `${expiresAtMs}.${hmacHex}` */
export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const sig = await hmac(secret, String(expiresAt));
  return `${expiresAt}.${sig}`;
}

/** Verifies a signed session token's signature and expiry. */
export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [expiresAtStr, sig] = token.split('.');
  if (!expiresAtStr || !sig) return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expectedSig = await hmac(secret, expiresAtStr);
  return timingSafeEqual(sig, expectedSig);
}

export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join('; ');
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

// ── Best-effort rate limiting ─────────────────────────────────────────────
// NOTE: this in-memory map only persists for the lifetime of a single
// serverless/edge instance. It resets on cold start and is NOT shared across
// concurrent instances, so it slows down casual brute-forcing but is not a
// substitute for a real distributed rate limiter (e.g. Upstash Redis) if
// stronger protection is needed later.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
