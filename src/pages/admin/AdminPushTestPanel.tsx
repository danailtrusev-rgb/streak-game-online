import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function pushTestUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-web-push`;
}

export default function AdminPushTestPanel() {
  const [sending, setSending] = useState(false);
  const [type, setType] = useState<'next_day' | 'last_call'>('next_day');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const playerToken = sessionData.session?.access_token;
      const adminSession = localStorage.getItem('admin_session') || '';

      if (!playerToken) {
        setResult({ ok: false, message: 'This browser has no active player session. Log in as a player on this device to receive a test push.' });
        return;
      }

      const res = await fetch(pushTestUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'x-admin-session': adminSession,
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || 'Test send failed.' });
        return;
      }
      const allOk = Array.isArray(data.results) && data.results.every((r: { ok: boolean }) => r.ok);
      setResult({
        ok: allOk,
        message: allOk
          ? `Sent to ${data.results.length} device(s).`
          : `Some sends failed: ${JSON.stringify(data.results)}`,
      });
    } catch {
      setResult({ ok: false, message: 'Network error sending test push.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-moss-dark/25 bg-ritual-surface/20 px-4 py-3">
      <div className="text-xs font-medium text-bone mb-1">Send Test Notification</div>
      <p className="text-[12px] text-bone-faint leading-relaxed mb-3">
        Sends to this device's own subscription only (the one currently logged in as a player in this browser). Test sends are labeled as tests and never affect a real player's daily notification limit.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'next_day' | 'last_call')}
          className="ritual-input text-xs font-mono"
        >
          <option value="next_day">Next-Day Copy</option>
          <option value="last_call">Last-Call Copy</option>
        </select>
        <button
          onClick={send}
          disabled={sending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-torch-ember/40 bg-torch-ember/10 text-torch-ember hover:bg-torch-ember/20 disabled:opacity-50"
        >
          <Send className="h-3 w-3" strokeWidth={1.5} />
          {sending ? 'Sending…' : 'Send Test'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 text-[12px] ${result.ok ? 'text-moss-light' : 'text-death-glow'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
