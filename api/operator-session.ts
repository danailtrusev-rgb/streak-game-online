import { verifySessionToken, readCookie, OPERATOR_COOKIE_NAME } from '../server/operatorAuth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const sessionSecret = process.env.OPERATOR_SESSION_SECRET;
  if (!sessionSecret) {
    return new Response(JSON.stringify({ valid: false, reason: 'not_configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = readCookie(req.headers.get('cookie'), OPERATOR_COOKIE_NAME);
  const valid = await verifySessionToken(token, sessionSecret);

  return new Response(JSON.stringify({ valid }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
