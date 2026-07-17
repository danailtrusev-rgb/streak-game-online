import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle, Globe2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { canScheduleRegionalActivation, REGIONAL_NOT_READY_MESSAGE } from '../../lib/gameTimeGuard';

interface GameTimeRegion {
  id: string;
  key: string;
  name: string;
  timezone: string;
  daily_rollover_local_time: string;
  saturday_start_local_time: string | null;
  saturday_end_local_time: string | null;
  sunday_start_local_time: string | null;
  sunday_end_local_time: string | null;
  enabled: boolean;
  display_order: number;
}

interface GameTimeSettings {
  mode: 'global' | 'regional';
  global_region_id: string;
  regional_mode_enabled: boolean;
  regional_game_time_live_enabled: boolean;
  pending_mode: 'global' | 'regional' | null;
  pending_mode_effective_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface RegionStatus {
  region: GameTimeRegion;
  gameDate: string | null;
  nextRolloverAt: string | null;
  saturdayStatus: string | null;
  sundayStatus: string | null;
  assignedPlayers: number;
  error: string | null;
}

export default function AdminGameTimeSection() {
  const [settings, setSettings] = useState<GameTimeSettings | null>(null);
  const [regions, setRegions] = useState<GameTimeRegion[]>([]);
  const [statuses, setStatuses] = useState<RegionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverNow, setServerNow] = useState<string>('');
  const [confirming, setConfirming] = useState<'global' | 'regional' | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: settingsRow } = await supabase.from('game_time_settings').select('*').eq('id', true).maybeSingle();
    const { data: regionRows } = await supabase.from('game_time_regions').select('*').order('display_order');
    setSettings(settingsRow as GameTimeSettings | null);
    setRegions((regionRows ?? []) as GameTimeRegion[]);
    setServerNow(new Date().toISOString());

    const nextStatuses: RegionStatus[] = [];
    for (const region of (regionRows ?? []) as GameTimeRegion[]) {
      const { data: clockData, error } = await supabase.rpc('get_game_time_state_for_region', { p_region_id: region.id });
      const { count } = await supabase
        .from('user_game_time_region')
        .select('user_id', { count: 'exact', head: true })
        .eq('region_id', region.id);
      nextStatuses.push({
        region,
        gameDate: clockData?.game_date ?? null,
        nextRolloverAt: clockData?.next_daily_rollover_at ?? null,
        saturdayStatus: clockData?.saturday_status ?? null,
        sundayStatus: clockData?.sunday_status ?? null,
        assignedPlayers: count ?? 0,
        error: error?.message ?? null,
      });
    }
    setStatuses(nextStatuses);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const validRegionalActivation = regions.filter((r) => r.enabled).length >= 1;
  const regionalLiveReady = Boolean(settings?.regional_game_time_live_enabled);
  const activationGuard = canScheduleRegionalActivation({
    regionalGameTimeLiveEnabled: regionalLiveReady,
    hasAtLeastOneEnabledRegion: validRegionalActivation,
  });

  const requestModeSwitch = async (targetMode: 'global' | 'regional') => {
    if (targetMode === 'regional' && !activationGuard.allowed) {
      // Client-side guard only — the authoritative block is server-side in
      // apply_pending_game_time_mode(), which refuses to ever activate
      // Regional mode while this flag is false, regardless of what the
      // UI does. This just avoids scheduling a pending switch that could
      // never actually apply.
      setMessage({ ok: false, text: activationGuard.reason === 'not_live_ready' ? REGIONAL_NOT_READY_MESSAGE : 'Cannot switch to Regional Game Time: at least one enabled region is required.' });
      return;
    }
    setScheduling(true);
    setMessage(null);
    try {
      // Effective boundary: the CURRENT global region's next rollover —
      // never an immediate mid-day switch (requirement #14). This is a
      // plain settings UPDATE (not a new RPC) since only an admin-session-
      // authenticated caller reaches this component; the actual
      // application of the pending switch still requires the separate
      // apply_pending_game_time_mode() RPC to be run explicitly once the
      // boundary passes — this button only SCHEDULES it.
      const globalStatus = statuses.find((s) => s.region.id === settings?.global_region_id);
      const effectiveAt = globalStatus?.nextRolloverAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('game_time_settings').update({
        pending_mode: targetMode,
        pending_mode_effective_at: effectiveAt,
        pending_mode_requested_by: 'admin',
        pending_mode_requested_at: new Date().toISOString(),
      }).eq('id', true);

      if (error) {
        setMessage({ ok: false, text: `Could not schedule the mode switch: ${error.message}` });
      } else {
        setMessage({ ok: true, text: `${targetMode === 'regional' ? 'Regional' : 'Global'} Game Time scheduled to take effect at ${new Date(effectiveAt).toLocaleString()}. It will NOT apply automatically — run apply_pending_game_time_mode() after that time.` });
        await load();
      }
    } finally {
      setScheduling(false);
      setConfirming(null);
    }
  };

  if (loading) {
    return <div className="text-xs text-bone-faint">Loading Game Time System status…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">Status</h3>
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 px-4 py-3 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-bone-faint">Current mode</span><span className="text-bone font-medium uppercase">{settings?.mode ?? 'unknown'}</span></div>
          <div className="flex justify-between"><span className="text-bone-faint">Server UTC time</span><span className="text-bone font-mono">{serverNow}</span></div>
          {settings?.pending_mode && (
            <div className="flex items-start gap-2 mt-2 p-2 border border-torch-ember/30 bg-torch-ember/5">
              <AlertTriangle className="h-3.5 w-3.5 text-torch-ember flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="text-bone-faint">
                Pending switch to <strong className="text-bone uppercase">{settings.pending_mode}</strong> Game Time,
                effective {settings.pending_mode_effective_at ? new Date(settings.pending_mode_effective_at).toLocaleString() : 'unknown'}.
                Not applied automatically — requires <code className="font-mono">apply_pending_game_time_mode()</code> to be run after the boundary.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Per-region status */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Globe2 className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">Game Time Regions</h3>
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
          {statuses.map(({ region, gameDate, nextRolloverAt, saturdayStatus, sundayStatus, assignedPlayers, error }) => (
            <div key={region.id} className="px-4 py-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-bone font-medium">{region.name}</span>
                <span className="text-[11px] font-mono text-bone-faint">{region.key} · {region.timezone}</span>
              </div>
              {error ? (
                <div className="text-death-glow">{error}</div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-bone-faint">
                  <div>Game date: <span className="text-bone font-mono">{gameDate}</span></div>
                  <div>Next rollover: <span className="text-bone font-mono">{nextRolloverAt ? new Date(nextRolloverAt).toLocaleString() : '—'}</span></div>
                  <div>Saturday: <span className="text-bone">{saturdayStatus}</span></div>
                  <div>Sunday: <span className="text-bone">{sundayStatus}</span></div>
                  <div>Assigned players: <span className="text-bone">{assignedPlayers}</span></div>
                  <div>Enabled: <span className="text-bone">{region.enabled ? 'Yes' : 'No'}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-bone-faint mt-2">
          Region creation/editing is not available in this admin view yet — only one region
          (the safe default) exists, and Regional Game Time is not active. See PROJECT_CHANGELOG.md.
        </p>
      </section>

      {/* Mode switching */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">Mode</h3>
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 px-4 py-3 space-y-3 text-xs">
          <p className="text-bone-faint leading-relaxed">
            Switching modes is a high-impact operation. It does not apply immediately — it
            schedules a change for the next daily rollover, logged, and must be explicitly
            applied afterward.
          </p>
          <div className="flex gap-2">
            <button
              disabled={settings?.mode === 'global' || scheduling}
              onClick={() => setConfirming('global')}
              className="px-3 py-1.5 border border-moss-dark/40 text-bone-dark hover:text-bone disabled:opacity-40"
            >
              Switch to Global Game Time
            </button>
          </div>

          {/* Regional Game Time: shown as a future capability, not an
              activatable action, while regional_game_time_live_enabled is
              false. The scheduling button is intentionally NOT rendered at
              all in this state — hidden, not merely disabled — per the
              requirement to not offer the action until it's real. Even if
              it were somehow reachable, the server-side guard in
              apply_pending_game_time_mode() is the actual authority. */}
          <div className="border border-moss-dark/25 bg-ritual-surface/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-bone font-medium">Regional Game Time</span>
              <span className="text-[10px] uppercase tracking-wider text-bone-faint px-2 py-0.5 border border-moss-dark/30">
                Partially code-ready · Finalization idempotency gap
              </span>
            </div>
            <p className="text-bone-faint leading-relaxed">
              {REGIONAL_NOT_READY_MESSAGE}
            </p>
            <div className="text-[11px] text-bone-faint leading-relaxed border-t border-moss-dark/20 pt-2 space-y-1.5">
              <p><strong className="text-bone">Game Time foundation</strong> — region model, resolution, active/pending assignment history: region-aware at code level.</p>
              <p><strong className="text-bone">Daily play readiness</strong> — play_daily_gate, get_my_state, cashout audit, duplicate-play protection: region-aware at code level.</p>
              <p><strong className="text-bone">Notification readiness</strong> — next-day/last-call timing and dedupe: region-aware at code level.</p>
              <p><strong className="text-bone">Weekend event instance readiness</strong> — Saturday Showdown / Sunday Crown participation, event-instance uniqueness, region-scoped leaderboards: region-aware at code level.</p>
              <p><strong className="text-bone">Finalization/reward readiness</strong> — <span className="text-death-glow">not complete</span>. Reward finalization has no built-in protection against being run twice for the same winner; this is a pre-existing property of the finalization flow, not fixed in this pass. This is the reason Regional Game Time is not classified as fully code-ready.</p>
            </div>
            <p className="text-[11px] text-bone-faint font-mono">
              regional_game_time_live_enabled: <span className={regionalLiveReady ? 'text-moss-light' : 'text-death-glow'}>{String(regionalLiveReady)}</span>
              {' '}(developer/system readiness flag — not a product setting; not editable from this screen)
            </p>
            {activationGuard.allowed && (
              // Only ever rendered once the backend readiness flag is
              // genuinely true — i.e. after a future phase has upgraded
              // gameplay RPCs and someone has deliberately flipped it.
              <button
                disabled={settings?.mode === 'regional' || scheduling}
                onClick={() => setConfirming('regional')}
                className="px-3 py-1.5 border border-torch-ember/40 text-torch-ember hover:bg-torch-ember/10 disabled:opacity-40"
              >
                Switch to Regional Game Time
              </button>
            )}
          </div>

          {confirming && (
            <div className="border border-torch-ember/40 bg-torch-ember/5 p-3 space-y-2">
              <p className="text-bone">
                Confirm: schedule a switch to <strong className="uppercase">{confirming}</strong> Game Time?
                This will take effect at the next daily rollover, not immediately, and must
                still be applied explicitly afterward.
              </p>
              <div className="flex gap-2">
                <button onClick={() => requestModeSwitch(confirming)} disabled={scheduling} className="px-3 py-1.5 bg-torch-ember/20 border border-torch-ember/50 text-torch-ember">
                  {scheduling ? 'Scheduling…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirming(null)} className="px-3 py-1.5 border border-moss-dark/40 text-bone-dark">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={message.ok ? 'text-moss-light' : 'text-death-glow'}>{message.text}</div>
          )}
        </div>
      </section>
    </div>
  );
}
