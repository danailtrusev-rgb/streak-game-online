// ─────────────────────────────────────────────────────────────────────────────
// Preview-hostname detection — shared between vite.config.ts (Node, at
// dev-server request time) and the operator client bundles (browser).
//
// This intentionally does NOT default to "preview" just because a hostname
// is unrecognized — per the spec, an unknown/unconfigured domain must not
// silently enable preview routing. Only a known dev/Bolt pattern, or an
// explicit VITE_ENABLE_PARTNER_PREVIEW=true, activates it.
// ─────────────────────────────────────────────────────────────────────────────

const PREVIEW_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /\.bolt\.host$/,
  /\.webcontainer-api\.io$/,
  /\.stackblitz\.io$/,
];

export function isPreviewHostname(hostname: string, explicitFlag: boolean): boolean {
  if (explicitFlag) return true;
  const h = hostname.toLowerCase();
  return PREVIEW_HOSTNAME_PATTERNS.some((re) => re.test(h));
}

export const PARTNER_PREVIEW_PREFIX = '/partner-preview';
