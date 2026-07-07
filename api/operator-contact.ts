import { verifySessionToken, readCookie, OPERATOR_COOKIE_NAME, isRateLimited } from '../server/operatorAuth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const sessionSecret = process.env.OPERATOR_SESSION_SECRET;
  const token = readCookie(req.headers.get('cookie'), OPERATOR_COOKIE_NAME);
  const authed = sessionSecret ? await verifySessionToken(token, sessionSecret) : false;
  if (!authed) {
    return new Response(JSON.stringify({ ok: false, reason: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(`contact:${ip}`)) {
    return new Response(JSON.stringify({ ok: false, reason: 'rate_limited' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Honeypot: real users never fill this in.
  if (typeof payload.company_website_confirm === 'string' && payload.company_website_confirm.length > 0) {
    // Pretend success to the bot, but never actually forward it.
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const webhookUrl = process.env.OPERATOR_CONTACT_WEBHOOK_URL;
  if (!webhookUrl) {
    // Real limitation, not a fake success — see AI_HANDOFF_NOTES.md.
    return new Response(JSON.stringify({ ok: false, reason: 'not_configured' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const forwarded = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'partners.survivethestreak.com/contact', submittedAt: new Date().toISOString(), ...payload }),
    });
    if (!forwarded.ok) {
      return new Response(JSON.stringify({ ok: false, reason: 'webhook_failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'webhook_error' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
