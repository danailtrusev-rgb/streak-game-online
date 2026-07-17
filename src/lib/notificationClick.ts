import { supabase } from './supabase';

/**
 * Call once on app mount (see App.tsx). Reads `?notification=<id>` from
 * the current URL (the route the service worker's notificationclick
 * handler opened), and records the click via the server-validated RPC —
 * the identifier is never trusted client-side; record_notification_click
 * only updates a row that both exists and belongs to the calling user.
 * Strips the query params afterward so they don't linger in the URL bar
 * or get bookmarked/shared with someone else.
 */
export async function recordNotificationClickFromUrl(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const notificationId = params.get('notification');
  if (!notificationId) return;

  try {
    await supabase.rpc('record_notification_click', { p_notification_id: notificationId });
  } catch {
    // Non-fatal — a failed click-record must never block the player from
    // using the app normally.
  } finally {
    params.delete('notification');
    params.delete('type');
    const cleanSearch = params.toString();
    const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
  }
}
