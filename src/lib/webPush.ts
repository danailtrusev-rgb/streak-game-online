// Pure Web Push browser-API helpers. No Supabase calls here — see
// useWebPush.ts for the hook that persists a subscription to the backend.

export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** True when the app is running installed/standalone (Home Screen on iOS, or any installed PWA). Web Push on iOS Safari requires this. */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mqStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS Safari's own non-standard flag for "launched from Home Screen".
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mqStandalone || iosStandalone);
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * iOS Safari only supports Web Push for an installed (Home Screen)
 * PWA — never in a normal browser tab, regardless of permission state.
 * This tells the UI when to show install instructions instead of an
 * Enable button.
 */
export function requiresHomeScreenInstall(): boolean {
  return isIOS() && !isStandaloneDisplayMode();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export interface SubscriptionKeys {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

function toSubscriptionKeys(sub: PushSubscription): SubscriptionKeys | null {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, p256dhKey: p256dh, authKey: auth };
}

/**
 * Requests browser notification permission. Must only ever be called
 * from within a real user-gesture handler (a click), never on page load
 * — see the pre-permission UI in StreakRemindersCard.tsx /
 * PrePermissionModal.tsx, which is the only caller.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

/** Subscribes the current service worker registration to Push, using the given VAPID public key. Returns null (does not throw) on any failure — caller decides how to surface it. */
export async function subscribeToPush(vapidPublicKey: string): Promise<SubscriptionKeys | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return toSubscriptionKeys(subscription);
  } catch {
    return null;
  }
}

/** Unsubscribes the current device's push subscription in the browser (does not touch the backend row — see useWebPush.ts, which calls this and then updates Supabase). */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return true;
    return await existing.unsubscribe();
  } catch {
    return false;
  }
}

export async function getCurrentSubscription(): Promise<SubscriptionKeys | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    return existing ? toSubscriptionKeys(existing) : null;
  } catch {
    return null;
  }
}

export function detectBrowserFamily(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return 'edge';
  if (/chrome|crios/i.test(ua)) return 'chrome';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari';
  return 'other';
}

export function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/win/i.test(ua)) return 'windows';
  if (/mac/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  return 'other';
}
