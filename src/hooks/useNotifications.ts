import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'telegram' | 'discord';

export interface NotificationPref {
  id:            string;
  channel:       NotificationChannel;
  enabled:       boolean;
  contact_value: string;
  verified:      boolean;
  code_sent_at:  string | null;
  verified_at:   string | null;
  updated_at:    string;
}

function notifUrl(path: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notifications${path}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export function useNotifications() {
  const [prefs, setPrefs]     = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(notifUrl('/prefs'), { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load preferences'); return; }
      setPrefs(data as NotificationPref[]);
    } catch {
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertChannel = useCallback(async (channel: NotificationChannel, contactValue: string) => {
    setError(null);
    try {
      const res = await fetch(notifUrl('/upsert'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ channel, contact_value: contactValue }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return false; }
      return true;
    } catch {
      setError('Failed to save');
      return false;
    }
  }, []);

  const sendCode = useCallback(async (channel: NotificationChannel, contactValue: string): Promise<{ dev_code?: string; provider_status?: string } | null> => {
    setError(null);
    try {
      const res = await fetch(notifUrl('/send-code'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ channel, contact_value: contactValue }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send code'); return null; }
      return data;
    } catch {
      setError('Failed to send code');
      return null;
    }
  }, []);

  const verifyCode = useCallback(async (channel: NotificationChannel, code: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(notifUrl('/verify'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ channel, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return false; }
      return true;
    } catch {
      setError('Verification failed');
      return false;
    }
  }, []);

  const toggleChannel = useCallback(async (channel: NotificationChannel, enabled: boolean): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(notifUrl('/toggle'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ channel, enabled }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update'); return false; }
      setPrefs((prev) =>
        prev.map((p) => (p.channel === channel ? { ...p, enabled } : p))
      );
      return true;
    } catch {
      setError('Failed to update');
      return false;
    }
  }, []);

  const getPref = useCallback(
    (channel: NotificationChannel) => prefs.find((p) => p.channel === channel) ?? null,
    [prefs],
  );

  return {
    prefs,
    loading,
    error,
    fetchPrefs,
    upsertChannel,
    sendCode,
    verifyCode,
    toggleChannel,
    getPref,
  };
}
