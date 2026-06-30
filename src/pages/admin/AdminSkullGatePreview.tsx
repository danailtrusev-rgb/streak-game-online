// Admin: Skull Gate Scene Renderer Preview — Prompt 20 revision, Prompt 24 assignment test
// Internal testing tool for SkullGateSceneRenderer.
// Access via /sys/admin → "Gate Preview" tab.
// Not visible to players. Does not affect live gameplay.
// DB is the single source of truth — no static fallback is shown.

import { useState, useCallback, useEffect } from 'react';
import { Layers, RotateCcw, Eye, EyeOff, FlaskConical, AlertCircle, CheckCircle, Loader, RefreshCw, Database } from 'lucide-react';
import SkullGateSceneRenderer from '../../components/game/SkullGateSceneRenderer';
import { useSkullGateScenes } from '../../hooks/useSkullGateScenes';
import { supabase } from '../../lib/supabase';
import { USE_SCENE_BASED_SKULL_GATE } from '../../lib/constants';
import type { SkullGateSceneConfig } from '../../lib/types';
import type { SkullGateAssignment } from '../../hooks/useSkullGateAssignment';

type Phase   = 'idle' | 'selected' | 'revealing' | 'done';
type Outcome = 'SURVIVE' | 'DIE' | null;

const UF = "'Inter', system-ui, sans-serif";
const FF = "'Metal Mania', 'Cinzel', Georgia, serif";

// ── Tiny styled helpers ───────────────────────────────────────────────────────

function Chip({
  active, onClick, danger = false, children,
}: { active: boolean; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:       '5px 11px',
        fontSize:       10,
        fontFamily:     UF,
        letterSpacing:  '0.12em',
        textTransform:  'uppercase',
        border:         `1px solid ${
          danger
            ? active ? 'rgba(204,68,68,0.5)' : 'rgba(100,20,20,0.35)'
            : active ? 'rgba(245,208,96,0.5)' : 'rgba(50,70,50,0.4)'
        }`,
        background:     active
          ? danger ? 'rgba(204,68,68,0.12)' : 'rgba(245,208,96,0.10)'
          : 'transparent',
        color:          active
          ? danger ? 'rgba(220,80,80,0.9)' : '#F5D060'
          : 'rgba(255,255,255,0.38)',
        cursor:         'pointer',
        transition:     'all 0.15s ease',
        whiteSpace:     'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: UF, letterSpacing: '0.2em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
      marginBottom: 6, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  onClick, label, accent = false,
}: { onClick: () => void; label: string; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:       '6px 12px',
        fontSize:       10,
        fontFamily:     UF,
        letterSpacing:  '0.12em',
        textTransform:  'uppercase',
        border:         `1px solid ${accent ? 'rgba(120,190,80,0.4)' : 'rgba(60,80,60,0.35)'}`,
        background:     accent ? 'rgba(120,190,80,0.08)' : 'rgba(11,15,12,0.6)',
        color:          accent ? 'rgba(150,220,100,0.85)' : 'rgba(255,255,255,0.45)',
        cursor:         'pointer',
        transition:     'all 0.15s ease',
        whiteSpace:     'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Assignment test panel ─────────────────────────────────────────────────────

function AssignmentTestPanel() {
  const sceneApi = useSkullGateScenes();
  const [assigning,   setAssigning]   = useState(false);
  const [assignment,  setAssignment]  = useState<SkullGateAssignment | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [dbScenes,    setDbScenes]    = useState<Array<{
    id: string; slug: string; title: string; status: string;
    enabled: boolean; weight: number; cooldown_days: number;
    min_streak: number | null; max_streak: number | null;
    published_config_json: SkullGateSceneConfig | null;
  }> | null>(null);
  const [loadingScenes, setLoadingScenes] = useState(false);

  const loadDbScenes = useCallback(async () => {
    setLoadingScenes(true);
    const rows = await sceneApi.listScenes();
    setDbScenes(rows as typeof dbScenes);
    setLoadingScenes(false);
  }, [sceneApi]);

  const testAssign = useCallback(async () => {
    setAssigning(true);
    setAssignError(null);
    setAssignment(null);
    try {
      const { data, error } = await supabase.rpc('get_or_assign_skull_gate_scene');
      if (error) { setAssignError(error.message); return; }
      setAssignment(data as SkullGateAssignment);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAssigning(false);
    }
  }, []);

  const UF_LOCAL = "'Inter', system-ui, sans-serif";

  return (
    <div style={{
      marginTop: 16, padding: '14px 16px',
      background: 'rgba(11,15,12,0.8)', border: '1px solid rgba(40,55,42,0.4)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FlaskConical size={14} style={{ color: 'rgba(255,154,48,0.7)' }} strokeWidth={1.5} />
        <span style={{ fontSize: 11, fontFamily: UF_LOCAL, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
          Assignment System Test
        </span>
        <span style={{
          fontSize: 8, fontFamily: UF_LOCAL, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '2px 7px',
          border: `1px solid ${USE_SCENE_BASED_SKULL_GATE ? 'rgba(120,190,80,0.4)' : 'rgba(180,140,0,0.3)'}`,
          color: USE_SCENE_BASED_SKULL_GATE ? 'rgba(140,210,100,0.8)' : 'rgba(200,175,80,0.65)',
        }}>
          Flag: {USE_SCENE_BASED_SKULL_GATE ? 'ON' : 'OFF (safe)'}
        </span>
      </div>

      <div style={{ fontSize: 9, fontFamily: UF_LOCAL, color: 'rgba(255,255,255,0.28)', lineHeight: 1.7 }}>
        Calls <code style={{ color: 'rgba(245,208,96,0.6)', fontSize: 9 }}>get_or_assign_skull_gate_scene()</code> as the current authenticated user.
        Does NOT trigger play_daily_gate, deduct wallet, or affect streak.
        Requires an active Supabase auth session (player must be logged in on the frontend).
      </div>

      {/* DB Scenes status */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontFamily: UF_LOCAL, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
            DB Scenes
          </span>
          <button
            onClick={loadDbScenes}
            disabled={loadingScenes}
            style={{
              padding: '3px 9px', fontSize: 8, fontFamily: UF_LOCAL, letterSpacing: '0.1em',
              textTransform: 'uppercase', border: '1px solid rgba(50,70,50,0.4)',
              background: 'transparent', color: 'rgba(255,255,255,0.38)', cursor: 'pointer',
            }}
          >
            {loadingScenes ? 'Loading…' : 'Load'}
          </button>
        </div>

        {dbScenes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dbScenes.map((row) => {
              const eligibleForAssign = row.status === 'published'
                && row.enabled
                && row.published_config_json !== null;
              return (
                <div key={row.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px',
                  background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(40,55,42,0.25)',
                }}>
                  <span style={{ fontSize: 9, fontFamily: UF_LOCAL, color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.title}
                  </span>
                  {/* Status */}
                  <span style={{
                    fontSize: 8, fontFamily: UF_LOCAL, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: row.status === 'published' ? 'rgba(120,200,90,0.7)' : row.status === 'archived' ? 'rgba(200,60,60,0.6)' : 'rgba(200,175,80,0.6)',
                    padding: '1px 5px', border: '1px solid rgba(40,55,42,0.3)',
                  }}>
                    {row.status}
                  </span>
                  {/* Enabled */}
                  <span style={{ fontSize: 8, fontFamily: UF_LOCAL, color: row.enabled ? 'rgba(120,200,90,0.7)' : 'rgba(255,255,255,0.2)' }}>
                    {row.enabled ? 'enabled' : 'disabled'}
                  </span>
                  {/* Weight */}
                  <span style={{ fontSize: 8, fontFamily: UF_LOCAL, color: 'rgba(255,255,255,0.3)' }}>
                    w:{row.weight}
                  </span>
                  {/* Cooldown */}
                  <span style={{ fontSize: 8, fontFamily: UF_LOCAL, color: 'rgba(255,255,255,0.3)' }}>
                    cd:{row.cooldown_days}d
                  </span>
                  {/* Streak range */}
                  <span style={{ fontSize: 8, fontFamily: UF_LOCAL, color: 'rgba(255,255,255,0.3)' }}>
                    streak:{row.min_streak ?? 0}–{row.max_streak ?? '∞'}
                  </span>
                  {/* Assignable indicator */}
                  <span style={{ fontSize: 8, color: eligibleForAssign ? 'rgba(120,200,90,0.75)' : 'rgba(255,255,255,0.15)' }}>
                    {eligibleForAssign ? '✓ assignable' : '✗'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {dbScenes && dbScenes.length === 0 && (
          <div style={{ fontSize: 9, fontFamily: UF_LOCAL, color: 'rgba(200,60,60,0.55)', padding: '4px 0' }}>
            No scenes in DB. Seed required.
          </div>
        )}
      </div>

      {/* Test assign button */}
      <div>
        <button
          onClick={testAssign}
          disabled={assigning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', fontSize: 10, fontFamily: UF_LOCAL,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            border: '1px solid rgba(245,208,96,0.35)',
            background: 'rgba(245,208,96,0.07)',
            color: 'rgba(245,208,96,0.8)', cursor: assigning ? 'not-allowed' : 'pointer',
            opacity: assigning ? 0.6 : 1, transition: 'all 0.15s ease',
          }}
        >
          {assigning
            ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />Assigning…</>
            : <><FlaskConical size={12} />Test Assign Today</>
          }
        </button>
        <div style={{ fontSize: 8, fontFamily: UF_LOCAL, color: 'rgba(255,255,255,0.2)', marginTop: 5, lineHeight: 1.6 }}>
          Requires player to be authenticated. Admin session alone is not sufficient —
          open the app as a player first, or use a logged-in player account.
        </div>
      </div>

      {/* Assignment result */}
      {assignError && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 7,
          padding: '8px 10px', background: 'rgba(180,40,40,0.08)', border: '1px solid rgba(180,40,40,0.3)',
        }}>
          <AlertCircle size={13} style={{ color: 'rgba(200,60,60,0.8)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 10, fontFamily: UF_LOCAL, color: 'rgba(200,70,70,0.85)', lineHeight: 1.5 }}>
            {assignError}
          </span>
        </div>
      )}

      {assignment && (
        <div style={{
          padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(40,55,42,0.35)',
          display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <CheckCircle size={13} style={{ color: 'rgba(120,200,90,0.8)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontFamily: UF_LOCAL, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(120,200,90,0.8)' }}>
              {assignment.from_cache ? 'Returned Existing Assignment' : 'New Assignment Created'}
            </span>
          </div>

          {assignment.no_eligible ? (
            <div style={{ fontSize: 10, fontFamily: UF_LOCAL, color: 'rgba(200,175,80,0.7)' }}>
              No eligible scenes found (check enabled, status=published, streak range, cooldown).
            </div>
          ) : (
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, lineHeight: 1.8 }}>
              {[
                ['assignment_id', assignment.assignment_id ?? '—'],
                ['scene_slug',    assignment.scene_slug ?? '—'],
                ['scene_id',      assignment.scene_id ?? '—'],
                ['play_date',     assignment.play_date],
                ['status',        assignment.status ?? '—'],
                ['from_cache',    String(assignment.from_cache)],
                ['scene_config',  assignment.scene_config ? `${assignment.scene_config.title} (${assignment.scene_config.layers?.length ?? 0} layers)` : 'null'],
              ].map(([key, val]) => (
                <div key={key} style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {key}: <span style={{ color: 'rgba(245,208,96,0.65)' }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scene source entry (DB row or static fallback) ────────────────────────────

interface SceneEntry {
  config:    SkullGateSceneConfig;
  sourceId:  string | null;     // DB row id, null if static fallback
  slug:      string;
  updatedAt: string | null;     // ISO timestamp from DB, null if static
}

const PREVIEW_SCENE_KEY = 'preview_scene_slug';

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminSkullGatePreview() {
  const sceneApi = useSkullGateScenes();

  const [entries,       setEntries]       = useState<SceneEntry[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [loadError,     setLoadError]     = useState<string | null>(null);
  const [sceneIdx,      setSceneIdx]      = useState(0);

  const [phase,          setPhase]          = useState<Phase>('idle');
  const [outcome,        setOutcome]        = useState<Outcome>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showOutlines,   setShowOutlines]   = useState(false);

  // Load scenes from DB on mount
  const loadScenes = useCallback(async () => {
    setLoadingScenes(true);
    setLoadError(null);
    const rows = await sceneApi.listScenes();
    if (rows === null) {
      // DB error — show error state, do NOT fall back to static defaults
      setLoadError(sceneApi.error ?? 'Failed to load scenes from database');
      setEntries([]);
    } else if (rows.length === 0) {
      // DB empty — show empty state
      setEntries([]);
    } else {
      const mapped: SceneEntry[] = rows.map((row) => ({
        config:    row.draft_config_json,
        sourceId:  row.id,
        slug:      row.slug,
        updatedAt: row.updated_at,
      }));
      setEntries(mapped);

      // Restore previously selected scene by slug
      const savedSlug = localStorage.getItem(PREVIEW_SCENE_KEY);
      if (savedSlug) {
        const idx = mapped.findIndex((e) => e.slug === savedSlug);
        if (idx >= 0) setSceneIdx(idx);
      }
    }
    setLoadingScenes(false);
  }, [sceneApi]);

  useEffect(() => { loadScenes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectScene = useCallback((idx: number, slug: string) => {
    setSceneIdx(idx);
    localStorage.setItem(PREVIEW_SCENE_KEY, slug);
    setPhase('idle');
    setOutcome(null);
    setSelectedChoice(null);
  }, []);

  const entry: SceneEntry | undefined = entries[sceneIdx] ?? entries[0];
  const scene: SkullGateSceneConfig | undefined = entry?.config;

  // Derive choice ids dynamically from choice_object layers
  const choiceIds: Array<{ id: string; name: string }> = scene
    ? scene.layers
        .filter((l) => l.role === 'choice_object' && l.clickable && l.choiceId)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((l) => ({ id: l.choiceId as string, name: l.name }))
    : [];

  const firstChoiceId = choiceIds[0]?.id ?? null;

  const handleChoiceSelect = useCallback((choiceId: string) => {
    setSelectedChoice(choiceId);
    setPhase('selected');
  }, []);

  const handleCta = useCallback(() => {
    if (phase === 'selected') setPhase('revealing');
  }, [phase]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setOutcome(null);
    setSelectedChoice(null);
  }, []);

  const simulateSurvive = useCallback(() => {
    setOutcome('SURVIVE');
    setPhase('revealing');
    if (!selectedChoice) setSelectedChoice(firstChoiceId);
  }, [selectedChoice, firstChoiceId]);

  const simulateDie = useCallback(() => {
    setOutcome('DIE');
    setPhase('revealing');
    if (!selectedChoice) setSelectedChoice(firstChoiceId);
  }, [selectedChoice, firstChoiceId]);

  const simulateDone = useCallback(() => {
    setPhase('done');
  }, []);

  const phaseColor = (p: Phase) => p === phase ? '#F5D060' : 'rgba(255,255,255,0.3)';

  if (loadingScenes && entries.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 20px', gap: 16,
        background: 'rgba(11,15,12,0.7)', border: '1px solid rgba(40,55,42,0.3)',
        minHeight: 240,
      }}>
        <div style={{ position: 'relative', width: 40, height: 40 }}>
          <Loader size={40} style={{
            color: 'rgba(245,208,96,0.2)',
            animation: 'spin 1.4s linear infinite',
            position: 'absolute', inset: 0,
          }} />
          <Database size={16} style={{
            color: 'rgba(245,208,96,0.45)',
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>
        <span style={{ fontSize: 12, fontFamily: UF, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          Loading Skull Gate scene from database…
        </span>
      </div>
    );
  }

  // DB error — no fallback rendered
  if (loadError && entries.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        padding: '40px 20px',
        background: 'rgba(11,15,12,0.7)', border: '1px solid rgba(180,40,40,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} style={{ color: 'rgba(200,60,60,0.75)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,60,60,0.75)' }}>
            Database Load Failed
          </span>
        </div>
        <div style={{ fontSize: 11, fontFamily: UF, color: 'rgba(200,80,80,0.7)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          {loadError}
        </div>
        <div style={{ fontSize: 10, fontFamily: UF, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.6 }}>
          Static defaults are not shown to prevent masking DB issues.<br />
          Check admin auth and DB connection, then reload.
        </div>
        <button
          onClick={loadScenes}
          disabled={loadingScenes}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', fontSize: 11, fontFamily: UF,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            border: '1px solid rgba(245,208,96,0.35)',
            background: 'rgba(245,208,96,0.06)',
            color: 'rgba(245,208,96,0.8)', cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  // DB empty — no scenes exist yet
  if (!loadingScenes && entries.length === 0 && !loadError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        padding: '40px 20px',
        background: 'rgba(11,15,12,0.7)', border: '1px solid rgba(40,55,42,0.3)',
      }}>
        <Database size={28} style={{ color: 'rgba(245,208,96,0.22)' }} />
        <span style={{ fontSize: 12, fontFamily: UF, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          No Scenes in Database
        </span>
        <div style={{ fontSize: 10, fontFamily: UF, color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 1.7 }}>
          Go to Gate Scene Editor to create or seed scenes.
        </div>
        <button
          onClick={loadScenes}
          disabled={loadingScenes}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', fontSize: 11, fontFamily: UF,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            border: '1px solid rgba(50,70,50,0.4)', background: 'transparent',
            color: 'rgba(255,255,255,0.38)', cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} />
          Reload
        </button>
      </div>
    );
  }

  if (!scene) {
    return (
      <div style={{ padding: '40px 0', color: 'rgba(200,60,60,0.7)', fontFamily: UF, fontSize: 11 }}>
        No scene available. Reload or check the Scene Editor.
      </div>
    );
  }

  const isDbSource = entry.sourceId !== null;

  // Background layer asset path for debug bar
  const bgLayer = scene.layers.find((l) => l.role === 'background');
  const bgPath  = bgLayer?.assetPath ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} style={{ color: 'rgba(255,154,48,0.7)', flexShrink: 0 }} strokeWidth={1.5} />
          <span style={{ fontFamily: FF, fontSize: 14, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)' }}>
            Skull Gate Scene Preview
          </span>
          <span style={{
            fontSize: 9, fontFamily: UF, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', padding: '2px 7px',
          }}>
            Renderer Test
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={loadScenes}
            disabled={loadingScenes}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', fontSize: 10, fontFamily: UF,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              border: '1px solid rgba(50,70,50,0.4)', background: 'transparent',
              color: 'rgba(255,255,255,0.38)', cursor: loadingScenes ? 'not-allowed' : 'pointer',
              opacity: loadingScenes ? 0.6 : 1,
            }}
          >
            {loadingScenes ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
            {loadingScenes ? 'Loading…' : 'Reload'}
          </button>
          <button
            onClick={handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', fontSize: 10, fontFamily: UF,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              border: '1px solid rgba(180,30,30,0.3)', background: 'rgba(180,30,30,0.06)',
              color: 'rgba(200,60,60,0.75)', cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>
      </div>

      {/* ── Load error banner (only when entries exist from previous load) ── */}
      {loadError && entries.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', background: 'rgba(180,40,40,0.08)',
          border: '1px solid rgba(180,40,40,0.3)',
          fontSize: 10, fontFamily: UF, color: 'rgba(200,70,70,0.85)',
        }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          DB reload failed: {loadError} — showing last loaded scenes.
        </div>
      )}

      {/* ── Debug info bar ── */}
      <div style={{
        display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.28)',
        border: `1px solid ${isDbSource ? 'rgba(40,55,42,0.5)' : 'rgba(180,140,0,0.25)'}`,
        fontSize: 9, fontFamily: UF, letterSpacing: '0.12em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Database size={10} style={{ color: isDbSource ? 'rgba(120,200,90,0.7)' : 'rgba(200,175,80,0.6)', flexShrink: 0 }} />
          <span style={{ color: isDbSource ? 'rgba(120,200,90,0.7)' : 'rgba(200,175,80,0.6)', textTransform: 'uppercase' }}>
            {isDbSource ? 'db (draft)' : 'static fallback'}
          </span>
        </div>
        {entry.sourceId && (
          <span style={{ color: 'rgba(255,255,255,0.22)' }}>
            id: <span style={{ color: 'rgba(245,208,96,0.55)' }}>{entry.sourceId.slice(0, 8)}…</span>
          </span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.22)' }}>
          slug: <span style={{ color: 'rgba(255,154,48,0.6)' }}>{entry.slug}</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.22)' }}>
          layers: <span style={{ color: 'rgba(255,255,255,0.45)' }}>{scene.layers.length}</span>
        </span>
        {entry.updatedAt && (
          <span style={{ color: 'rgba(255,255,255,0.22)' }}>
            updated: <span style={{ color: 'rgba(255,255,255,0.38)' }}>
              {new Date(entry.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
        )}
        {bgPath && (
          <span style={{ color: 'rgba(255,255,255,0.22)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            bg: <span style={{ color: 'rgba(120,200,90,0.55)' }} title={bgPath}>{bgPath.split('/').slice(-2).join('/')}</span>
          </span>
        )}
        {entries.length > 0 && (
          <span style={{ color: 'rgba(255,255,255,0.22)' }}>
            {entries.length} scene{entries.length !== 1 ? 's' : ''} loaded
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Preview frame ── */}
        <div style={{ flex: '0 0 auto' }}>
          {/* 9:16 mobile frame — 280 × 497 */}
          <div style={{
            width: 280, height: 497,
            position: 'relative',
            border: '1px solid rgba(60,80,60,0.5)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.75)',
            background: '#070A08',
          }}>
            <SkullGateSceneRenderer
              sceneConfig={scene}
              mode="preview"
              selectedChoiceId={selectedChoice}
              resultOutcome={outcome}
              revealPhase={phase}
              onChoiceSelect={handleChoiceSelect}
              onCta={handleCta}
              showEditorOutlines={showOutlines}
            />
          </div>
          {/* Frame caption */}
          <div style={{
            textAlign: 'center', marginTop: 6,
            fontSize: 9, fontFamily: UF, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
          }}>
            280 × 497 · 9:16
          </div>
          {/* Outlines toggle under frame */}
          <button
            onClick={() => setShowOutlines((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              marginTop: 8, width: '100%',
              padding: '5px 10px', fontSize: 9, fontFamily: UF,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              border: `1px solid ${showOutlines ? 'rgba(120,200,90,0.4)' : 'rgba(50,70,50,0.3)'}`,
              background: showOutlines ? 'rgba(120,200,90,0.06)' : 'transparent',
              color: showOutlines ? 'rgba(140,220,100,0.8)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}
          >
            {showOutlines ? <Eye size={11} /> : <EyeOff size={11} />}
            {showOutlines ? 'Outlines On' : 'Outlines Off'}
          </button>
        </div>

        {/* ── Controls panel ── */}
        <div style={{
          flex: 1, minWidth: 240,
          display: 'flex', flexDirection: 'column', gap: 14,
          padding: '14px 16px',
          background: 'rgba(11,15,12,0.8)',
          border: '1px solid rgba(40,55,42,0.4)',
        }}>

          {/* Scene title */}
          <div>
            <div style={{ fontFamily: FF, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              {scene.title}
            </div>
            <div style={{ fontSize: 10, fontFamily: UF, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em' }}>
              {scene.templateType} · {scene.status} · weight {scene.weight}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(40,55,42,0.4)' }} />

          {/* Scene selector — always shown so admins can switch */}
          <Row label="Scene">
            {entries.map((e, i) => (
              <Chip key={e.slug} active={sceneIdx === i} onClick={() => selectScene(i, e.slug)}>
                {e.config.title}
              </Chip>
            ))}
          </Row>

          {/* Phase */}
          <Row label="Phase">
            {(['idle', 'selected', 'revealing', 'done'] as Phase[]).map((p) => (
              <Chip key={p} active={phase === p} onClick={() => setPhase(p)}>
                {p}
              </Chip>
            ))}
          </Row>

          {/* Outcome */}
          <Row label="Outcome">
            <Chip active={outcome === null} onClick={() => setOutcome(null)}>None</Chip>
            <Chip active={outcome === 'SURVIVE'} onClick={() => setOutcome('SURVIVE')}>Survive</Chip>
            <Chip active={outcome === 'DIE'} onClick={() => setOutcome('DIE')} danger>Die</Chip>
          </Row>

          {/* Choice — dynamic from scene layers */}
          <Row label="Selected Choice">
            <Chip active={selectedChoice === null} onClick={() => setSelectedChoice(null)}>None</Chip>
            {choiceIds.map(({ id, name }) => (
              <Chip
                key={id}
                active={selectedChoice === id}
                onClick={() => { setSelectedChoice(id); if (phase === 'idle') setPhase('selected'); }}
              >
                {name}
              </Chip>
            ))}
          </Row>

          <div style={{ height: 1, background: 'rgba(40,55,42,0.3)' }} />

          {/* Scenario actions */}
          <div>
            <SectionLabel>Simulate Scenario</SectionLabel>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <ActionButton onClick={handleReset} label="↩ Reset to Idle" />
              <ActionButton
                onClick={() => {
                  if (!selectedChoice) setSelectedChoice(firstChoiceId);
                  setPhase('selected');
                  setOutcome(null);
                }}
                label="Select Choice"
              />
              <ActionButton onClick={handleCta} label="Press CTA" />
              <ActionButton onClick={simulateSurvive} label="→ Survive" accent />
              <ActionButton onClick={simulateDie} label="→ Die" />
              <ActionButton onClick={simulateDone} label="→ Done" />
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(40,55,42,0.3)' }} />

          {/* State readout */}
          <div style={{
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.32)',
            border: '1px solid rgba(40,55,42,0.3)',
            fontFamily: "'monospace', Courier, monospace",
            fontSize: 10, lineHeight: 1.75,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.35)' }}>
              scene: <span style={{ color: 'rgba(245,208,96,0.75)' }}>{entry.slug}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)' }}>
              phase:{' '}
              <span style={{ color: phaseColor(phase) }}>{phase}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)' }}>
              outcome:{' '}
              <span style={{
                color: outcome === 'SURVIVE'
                  ? 'rgba(120,200,90,0.85)'
                  : outcome === 'DIE'
                  ? 'rgba(204,68,68,0.85)'
                  : 'rgba(255,255,255,0.28)',
              }}>
                {outcome ?? 'none'}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)' }}>
              choice: <span style={{ color: 'rgba(255,154,48,0.8)' }}>{selectedChoice ?? 'none'}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)' }}>
              layers: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{scene.layers.length}</span>{' '}
              visible: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{scene.layers.filter(l => l.visible).length}</span>
            </div>
          </div>

          {/* Layer list */}
          <div>
            <SectionLabel>Layer Stack (z-order)</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[...scene.layers]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((layer) => (
                  <div
                    key={layer.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '3px 8px',
                      background: layer.visible ? 'rgba(18,26,20,0.6)' : 'rgba(10,14,11,0.35)',
                      border: '1px solid rgba(40,55,42,0.18)',
                      opacity: layer.visible ? 1 : 0.4,
                    }}
                  >
                    <span style={{ fontSize: 8, fontFamily: UF, color: 'rgba(255,255,255,0.2)', minWidth: 14, textAlign: 'right' }}>
                      {layer.zIndex}
                    </span>
                    <span style={{
                      fontSize: 8, fontFamily: UF, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: layer.type === 'button'
                        ? 'rgba(120,180,255,0.7)'
                        : layer.role === 'choice_object'
                        ? 'rgba(255,154,48,0.75)'
                        : layer.role.startsWith('gate_door')
                        ? 'rgba(120,200,90,0.7)'
                        : layer.type === 'text'
                        ? 'rgba(200,200,120,0.65)'
                        : 'rgba(255,255,255,0.28)',
                      background: 'rgba(0,0,0,0.28)',
                      padding: '1px 5px', flexShrink: 0,
                    }}>
                      {layer.type === 'button' ? 'btn' : layer.role.replace('_', ' ')}
                    </span>
                    <span style={{
                      fontSize: 9, fontFamily: UF, color: 'rgba(255,255,255,0.45)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {layer.name}
                    </span>
                    {/* Asset / procedural indicator */}
                    <span style={{ fontSize: 8, flexShrink: 0 }}>
                      {layer.assetPath
                        ? <span style={{ color: 'rgba(120,200,90,0.65)' }}>●</span>
                        : layer.type === 'text' || layer.type === 'button' || layer.type === 'particle' || layer.type === 'effect'
                        ? <span style={{ color: 'rgba(200,180,80,0.5)' }}>~</span>
                        : <span style={{ color: 'rgba(255,255,255,0.15)' }}>○</span>
                      }
                    </span>
                  </div>
                ))}
            </div>
            <div style={{
              marginTop: 6, fontSize: 9, fontFamily: UF, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.2)',
            }}>
              ● asset  ~ procedural / text  ○ no asset (hidden)
            </div>
          </div>

        </div>
      </div>

      {/* ── Assignment test panel ── */}
      <AssignmentTestPanel />
    </div>
  );
}
