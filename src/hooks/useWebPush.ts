import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  isWebPushSupported, requiresHomeScreenInstall, requestNotificationPermission,
  subscribeToPush, unsubscribeFromPush, getCurrentSubscription,
  detectBrowserFamily, detectPlatform,
} from '../lib/webPush';

export interface NotificationPreferences {
  push_enabled: boolean;
  next_day_enabled: boolean;
  last_call_enabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  push_enabled: false,
  next_day_enabled: true,
  last_call_enabled: true,
};

export function useWebPush() {
  const { playerState } = useAuth();
  const userId = playerState?.user?.id;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = isWebPushSupported();
  const needsHomeScreenInstall = requiresHomeScreenInstall();

  const refreshStatus = useCallback(async () => {
    if (!supported) { setPermission('unsupported'); return; }
    setPermission(Notification.permission);
    const current = await getCurrentSubscription();
    setSubscribed(Boolean(current));
  }, [supported]);

  const fetchPrefs = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notification_preferences')
      .select('push_enabled, next_day_enabled, last_call_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) setPrefs(data as NotificationPreferences);
  }, [userId]);

  useEffect(() => {
    refreshStatus();
    fetchPrefs();
  }, [refreshStatus, fetchPrefs]);

  /**
   * The one and only place `Notification.requestPermission()` is called
   * from. Must only ever be invoked from a real click handler, after a
   * pre-permission screen — never automatically. See
   * PrePermissionModal.tsx / StreakRemindersCard.tsx, the only callers.
   */
  const enableReminders = useCallback(async (): Promise<boolean> => {
    if (!supported || needsHomeScreenInstall || !userId) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== 'granted') {
        // Denied or dismissed — never re-prompt automatically. Keep STS
        // preference state consistent with the real browser permission.
        return false;
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapidKey) { setError('Push is not configured on this deployment.'); return false; }

      const keys = await subscribeToPush(vapidKey);
      if (!keys) { setError('Could not create a push subscription.'); return false; }

      // Registration goes through a server-side RPC, not a direct client
      // upsert — this safely handles the case where this exact browser
      // endpoint already belongs to a different STS account (e.g. a
      // previous player on a shared device who never unsubscribed): the
      // RPC reassigns ownership to whoever is currently authenticated,
      // atomically, without exposing the previous owner. See
      // supabase/migrations/20260714040000_*.sql.
      const { error: registerErr } = await supabase.rpc('register_push_subscription', {
        p_endpoint: keys.endpoint,
        p_p256dh: keys.p256dhKey,
        p_auth: keys.authKey,
        p_user_agent: navigator.userAgent,
        p_browser_family: detectBrowserFamily(),
        p_platform: detectPlatform(),
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (registerErr) { setError('Could not save subscription.'); return false; }

      const { error: prefErr } = await supabase.from('notification_preferences').upsert({
        user_id: userId,
        push_enabled: true,
        next_day_enabled: true,
        last_call_enabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (prefErr) { setError('Could not save preferences.'); return false; }

      setSubscribed(true);
      setPrefs({ push_enabled: true, next_day_enabled: true, last_call_enabled: true });
      return true;
    } finally {
      setLoading(false);
    }
  }, [supported, needsHomeScreenInstall, userId]);

  /** Disables STS delivery on this device without touching browser permission — the player can re-enable later without re-granting permission. */
  const disableCurrentDevice = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setLoading(true);
    try {
      const current = await getCurrentSubscription();
      if (current) {
        await supabase.from('push_subscriptions')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId).eq('endpoint', current.endpoint);
      }
      await unsubscribeFromPush();
      setSubscribed(false);
      return true;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /** Disables all STS push delivery for this player (every device), without touching this device's browser permission. */
  const disableAllNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const { error: err } = await supabase.from('notification_preferences')
      .update({ push_enabled: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (err) { setError('Could not update preferences.'); return false; }
    setPrefs((p) => ({ ...p, push_enabled: false }));
    return true;
  }, [userId]);

  const updatePreference = useCallback(async (key: 'next_day_enabled' | 'last_call_enabled', value: boolean): Promise<boolean> => {
    if (!userId) return false;
    const { error: err } = await supabase.from('notification_preferences')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (err) { setError('Could not update preference.'); return false; }
    setPrefs((p) => ({ ...p, [key]: value }));
    return true;
  }, [userId]);

  return {
    supported,
    needsHomeScreenInstall,
    permission,
    subscribed,
    prefs,
    loading,
    error,
    refreshStatus,
    enableReminders,
    disableCurrentDevice,
    disableAllNotifications,
    updatePreference,
  };
}
