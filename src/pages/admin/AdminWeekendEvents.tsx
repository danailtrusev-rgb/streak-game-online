import { useEffect, useState } from 'react';
import { CalendarDays, Trophy, Crown } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import type { WeekendEventEntry, EcosystemKPIs } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminWeekendEvents() {
  const { fetchWeekendEvents, fetchEcosystemKPIs, finalizeEvent, loading, error } = useAdmin();
  const [entries, setEntries] = useState<WeekendEventEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [kpis, setKpis] = useState<EcosystemKPIs | null>(null);
  const [finalizeForm, setFinalizeForm] = useState<{
    eventGameId: string;
    winnerUserId: string;
    payoutCents: number;
    displayName: string;
  }>({ eventGameId: 'saturday_main_event', winnerUserId: '', payoutCents: 0, displayName: '' });
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

  const load = async () => {
    const [evData, kpiData] = await Promise.all([fetchWeekendEvents(), fetchEcosystemKPIs()]);
    if (evData) {
      setEntries(evData.entries ?? []);
      setCounts(evData.counts ?? {});
    }
    if (kpiData) setKpis(kpiData);
  };

  useEffect(() => { load(); }, []);

  const handleFinalize = async () => {
    if (!finalizeForm.winnerUserId || !finalizeForm.displayName) return;
    setFinalizing(true);
    const result = await finalizeEvent(
      finalizeForm.eventGameId,
      finalizeForm.winnerUserId,
      finalizeForm.payoutCents,
      finalizeForm.displayName,
    );
    setFinalizing(false);
    if (result !== null) {
      setFinalizeMsg('Event finalized successfully');
      await load();
      setTimeout(() => setFinalizeMsg(null), 3000);
    }
  };

  const satEntries = entries.filter((e) => e.event_game_id === 'saturday_main_event');
  const sunEntries = entries.filter((e) => e.event_game_id === 'sunday_winners_event');

  if (loading && !entries.length && !kpis) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Weekend Events</h2>
      </div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-xs text-death-glow">{error}</div>
      )}

      {kpis && (
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-3.5 w-3.5 text-torch-ember" strokeWidth={1.5} />
              <span className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">Saturday Qual</span>
            </div>
            <div className="text-xl font-bold text-bone font-heading">{kpis.saturday_qualified}</div>
            <div className="text-[9px] text-bone-faint mt-0.5">{kpis.saturday_entries} entered</div>
          </div>
          <div className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-3.5 w-3.5 text-torch-ember" strokeWidth={1.5} />
              <span className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">Sunday Qual</span>
            </div>
            <div className="text-xl font-bold text-bone font-heading">{kpis.sunday_qualified}</div>
            <div className="text-[9px] text-bone-faint mt-0.5">{kpis.sunday_entries} entered</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">
          Saturday Entries ({counts['saturday_main_event'] ?? satEntries.length})
        </div>
        {satEntries.length === 0 ? (
          <div className="text-xs text-bone-faint py-3">No entries yet</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {satEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between border border-moss-dark/10 px-3 py-2">
                <span className="text-[10px] text-bone-muted font-mono">{e.user_id.slice(0, 12)}…</span>
                <span className={`text-[9px] uppercase tracking-[0.1em] ${
                  e.result_status === 'completed' ? 'text-moss-light' : 'text-bone-faint'
                }`}>{e.result_status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">
          Sunday Entries ({counts['sunday_winners_event'] ?? sunEntries.length})
        </div>
        {sunEntries.length === 0 ? (
          <div className="text-xs text-bone-faint py-3">No entries yet</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sunEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between border border-moss-dark/10 px-3 py-2">
                <span className="text-[10px] text-bone-muted font-mono">{e.user_id.slice(0, 12)}…</span>
                <span className={`text-[9px] uppercase tracking-[0.1em] ${
                  e.result_status === 'completed' ? 'text-moss-light' : 'text-bone-faint'
                }`}>{e.result_status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-torch-orange/20 bg-torch-orange/5 px-4 py-4 space-y-3">
        <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint">Finalize Event</div>
        {finalizeMsg && (
          <div className="border border-moss-dark/30 px-3 py-2 text-xs text-moss-light">{finalizeMsg}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Event</label>
            <select
              value={finalizeForm.eventGameId}
              onChange={(e) => setFinalizeForm((p) => ({ ...p, eventGameId: e.target.value }))}
              className="ritual-input w-full text-xs"
            >
              <option value="saturday_main_event">Saturday</option>
              <option value="sunday_winners_event">Sunday</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Payout (cents)</label>
            <input
              type="number"
              value={finalizeForm.payoutCents}
              onChange={(e) => setFinalizeForm((p) => ({ ...p, payoutCents: Number(e.target.value) }))}
              className="ritual-input w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Winner User ID</label>
            <input
              value={finalizeForm.winnerUserId}
              onChange={(e) => setFinalizeForm((p) => ({ ...p, winnerUserId: e.target.value }))}
              className="ritual-input w-full text-xs font-mono"
              placeholder="uuid"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Display Name</label>
            <input
              value={finalizeForm.displayName}
              onChange={(e) => setFinalizeForm((p) => ({ ...p, displayName: e.target.value }))}
              className="ritual-input w-full text-xs"
              placeholder="The Champion"
            />
          </div>
        </div>
        <button
          onClick={handleFinalize}
          disabled={finalizing || !finalizeForm.winnerUserId || !finalizeForm.displayName}
          className="jungle-button px-6 py-2 text-xs"
        >
          {finalizing ? 'Finalizing...' : 'Finalize & Announce Winner'}
        </button>
      </div>
    </div>
  );
}
