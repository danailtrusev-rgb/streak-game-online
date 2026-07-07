import type { Plugin, ViteDevServer } from 'vite';
import { randomUUID } from 'node:crypto';
import {
  createSessionToken,
  verifySessionToken,
  isRateLimited,
} from '../server/operatorAuth';

// A separate cookie name from production (`ss_operator`) so a preview
// session can never be confused with — or accidentally satisfy a check
// meant for — the real production cookie.
const PREVIEW_COOKIE_NAME = 'ss_operator_preview';
const PREVIEW_SESSION_MS = 12 * 60 * 60 * 1000;

// Ephemeral secret generated once per dev-server process. Nothing preview
// sessions sign needs to survive a server restart, and this avoids ever
// needing a checked-in or shared signing secret for a non-production gate.
const previewSessionSecret = randomUUID() + randomUUID();

function readReqCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

// Relaxed cookie serialization for preview only — no `Secure` flag, since
// Bolt/local dev may be served over plain HTTP internally. This is called
// out explicitly wherever it's used; production uses the real
// server/operatorAuth.ts serializeCookie (which always sets Secure).
function serializePreviewCookie(value: string, maxAgeSeconds: number): string {
  return `${PREVIEW_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
function clearPreviewCookie(): string {
  return `${PREVIEW_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

async function readJsonBody(req: import('http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8') || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function installMiddleware(server: ViteDevServer) {
  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://internal');
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    // ── Dev-only session API (same paths the production Vercel functions
    //    use, so the client components need zero preview-specific code). ──
    if (pathname === '/api/operator-access' && method === 'POST') {
      const ip = (req.socket.remoteAddress ?? 'unknown');
      if (isRateLimited(`preview-access:${ip}`)) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, reason: 'rate_limited' }));
        return;
      }
      const previewCode = process.env.PARTNER_PREVIEW_CODE;
      if (!previewCode) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, reason: 'not_configured' }));
        return;
      }
      const body = await readJsonBody(req);
      if (body.code !== previewCode) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, reason: 'invalid_code' }));
        return;
      }
      const token = await createSessionToken(previewSessionSecret);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Set-Cookie', serializePreviewCookie(token, PREVIEW_SESSION_MS / 1000));
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/api/operator-session' && method === 'GET') {
      const token = readReqCookie(req.headers.cookie, PREVIEW_COOKIE_NAME);
      const valid = await verifySessionToken(token, previewSessionSecret);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ valid }));
      return;
    }

    if (pathname === '/api/operator-logout' && method === 'POST') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Set-Cookie', clearPreviewCookie());
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/api/operator-contact' && method === 'POST') {
      // Preview never actually forwards submissions anywhere — the
      // contact form correctly reports "not connected" in this
      // environment, matching how it behaves in production without a
      // configured webhook.
      res.statusCode = 501;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, reason: 'not_configured' }));
      return;
    }

    // ── Path-based routing for /partner-preview ──
    if (pathname === '/partner-preview' || pathname.startsWith('/partner-preview/')) {
      const looksLikeAsset = /\.[a-zA-Z0-9]+$/.test(pathname);
      if (!looksLikeAsset) {
        const token = readReqCookie(req.headers.cookie, PREVIEW_COOKIE_NAME);
        const authed = await verifySessionToken(token, previewSessionSecret);
        req.url = authed ? '/operator.html' : '/operator-gate.html';
      }
    }

    next();
  });
}

export function partnerPreviewPlugin(): Plugin {
  return {
    name: 'partner-preview-dev-routing',
    // Returning a function from configureServer defers registration until
    // after Vite's own internal middlewares are installed, but still before
    // its HTML-serving middleware — exactly where URL rewriting needs to happen.
    configureServer(server) {
      return () => installMiddleware(server);
    },
    configurePreviewServer(server) {
      return () => installMiddleware(server as unknown as ViteDevServer);
    },
  };
}
