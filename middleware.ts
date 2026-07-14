// Vercel Edge Middleware.
//
// The only job left here is redirecting the legacy marketing domains to the
// canonical player domain. All operator/partner routing, session gating,
// and multi-hostname bundle selection was removed when the operator site
// was extracted into its own independently hosted PHP project — see
// AI_HANDOFF_NOTES.md and PROJECT_CHANGELOG.md for details.
export const config = {
  matcher: '/(.*)',
};

const REDIRECT_HOSTNAMES = [
  'surviveday30.com', 'www.surviveday30.com',
  'survive30days.com', 'www.survive30days.com',
];

export default function middleware(req: Request) {
  const url = new URL(req.url);
  const host = url.hostname.toLowerCase();

  if (REDIRECT_HOSTNAMES.includes(host)) {
    const target = new URL(url.pathname + url.search, 'https://survivethestreak.com');
    return Response.redirect(target, 308);
  }

  // No explicit return = continue to normal static routing.
}
