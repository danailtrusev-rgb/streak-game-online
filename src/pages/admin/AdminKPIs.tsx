import { useEffect, useState } from 'react';
import { BarChart3, Trophy, RefreshCw } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { formatCents } from '../../lib/constants';
import type { AdminKPIs as AdminKPIsType, EcosystemKPIs } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminKPIs() {
  const { fetchKPIs, fetchEcosystemKPIs, loading, error } = useAdmin();
  const [kpis, setKpis] = useState<AdminKPIsType | null>(null);
  const [ecoKpis, setEcoKpis] = useState<EcosystemKPIs | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const [core, eco] = await Promise.all([fetchKPIs(), fetchEcosystemKPIs()]);
    if (core) setKpis(core);
    if (eco) setEcoKpis(eco);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  if (loading && !kpis) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-death-red/30 bg-death-dim/30 px-4 py-3 text-center text-sm text-death-glow">
        {error}
      </div>
    );
  }

  if (!kpis) return null;

  const survivalDelta = kpis.survival_rate_actual - kpis.survival_rate_configured;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Core Metrics</h2>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-bone-dark hover:text-bone-muted transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {/* Player Metrics */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint mb-2">Players</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'DAU', value: kpis.dau.toLocaleString() },
            { label: 'WAU', value: kpis.wau.toLocaleString() },
            { label: 'New Today', value: kpis.new_users_today.toLocaleString() },
            { label: 'Total Users', value: kpis.total_users.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="border border-moss-dark/25 bg-ritual-surface/25 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">{label}</div>
              <div className="mt-1 font-heading text-lg font-bold text-bone">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Metrics */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint mb-2">Game State</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Avg Streak', value: kpis.avg_streak.toFixed(1) },
            { label: 'Avg Pot', value: formatCents(kpis.avg_pot) },
            { label: 'Jackpot', value: formatCents(kpis.jackpot_cents), accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} className={`border px-3 py-3 ${accent ? 'border-gold-400/25 bg-gold-500/8' : 'border-moss-dark/25 bg-ritual-surface/25'}`}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">{label}</div>
              <div className={`mt-1 font-heading text-lg font-bold ${accent ? 'text-gold-300' : 'text-bone'}`}>{value}</div>
            </div>
          ))}
          <div className="border border-moss-dark/25 bg-ritual-surface/25 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">Survival Rate</div>
            <div className="mt-1 font-heading text-lg font-bold text-bone">
              {(kpis.survival_rate_actual * 100).toFixed(1)}%
            </div>
            <div className={`text-[11px] mt-0.5 ${Math.abs(survivalDelta) > 0.05 ? 'text-death-glow' : 'text-bone-faint'}`}>
              cfg: {(kpis.survival_rate_configured * 100).toFixed(1)}%
              {' '}({survivalDelta >= 0 ? '+' : ''}{(survivalDelta * 100).toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint mb-2">Today's Finance</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Topups', value: formatCents(kpis.total_topups_today) },
            { label: 'Stakes', value: formatCents(kpis.total_stakes_today) },
            { label: 'Cashout Count', value: kpis.cashouts_today_count.toString() },
            { label: 'Cashout Total', value: formatCents(kpis.cashouts_today_sum) },
          ].map(({ label, value }) => (
            <div key={label} className="border border-moss-dark/25 bg-ritual-surface/25 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">{label}</div>
              <div className="mt-1 font-heading text-base font-bold text-bone">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ecosystem KPIs */}
      {ecoKpis && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-3.5 w-3.5 text-torch-ember" strokeWidth={1.5} />
            <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">
              Ecosystem — Week of {ecoKpis.week_start}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Sat Qualified', value: ecoKpis.saturday_qualified.toLocaleString() },
              { label: 'Sun Qualified', value: ecoKpis.sunday_qualified.toLocaleString() },
              { label: 'Sat Entries', value: ecoKpis.saturday_entries.toLocaleString() },
              { label: 'Sun Entries', value: ecoKpis.sunday_entries.toLocaleString() },
              { label: 'Avg Qual Pts', value: ecoKpis.avg_qualification_points.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="border border-moss-dark/25 bg-ritual-surface/25 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">{label}</div>
                <div className="mt-1 font-heading text-lg font-bold text-bone">{value}</div>
              </div>
            ))}
          </div>

          {Object.keys(ecoKpis.game_play_counts).length > 0 && (
            <div className="mt-2 border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint mb-2">Game Plays This Week</div>
              <div className="space-y-1.5">
                {Object.entries(ecoKpis.game_play_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([gameId, count]) => {
                    const maxCount = Math.max(...Object.values(ecoKpis.game_play_counts));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={gameId}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] text-bone-muted">{gameId.replace('daily_', '').replace('_', ' ')}</span>
                          <span className="text-[11px] font-medium text-bone">{count}</span>
                        </div>
                        <div className="h-1 bg-ritual-surface/50 overflow-hidden">
                          <div
                            className="h-full bg-torch-ember/60 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
