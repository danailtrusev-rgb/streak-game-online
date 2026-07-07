import { isPreviewHostname, PARTNER_PREVIEW_PREFIX } from './previewHostname';

/**
 * Returns '/partner-preview' when running in the Bolt/local dev preview
 * environment, or '' (no prefix) on the real partners.survivethestreak.com
 * production host. Use this for every operator-site link, redirect, and
 * router `basename` instead of hardcoding either form.
 */
export function getPartnerBasePath(): string {
  try {
    const explicitFlag = import.meta.env.VITE_ENABLE_PARTNER_PREVIEW === 'true';
    if (isPreviewHostname(window.location.hostname, explicitFlag)) {
      return PARTNER_PREVIEW_PREFIX;
    }
  } catch {
    /* non-browser environment */
  }
  return '';
}

export function isPartnerPreviewActive(): boolean {
  return getPartnerBasePath() === PARTNER_PREVIEW_PREFIX;
}
