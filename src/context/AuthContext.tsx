import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { PlayerState } from '../lib/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  playerState: PlayerState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  upgradeAccount: (email: string, password: string) => Promise<{ error: string | null }>;
  sendEmailUpgradeCode: (email: string) => Promise<{ error: string | null; devCode?: string; code?: string }>;
  verifyEmailUpgradeCode: (email: string, code: string) => Promise<{ error: string | null }>;
  completeEmailUpgrade: (email: string, password?: string) => Promise<{ error: string | null }>;
  upgradeWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  upgradeWithOAuth: (provider: 'google' | 'facebook') => Promise<{ error: string | null }>;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  playerState: null,
  loading: true,
  error: null,
  refresh: async () => {},
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  upgradeAccount: async () => ({ error: null }),
  sendEmailUpgradeCode: async () => ({ error: null }),
  verifyEmailUpgradeCode: async () => ({ error: null }),
  completeEmailUpgrade: async () => ({ error: null }),
  upgradeWithPhone: async () => ({ error: null }),
  verifyPhoneOtp: async () => ({ error: null }),
  upgradeWithOAuth: async () => ({ error: null }),
  isGuest: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerState = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_my_state');
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setPlayerState(data as PlayerState);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    await fetchPlayerState();
  }, [fetchPlayerState]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: signInError.message };
    await fetchPlayerState();
    return { error: null };
  }, [fetchPlayerState]);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setPlayerState(null);
    setSession(null);
  }, []);

  const upgradeAccount = useCallback(async (_email: string, password: string): Promise<{ error: string | null }> => {
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) return { error: updateError.message };
    await fetchPlayerState();
    return { error: null };
  }, [fetchPlayerState]);

  const edgeFnUrl = (path: string) =>
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-upgrade/${path}`;

  const edgeHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session: s } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };
  }, []);

  const sendEmailUpgradeCode = useCallback(async (email: string): Promise<{ error: string | null; devCode?: string; code?: string }> => {
    try {
      const resp = await fetch(edgeFnUrl('send-code'), {
        method: 'POST',
        headers: await edgeHeaders(),
        body: JSON.stringify({ email }),
      });
      const json = await resp.json();
      if (!resp.ok) return { error: json.error ?? 'Failed to send code', code: json.code };
      return { error: null, devCode: json.devCode };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  }, [edgeHeaders]);

  const verifyEmailUpgradeCode = useCallback(async (email: string, code: string): Promise<{ error: string | null }> => {
    try {
      const resp = await fetch(edgeFnUrl('verify-code'), {
        method: 'POST',
        headers: await edgeHeaders(),
        body: JSON.stringify({ email, code }),
      });
      const json = await resp.json();
      if (!resp.ok) return { error: json.error ?? 'Verification failed' };
      return { error: null };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  }, [edgeHeaders]);

  const completeEmailUpgrade = useCallback(async (email: string, password?: string): Promise<{ error: string | null }> => {
    try {
      const resp = await fetch(edgeFnUrl('complete'), {
        method: 'POST',
        headers: await edgeHeaders(),
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      if (!resp.ok) return { error: json.error ?? 'Upgrade failed' };
      await supabase.auth.refreshSession();
      await fetchPlayerState();
      return { error: null };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  }, [edgeHeaders, fetchPlayerState]);

  // Send OTP to phone for upgrade
  const upgradeWithPhone = useCallback(async (phone: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  // Verify phone OTP
  const verifyPhoneOtp = useCallback(async (phone: string, token: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' });
    if (error) return { error: error.message };
    await fetchPlayerState();
    return { error: null };
  }, [fetchPlayerState]);

  // OAuth upgrade (Google / Facebook) — preserves guest session via linkIdentity
  const upgradeWithOAuth = useCallback(async (provider: 'google' | 'facebook'): Promise<{ error: string | null }> => {
    // linkIdentity links the OAuth identity to the existing guest account
    const { error } = await supabase.auth.linkIdentity({ provider });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const initAuth = useCallback(async () => {
    try {
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession) {
        setSession(existingSession);
        await fetchPlayerState();
        setLoading(false);
        return;
      }

      const guestId  = crypto.randomUUID();
      const password = crypto.randomUUID();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `${guestId}@survive.local`,
        password,
        options: { data: { guest_id: guestId } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (signUpData.session) {
        setSession(signUpData.session);
        await fetchPlayerState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  }, [fetchPlayerState]);

  useEffect(() => {
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT') {
        // Session is gone — clear state then provision a fresh guest session
        setSession(null);
        setPlayerState(null);
        (async () => {
          const guestId  = crypto.randomUUID();
          const password = crypto.randomUUID();
          const { data, error } = await supabase.auth.signUp({
            email: `${guestId}@survive.local`,
            password,
            options: { data: { guest_id: guestId } },
          });
          if (!error && data.session) {
            setSession(data.session);
            const { data: ps } = await supabase.rpc('get_my_state');
            if (ps) setPlayerState(ps as PlayerState);
          }
        })();
        return;
      }
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, [initAuth]);

  const isGuest = !!(session?.user?.email?.endsWith('@survive.local'));

  return (
    <AuthContext.Provider value={{
      session, playerState, loading, error, refresh,
      signIn, signOut,
      upgradeAccount,
      sendEmailUpgradeCode, verifyEmailUpgradeCode, completeEmailUpgrade,
      upgradeWithPhone, verifyPhoneOtp,
      upgradeWithOAuth,
      isGuest,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
