import { useEffect, useState, useCallback } from 'react';
import {
  Clock, AlertTriangle, Globe2, Plus, Edit3, X, UserPlus, FlaskConical,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
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

interface UserAssignment {
  user_id: string;
  region_id: string;
  effective_from: string;
  assigned_by: string;
  assignment_reason: string | null;
  created_at: string;
}

const PRESET_REGIONS = [
  { key: 'europe_madrid', name: 'Europe / Madrid', timezone: 'Europe/Madrid' },
  { key: 'america_new_york', name: 'America / New York', timezone: 'America/New_York' },
  { key: 'asia_tokyo', name: 'Asia / Tokyo', timezone: 'Asia/Tokyo' },
  { key: 'australia_sydney', name: 'Australia / Sydney', timezone: 'Australia/Sydney' },
];

type ModalMode =
  | null
  | { type: 'create-region' }
  | { type: 'edit-region'; region: GameTimeRegion }
  | { type: 'assign-user' };

export default function AdminGameTimeSection() {
  const { setGameTimeTestingUnlock, createGameTimeRegion, updateGameTimeRegion, assignUserRegion } = useAdmin();
  const [settings, setSettings] = useState<GameTimeSettings | null>(null);
  const [regions, setRegions] = useState<GameTimeRegion[]>([]);
  const [statuses, setStatuses] = useState<RegionStatus[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverNow, setServerNow] = useState<string>('');
  const [confirming, setConfirming] = useState<'global' | 'regional' | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);

  // Region form state
  const [rForm, setRForm] = useState({
    key: '', name: '', timezone: '', daily_rollover_local_time: '00:00',
    saturday_start: '', saturday_end: '', sunday_start: '', sunday_end: '',
    enabled: true, display_order: 0,
  });

  // User assignment form state
  const [aForm, setAForm] = useState({ user_id: '', region_id: '', reason: 'manual_admin_assignment', force_immediate: false });

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

    const { data: aRows } = await supabase
      .from('user_game_time_region')
      .select('user_id, region_id, effective_from, assigned_by, assignment_reason, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setAssignments((aRows ?? []) as UserAssignment[]);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const validRegionalActivation = regions.filter((r) => r.enabled).length >= 1;
  const regionalLiveReady = Boolean(settings?.regional_game_time_live_enabled);
  const activationGuard = canScheduleRegionalActivation({
    regionalGameTimeLiveEnabled: regionalLiveReady,
    hasAtLeastOneEnabledRegion: validRegionalActivation,
  });
  const enabledRegionsCount = regions.filter((r) => r.enabled).length;

  const handleToggleUnlock = async (enable: boolean) => {
    setUnlockBusy(true);
    setMessage(null);
    try {
      const res = await setGameTimeTestingUnlock(enable);
      if (res.error) {
        setMessage({ ok: false, text: res.error });
      } else {
        setMessage({ ok: true, text: `Testing unlock ${enable ? 'enabled' : 'disabled'}. regional_game_time_live_enabled=${enable}` });
        await load();
      }
    } finally {
      setUnlockBusy(false);
    }
  };

  const requestModeSwitch = async (targetMode: 'global' | 'regional') => {
    if (targetMode === 'regional' && !activationGuard.allowed) {
      setMessage({ ok: false, text: activationGuard.reason === 'not_live_ready' ? 'Testing unlock must be enabled first.' : 'Cannot switch to Regional Game Time: at least one enabled region is required.' });
      return;
    }
    setScheduling(true);
    setMessage(null);
    try {
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

  const openCreateRegion = () => {
    setRForm({ key: '', name: '', timezone: '', daily_rollover_local_time: '00:00', saturday_start: '', saturday_end: '', sunday_start: '', sunday_end: '', enabled: true, display_order: regions.length });
    setModal({ type: 'create-region' });
  };

  const openEditRegion = (region: GameTimeRegion) => {
    setRForm({
      key: region.key, name: region.name, timezone: region.timezone,
      daily_rollover_local_time: region.daily_rollover_local_time.slice(0, 5),
      saturday_start: region.saturday_start_local_time?.slice(0, 5) ?? '',
      saturday_end: region.saturday_end_local_time?.slice(0, 5) ?? '',
      sunday_start: region.sunday_start_local_time?.slice(0, 5) ?? '',
      sunday_end: region.sunday_end_local_time?.slice(0, 5) ?? '',
      enabled: region.enabled, display_order: region.display_order,
    });
    setModal({ type: 'edit-region', region });
  };

  const submitRegionForm = async () => {
    setMessage(null);
    const fields: Record<string, unknown> = {
      key: rForm.key, name: rForm.name, timezone: rForm.timezone,
      daily_rollover_local_time: rForm.daily_rollover_local_time + ':00',
      saturday_start_local_time: rForm.saturday_start ? rForm.saturday_start + ':00' : null,
      saturday_end_local_time: rForm.saturday_end ? rForm.saturday_end + ':00' : null,
      sunday_start_local_time: rForm.sunday_start ? rForm.sunday_start + ':00' : null,
      sunday_end_local_time: rForm.sunday_end ? rForm.sunday_end + ':00' : null,
      enabled: rForm.enabled, display_order: rForm.display_order,
    };
    try {
      if (modal?.type === 'create-region') {
        const res = await createGameTimeRegion(fields as Parameters<typeof createGameTimeRegion>[0]);
        if (res.error) { setMessage({ ok: false, text: res.error }); return; }
        setMessage({ ok: true, text: 'Region created.' });
      } else if (modal?.type === 'edit-region') {
        const res = await updateGameTimeRegion({ id: modal.region.id, ...fields } as Parameters<typeof updateGameTimeRegion>[0]);
        if (res.error) { setMessage({ ok: false, text: res.error }); return; }
        setMessage({ ok: true, text: 'Region updated.' });
      }
      setModal(null);
      await load();
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    }
  };

  const submitAssignUser = async () => {
    setMessage(null);
    if (!aForm.user_id || !aForm.region_id) {
      setMessage({ ok: false, text: 'User ID and Region are required.' });
      return;
    }
    try {
      const res = await assignUserRegion(aForm.user_id, aForm.region_id, aForm.reason, aForm.force_immediate);
      if (res.error) { setMessage({ ok: false, text: res.error }); return; }
      setMessage({ ok: true, text: aForm.force_immediate ? 'User assigned immediately (TEST OVERRIDE).' : 'User assigned. Effective at next rollover boundary.' });
      setModal(null);
      setAForm({ user_id: '', region_id: '', reason: 'manual_admin_assignment', force_immediate: false });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    }
  };

  const applyPreset = (preset: typeof PRESET_REGIONS[0]) => {
    setRForm((prev) => ({ ...prev, key: preset.key, name: preset.name, timezone: preset.timezone }));
  };

  const regionNameById = (id: string) => regions.find((r) => r.id === id)?.name ?? id.slice(0, 8);

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
          <div className="flex justify-between"><span className="text-bone-faint">Active regions</span><span className="text-bone">{enabledRegionsCount}</span></div>
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

      {/* Readiness checklist */}
      <section>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 px-4 py-3 space-y-2 text-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">Regional Game Time Readiness</h3>
          <p className="text-bone-faint leading-relaxed">
            Regional Game Time is structurally ready at code and database level, but it is not yet enabled for live gameplay. It must remain disabled until controlled test-region validation has been completed in the Supabase/Bolt environment.
          </p>
          <div className="space-y-1.5 text-bone-faint leading-relaxed">
            <p><strong className="text-bone">Game Time foundation</strong> — region model, resolution, active/pending assignment history: region-aware at code level.</p>
            <p><strong className="text-bone">Daily play readiness</strong> — play_daily_gate, get_my_state, cashout audit, duplicate-play protection: region-aware at code level.</p>
            <p><strong className="text-bone">Notification readiness</strong> — next-day/last-call timing and dedupe: region-aware at code level.</p>
            <p><strong className="text-bone">Weekend event readiness</strong> — Saturday Showdown / Sunday Crown participation, event-instance uniqueness, region-scoped leaderboards, finalization idempotency, reward protection, and reporting: region-aware at code level.</p>
            <p><strong className="text-bone">Deployment readiness</strong> — <span className="text-death-glow">not complete</span>. Regional Game Time has not yet been manually tested with multiple regions and controlled test users. Keep <code className="font-mono">regional_game_time_live_enabled=false</code> until test-region validation passes and activation is approved.</p>
          </div>
        </div>
      </section>

      {/* Testing Unlock */}
      <section>
        <div className="border border-torch-ember/40 bg-torch-ember/5 px-4 py-3 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">Regional Game Time Testing Unlock</h3>
            <span className="text-[10px] uppercase tracking-wider text-torch-ember px-2 py-0.5 border border-torch-ember/30">DEV/TEST ONLY</span>
          </div>
          <p className="text-bone-faint leading-relaxed">
            This unlock allows Regional Game Time to be tested in the current development environment. It does not mean the feature is production-ready. Keep this disabled in production until multi-region gameplay, qualification, weekend events, reporting, cashout, and notification behaviour have been manually verified.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-bone-faint">
            <span>regional_game_time_live_enabled: <span className={regionalLiveReady ? 'text-moss-light font-mono' : 'text-death-glow font-mono'}>{String(regionalLiveReady)}</span></span>
            <span>mode: <span className="text-bone font-mono uppercase">{settings?.mode}</span></span>
            <span>pending mode: <span className="text-bone font-mono">{settings?.pending_mode ?? 'none'}</span></span>
            <span>active regions: <span className="text-bone">{enabledRegionsCount}</span></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleToggleUnlock(true)}
              disabled={unlockBusy || regionalLiveReady}
              className="px-3 py-1.5 border border-torch-ember/40 text-torch-ember hover:bg-torch-ember/10 disabled:opacity-40"
            >
              {unlockBusy ? '…' : 'Enable Testing Unlock'}
            </button>
            <button
              onClick={() => handleToggleUnlock(false)}
              disabled={unlockBusy || !regionalLiveReady}
              className="px-3 py-1.5 border border-moss-dark/40 text-bone-dark hover:text-bone disabled:opacity-40"
            >
              {unlockBusy ? '…' : 'Disable Testing Unlock'}
            </button>
          </div>
        </div>
      </section>

      {/* Per-region status */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">Game Time Regions</h3>
          </div>
          <button onClick={openCreateRegion} className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-torch-ember hover:text-torch-ember/80">
            <Plus className="h-3 w-3" /> Add Region
          </button>
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
          {statuses.length === 0 && (
            <div className="px-4 py-3 text-xs text-bone-faint">No regions configured.</div>
          )}
          {statuses.map(({ region, gameDate, nextRolloverAt, saturdayStatus, sundayStatus, assignedPlayers, error }) => (
            <div key={region.id} className="px-4 py-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-bone font-medium">{region.name}</span>
                  <button onClick={() => openEditRegion(region)} className="text-bone-faint hover:text-torch-ember transition-colors">
                    <Edit3 className="h-3 w-3" />
                  </button>
                </div>
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
                  <div>Enabled: <span className={region.enabled ? 'text-moss-light' : 'text-death-glow'}>{region.enabled ? 'Yes' : 'No'}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* User region assignments */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-bone">User Region Assignments</h3>
          <button
            onClick={() => { setAForm({ user_id: '', region_id: regions[0]?.id ?? '', reason: 'manual_admin_assignment', force_immediate: false }); setModal({ type: 'assign-user' }); }}
            disabled={regions.length === 0}
            className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-torch-ember hover:text-torch-ember/80 disabled:opacity-40"
          >
            <UserPlus className="h-3 w-3" /> Assign User
          </button>
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
          {assignments.length === 0 && (
            <div className="px-4 py-3 text-xs text-bone-faint">No user region assignments yet.</div>
          )}
          {assignments.map((a) => (
            <div key={a.user_id + a.created_at} className="px-4 py-2.5 text-xs grid grid-cols-2 gap-x-4 gap-y-1 text-bone-faint">
              <div>User: <span className="text-bone font-mono">{a.user_id.slice(0, 8)}</span></div>
              <div>Region: <span className="text-bone">{regionNameById(a.region_id)}</span></div>
              <div>Effective: <span className="text-bone">{new Date(a.effective_from).toLocaleString()}</span></div>
              <div>By: <span className="text-bone">{a.assigned_by}</span></div>
              {a.assignment_reason && <div className="col-span-2">Reason: <span className="text-bone">{a.assignment_reason}</span></div>}
            </div>
          ))}
        </div>
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

          <div className="border border-moss-dark/25 bg-ritual-surface/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-bone font-medium">Regional Game Time</span>
              <span className="text-[10px] uppercase tracking-wider text-bone-faint px-2 py-0.5 border border-moss-dark/30">
                {regionalLiveReady ? 'Testing unlock enabled' : 'Structurally code-ready · Not deployment-tested'}
              </span>
            </div>
            <p className="text-bone-faint leading-relaxed">
              {regionalLiveReady
                ? 'Testing unlock is active. You can schedule a switch to Regional Game Time below. It will take effect at the next daily rollover and must be explicitly applied afterward.'
                : 'Regional Game Time is structurally ready at code and database level, but it is not yet enabled for live gameplay. Enable the testing unlock above to test in this dev/test environment.'}
            </p>
            <p className="text-[11px] text-bone-faint font-mono">
              regional_game_time_live_enabled: <span className={regionalLiveReady ? 'text-moss-light' : 'text-death-glow'}>{String(regionalLiveReady)}</span>
              {' '}(developer/system readiness flag — toggle via Testing Unlock above)
            </p>
            {!regionalLiveReady && (
              <p className="text-[11px] text-bone-faint italic">{REGIONAL_NOT_READY_MESSAGE}</p>
            )}
            {activationGuard.allowed && (
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

      {/* Modal: Create/Edit Region */}
      {modal && (modal.type === 'create-region' || modal.type === 'edit-region') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-ritual-surface border border-moss-dark/40 max-w-md w-full mx-4 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-bone">
                {modal.type === 'create-region' ? 'Create Region' : 'Edit Region'}
              </h3>
              <button onClick={() => setModal(null)} className="text-bone-faint hover:text-bone"><X className="h-4 w-4" /></button>
            </div>

            {modal.type === 'create-region' && (
              <div className="space-y-1">
                <label className="text-[11px] text-bone-faint uppercase tracking-wider">Quick presets</label>
                <div className="flex flex-wrap gap-1">
                  {PRESET_REGIONS.map((p) => (
                    <button key={p.key} onClick={() => applyPreset(p)} className="text-[11px] px-2 py-1 border border-moss-dark/30 text-bone-dark hover:text-torch-ember hover:border-torch-ember/30">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Key" value={rForm.key} onChange={(v) => setRForm({ ...rForm, key: v })} placeholder="e.g. europe_madrid" />
            <Field label="Name" value={rForm.name} onChange={(v) => setRForm({ ...rForm, name: v })} placeholder="e.g. Europe / Madrid" />
            <Field label="Timezone" value={rForm.timezone} onChange={(v) => setRForm({ ...rForm, timezone: v })} placeholder="e.g. Europe/Madrid" />
            <Field label="Daily rollover (local time)" value={rForm.daily_rollover_local_time} onChange={(v) => setRForm({ ...rForm, daily_rollover_local_time: v })} placeholder="00:00" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Saturday start" value={rForm.saturday_start} onChange={(v) => setRForm({ ...rForm, saturday_start: v })} placeholder="HH:MM" />
              <Field label="Saturday end" value={rForm.saturday_end} onChange={(v) => setRForm({ ...rForm, saturday_end: v })} placeholder="HH:MM" />
              <Field label="Sunday start" value={rForm.sunday_start} onChange={(v) => setRForm({ ...rForm, sunday_start: v })} placeholder="HH:MM" />
              <Field label="Sunday end" value={rForm.sunday_end} onChange={(v) => setRForm({ ...rForm, sunday_end: v })} placeholder="HH:MM" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs text-bone-faint">
                <input type="checkbox" checked={rForm.enabled} onChange={(e) => setRForm({ ...rForm, enabled: e.target.checked })} />
                Enabled
              </label>
              <Field label="Display order" value={String(rForm.display_order)} onChange={(v) => setRForm({ ...rForm, display_order: parseInt(v) || 0 })} placeholder="0" />
            </div>

            <button onClick={submitRegionForm} className="jungle-button w-full">
              {modal.type === 'create-region' ? 'Create Region' : 'Save Changes'}
            </button>
            {message && <p className={message.ok ? 'text-moss-light text-xs' : 'text-death-glow text-xs'}>{message.text}</p>}
          </div>
        </div>
      )}

      {/* Modal: Assign User to Region */}
      {modal?.type === 'assign-user' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-ritual-surface border border-moss-dark/40 max-w-md w-full mx-4 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-bone">Assign User to Region</h3>
              <button onClick={() => setModal(null)} className="text-bone-faint hover:text-bone"><X className="h-4 w-4" /></button>
            </div>
            <Field label="User ID (UUID)" value={aForm.user_id} onChange={(v) => setAForm({ ...aForm, user_id: v })} placeholder="paste user UUID" />
            <div className="space-y-1">
              <label className="text-[11px] text-bone-faint uppercase tracking-wider">Region</label>
              <select
                value={aForm.region_id}
                onChange={(e) => setAForm({ ...aForm, region_id: e.target.value })}
                className="ritual-input w-full"
              >
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.key})</option>)}
              </select>
            </div>
            <Field label="Reason" value={aForm.reason} onChange={(v) => setAForm({ ...aForm, reason: v })} placeholder="manual_admin_assignment" />
            <label className="flex items-center gap-2 text-xs text-bone-faint">
              <input type="checkbox" checked={aForm.force_immediate} onChange={(e) => setAForm({ ...aForm, force_immediate: e.target.checked })} />
              <span>Force effective immediately <span className="text-torch-ember font-semibold">TEST OVERRIDE ONLY</span> — skips the safe reassignment boundary</span>
            </label>
            <button onClick={submitAssignUser} className="jungle-button w-full">Assign User</button>
            {message && <p className={message.ok ? 'text-moss-light text-xs' : 'text-death-glow text-xs'}>{message.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-bone-faint uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ritual-input w-full"
      />
    </div>
  );
}
