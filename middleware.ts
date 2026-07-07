import { next } from '@vercel/edge';
import { verifySessionToken, readCookie, OPERATOR_COOKIE_NAME } from './server/operatorAuth';

export const config = {
  // Skip /api routes; everything else (including asset files) passes
  // through this function so hostname-based decisions can be made for both
  // page navigations and robots.txt/sitemap.xml requests. Real asset
  // requests are detected below (by file extension) and passed straight
  // through untouched.
  matcher: '/((?!api/).*)',
};

const REDIRECT_HOSTNAMES = [
  'surviveday30.com', 'www.surviveday30.com',
  'survive30days.com', 'www.survive30days.com',
];
const OPERATOR_HOSTNAMES = ['partners.survivethestreak.com', 'www.partners.survivethestreak.com'];

// Paths that must never reveal operator content on the player domain.
const PLAYER_BLOCKED_PATHS = ['/operators', '/operator', '/overview', '/deck', '/partner', '/partners', '/partner-preview', '/operator-preview.html', '/operator-preview'];

function isBlockedPlayerPath(pathname: string): boolean {
  return PLAYER_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const ASSET_PATTERN = /\.[a-zA-Z0-9]+$/; // e.g. /assets/x.js, /manifest.json, /icon-192.svg
// .html files are deliberately excluded from the "asset" bypass below —
// operator.html, operator-gate.html, and operator-preview.html must never
// be servable by directly requesting their filename on a hostname that
// shouldn't expose them; they should only ever be reached via the internal
// rewrite performed further down, or blocked outright.
function isPassthroughAsset(pathname: string): boolean {
  return ASSET_PATTERN.test(pathname) && !pathname.endsWith('.html');
}

/** Rewrites the response to serve a different static HTML file while keeping the browser's URL bar unchanged. */
function rewriteTo(path: string, req: Request, extraHeaders?: Record<string, string>): Response {
  const target = new URL(path, req.url);
  const headers = new Headers(extraHeaders);
  headers.set('x-middleware-rewrite', target.toString());
  return new Response(null, { headers });
}

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const host = url.hostname.toLowerCase();
  const isAsset = isPassthroughAsset(url.pathname);

  // 1. surviveday30.com / survive30days.com (+www) -> permanent redirect to
  //    survivethestreak.com, preserving path and query string.
  if (REDIRECT_HOSTNAMES.includes(host)) {
    const target = new URL(url.pathname + url.search, 'https://survivethestreak.com');
    return Response.redirect(target, 308);
  }

  // 2. partners.survivethestreak.com — private operator subdomain.
  if (OPERATOR_HOSTNAMES.includes(host)) {
    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    if (url.pathname === '/sitemap.xml') {
      return new Response('Not found', { status: 404 });
    }
    // Real build assets (JS/CSS/icons/manifest) — never rewrite these.
    if (isAsset) {
      return next({ headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } });
    }

    const sessionSecret = process.env.OPERATOR_SESSION_SECRET;
    const token = readCookie(req.headers.get('cookie'), OPERATOR_COOKIE_NAME);
    const authed = sessionSecret ? await verifySessionToken(token, sessionSecret) : false;
    const robotsHeader = { 'X-Robots-Tag': 'noindex, nofollow, noarchive' };

    if (!authed) {
      // No valid session: always show the gate bundle, regardless of the
      // requested path — this is what makes deep-linking around the gate
      // impossible even before any client JS runs.
      return rewriteTo('/operator-gate.html', req, robotsHeader);
    }

    // Valid session.
    if (url.pathname === '/') {
      return Response.redirect(new URL('/overview', url), 307);
    }
    // Any other path (including player-only paths like /play, /wallet,
    // /sys/admin, which simply don't exist on this bundle) serves the
    // protected operator bundle; its own router falls back to /overview.
    return rewriteTo('/operator.html', req, robotsHeader);
  }

  // 3. survivethestreak.com (the player domain) — and any other/local
  //    hostname during development.
  if (!isAsset && isBlockedPlayerPath(url.pathname)) {
    // Defense-in-depth even before client JS loads: never reveal that the
    // private partner subdomain exists.
    return Response.redirect(new URL('/', url), 307);
  }

  return next();
}
