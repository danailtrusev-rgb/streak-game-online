import { createSessionToken, isRateLimited, serializeCookie, OPERATOR_COOKIE_NAME, SESSION_DURATION_MS } from '../server/operatorAuth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(`access:${ip}`)) {
    return new Response(JSON.stringify({ ok: false, reason: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const accessCode = process.env.OPERATOR_ACCESS_CODE;
  const sessionSecret = process.env.OPERATOR_SESSION_SECRET;

  if (!accessCode || !sessionSecret) {
    // Fail closed with a clear server-side signal if env vars aren't set yet.
    return new Response(JSON.stringify({ ok: false, reason: 'not_configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!body.code || body.code !== accessCode) {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_code' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await createSessionToken(sessionSecret);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': serializeCookie(OPERATOR_COOKIE_NAME, token, SESSION_DURATION_MS / 1000),
    },
  });
}
