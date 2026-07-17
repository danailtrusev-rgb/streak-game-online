import { useEffect, useState } from 'react';
import { Crown, Plus } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import type { WinnerAnnouncement } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EMPTY: Omit<WinnerAnnouncement, 'id' | 'created_at'> = {
  event_game_id: 'saturday_main_event',
  event_date: new Date().toISOString().split('T')[0],
  display_name: '',
  result_summary: '',
  payout_cents: 0,
  share_text: '',
};

export default function AdminWinners() {
  const { fetchWinners, createWinner, loading, error } = useAdmin();
  const [winners, setWinners] = useState<WinnerAnnouncement[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = async () => {
    const data = await fetchWinners();
    if (data) setWinners(data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.display_name) return;
    setSaving(true);
    await createWinner(form);
    setSaving(false);
    setShowCreate(false);
    setForm({ ...EMPTY });
    setSaveMsg('Winner announced');
    await load();
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const eventLabel = (id: string) => {
    if (id === 'saturday_main_event') return 'Saturday Showdown';
    if (id === 'sunday_winners_event') return 'Sunday Crown';
    return id;
  };

  if (loading && !winners.length) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Winners</h2>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-[12px] text-moss-light">{saveMsg}</span>}
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 border border-torch-orange/30 px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-torch-ember hover:bg-torch-orange/5 transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2} /> New
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-xs text-death-glow">{error}</div>
      )}

      {showCreate && (
        <div className="border border-torch-orange/20 bg-torch-orange/5 px-4 py-4 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">Announce Winner</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Event</label>
              <select value={form.event_game_id} onChange={(e) => setForm((p) => ({ ...p, event_game_id: e.target.value }))} className="ritual-input w-full text-xs">
                <option value="saturday_main_event">Saturday Showdown</option>
                <option value="sunday_winners_event">Sunday Crown</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Event Date</label>
              <input type="date" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} className="ritual-input w-full text-xs" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Display Name</label>
              <input value={form.display_name} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} className="ritual-input w-full text-xs" placeholder="The Champion" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Payout (cents)</label>
              <input type="number" value={form.payout_cents} onChange={(e) => setForm((p) => ({ ...p, payout_cents: Number(e.target.value) }))} className="ritual-input w-full text-xs" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Result Summary</label>
              <input value={form.result_summary} onChange={(e) => setForm((p) => ({ ...p, result_summary: e.target.value }))} className="ritual-input w-full text-xs" placeholder="Won the Saturday Showdown..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Share Text</label>
              <input value={form.share_text} onChange={(e) => setForm((p) => ({ ...p, share_text: e.target.value }))} className="ritual-input w-full text-xs" placeholder="I won the Survive the Streak competition!" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={saving || !form.display_name} className="jungle-button px-6 py-2 text-xs">
              {saving ? 'Saving...' : 'Announce'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-[12px] text-bone-dark hover:text-bone-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {winners.length === 0 && (
          <div className="text-xs text-bone-faint py-4">No winners announced yet.</div>
        )}
        {winners.map((w) => (
          <div key={w.id} className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-bone">{w.display_name}</div>
                <div className="text-[11px] text-bone-faint mt-0.5">{eventLabel(w.event_game_id)} · {w.event_date}</div>
                {w.result_summary && (
                  <div className="text-[12px] text-bone-muted mt-1.5">{w.result_summary}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-sm font-bold text-torch-ember font-heading">
                  {(w.payout_cents / 100).toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-bone-faint">Credits</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
