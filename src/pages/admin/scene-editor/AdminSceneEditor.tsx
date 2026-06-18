// Admin: Skull Gate Scene Editor — Prompt 21 created, Prompt 22 drag/resize, Prompt 23 DB persistence
//
// Loads scenes from Supabase skull_gate_scenes table via admin edge function.
// Falls back to DEFAULT_SKULL_GATE_SCENES if DB returns nothing or fails.
//
// Draft/Publish workflow:
//   - All edits go to draft_config_json (local state + Save Draft)
//   - Published config only changes after explicit Publish action
//   - Publish validates config server-side before writing published_config_json
//
// Does NOT affect live gameplay. SkullGateChallenge.tsx is not imported here.

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  PenLine, Eye, Copy, Download, RotateCcw, ChevronDown, ChevronRight,
  Code, CheckCircle, Save, Globe, RefreshCw, Archive, AlertCircle,
  Loader, Plus, Search, X as XIcon,
} from 'lucide-react';
import type { SkullGateSceneConfig, SceneLayer, LayerType } from '../../../lib/types';
import { DEFAULT_SKULL_GATE_SCENES } from '../../../lib/skullGateScenes';
import { useSkullGateScenes, type SkullGateSceneRow } from '../../../hooks/useSkullGateScenes';
import { useSkullGateAssets } from '../../../hooks/useSkullGateAssets';
import SceneEditorCanvas from './SceneEditorCanvas';
import SceneEditorLayerList from './SceneEditorLayerList';
import SceneEditorLayerSettings from './SceneEditorLayerSettings';
import SceneEditorSceneSettings from './SceneEditorSceneSettings';
import AdminAssetLibrary from './AdminAssetLibrary';

// ── Types ─────────────────────────────────────────────────────────────────────

type PreviewPhase   = 'idle' | 'selected' | 'revealing' | 'done';
type PreviewOutcome = 'SURVIVE' | 'DIE' | null;
type CanvasMode     = 'editor' | 'preview';
type LeftTab        = 'scenes' | 'assets';

const UF = "'Inter', system-ui, sans-serif";
const FF = "'Metal Mania','Cinzel',Georgia,serif";

// ── Layer factory ─────────────────────────────────────────────────────────────

function makeNewLayer(type: LayerType, existingLayers: SceneLayer[]): SceneLayer {
  const maxZ = existingLayers.length ? Math.max(...existingLayers.map((l) => l.zIndex)) : 0;
  const base: SceneLayer = {
    id:      `layer_${Date.now()}`,
    name:    `New ${type} layer`,
    type,
    role:    type === 'text' ? 'text' : type === 'button' ? 'button' : type === 'particle' ? 'particle_effect' : 'none',
    zIndex:  maxZ + 1,
    visible: true,
    x: 10, y: 10,
    width:  type === 'text' ? 80 : 40,
    height: type === 'text' ? 10 : 40,
    opacity: 1,
  };
  if (type === 'text')   base.text = 'New text';
  if (type === 'button') { base.text = 'Button'; base.clickAction = 'cta'; }
  return base;
}

// ── Validation helpers (mirrors server logic for instant feedback) ─────────────

function validateConfig(cfg: SkullGateSceneConfig): string[] {
  const errs: string[] = [];
  if (!cfg.title)        errs.push('Scene title is missing');
  if (!cfg.slug)         errs.push('Scene slug is missing');
  if (!cfg.templateType) errs.push('templateType is missing');
  if (!Array.isArray(cfg.layers)) { errs.push('layers must be an array'); return errs; }

  const choices = cfg.layers.filter((l) => l.role === 'choice_object' && l.clickable && l.choiceId);
  if (cfg.templateType === 'choice_2' && choices.length < 2)
    errs.push('choice_2 scenes need at least 2 clickable choice_object layers with choiceId');
  if (cfg.templateType === 'choice_3' && choices.length < 3)
    errs.push('choice_3 scenes need at least 3 clickable choice_object layers with choiceId');

  cfg.layers
    .filter((l) => l.role === 'gate_door_left' || l.role === 'gate_door_right')
    .forEach((l) => {
      if (!l.doorAnimation)
        errs.push(`Door layer "${l.name}" has no doorAnimation config`);
      else {
        if (!l.doorAnimation.preset)  errs.push(`Door layer "${l.name}" doorAnimation missing preset`);
        if (!l.doorAnimation.trigger) errs.push(`Door layer "${l.name}" doorAnimation missing trigger`);
      }
    });
  return errs;
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 10px', fontSize: 9, fontFamily: UF,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      border: `1px solid ${active ? 'rgba(245,208,96,0.4)' : 'rgba(40,55,42,0.35)'}`,
      background: active ? 'rgba(245,208,96,0.08)' : 'transparent',
      color: active ? '#F5D060' : 'rgba(255,255,255,0.38)',
      cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  );
}

function Chip({ label, active, onClick, danger = false }: {
  label: string; active: boolean; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 9px', fontSize: 9, fontFamily: UF,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      border: `1px solid ${danger ? (active ? 'rgba(204,68,68,0.5)' : 'rgba(80,20,20,0.35)') : (active ? 'rgba(245,208,96,0.45)' : 'rgba(40,55,42,0.35)')}`,
      background: active ? (danger ? 'rgba(204,68,68,0.1)' : 'rgba(245,208,96,0.08)') : 'transparent',
      color: active ? (danger ? 'rgba(220,80,80,0.9)' : '#F5D060') : 'rgba(255,255,255,0.35)',
      cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  );
}

function ActionBtn({ label, onClick, icon, accent = false, danger = false, small = false, disabled = false }: {
  label: string; onClick: () => void; icon?: React.ReactNode;
  accent?: boolean; danger?: boolean; small?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: small ? '4px 8px' : '6px 11px',
      fontSize: small ? 9 : 10, fontFamily: UF,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      border: `1px solid ${danger ? 'rgba(180,40,40,0.4)' : accent ? 'rgba(120,190,80,0.4)' : 'rgba(50,70,50,0.38)'}`,
      background: danger ? 'rgba(180,40,40,0.06)' : accent ? 'rgba(120,190,80,0.07)' : 'rgba(11,15,12,0.6)',
      color: danger ? 'rgba(200,60,60,0.8)' : accent ? 'rgba(150,220,100,0.85)' : 'rgba(255,255,255,0.45)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.15s ease', whiteSpace: 'nowrap',
    }}>
      {icon}{label}
    </button>
  );
}

function CollapsibleSection({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid rgba(30,42,32,0.6)' }}>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '8px 10px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: UF, fontSize: 9, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
      }}>
        {title}
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && <div style={{ paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

// ── Scene list sidebar item ───────────────────────────────────────────────────

function SceneListItem({ row, active, onClick }: {
  row: SkullGateSceneRow; active: boolean; onClick: () => void;
}) {
  const statusColor = row.status === 'published' ? 'rgba(120,200,90,0.75)'
    : row.status === 'archived' ? 'rgba(180,60,60,0.65)'
    : 'rgba(200,175,80,0.6)';

  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      width: '100%', padding: '7px 10px', textAlign: 'left',
      background: active ? 'rgba(245,208,96,0.07)' : 'transparent',
      borderLeft: `2px solid ${active ? 'rgba(245,208,96,0.55)' : 'transparent'}`,
      borderBottom: '1px solid rgba(30,40,32,0.5)',
      border: 'none', cursor: 'pointer',
      borderLeftWidth: 2,
      borderLeftStyle: 'solid',
      borderLeftColor: active ? 'rgba(245,208,96,0.55)' : 'transparent',
      borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(30,40,32,0.5)',
    }}>
      <div style={{ fontSize: 10, fontFamily: UF, color: active ? 'rgba(245,208,96,0.9)' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.title}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 8, fontFamily: UF, letterSpacing: '0.12em', textTransform: 'uppercase', color: statusColor }}>
          {row.status}
        </span>
        <span style={{ fontSize: 8, fontFamily: UF, color: 'rgba(255,255,255,0.22)' }}>
          {row.slug}
        </span>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminSceneEditor() {
  const sceneApi  = useSkullGateScenes();
  const assetApi  = useSkullGateAssets();

  // Left panel tab
  const [leftTab, setLeftTab] = useState<LeftTab>('scenes');

  // DB rows
  const [rows,    setRows]    = useState<SkullGateSceneRow[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Active scene selection
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Search / filter for scene list
  const [sceneSearch,  setSceneSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // New gate scene create form
  const [showCreateForm,  setShowCreateForm]  = useState(false);
  const [createTitle,     setCreateTitle]     = useState('');
  const [createSlug,      setCreateSlug]      = useState('');
  const [createTemplate,  setCreateTemplate]  = useState<'choice_2' | 'choice_3' | 'ritual_roll'>('choice_2');
  const [createError,     setCreateError]     = useState<string | null>(null);
  const [creating,        setCreating]        = useState(false);

  // Working draft: local edits on top of the row's draft_config_json
  const [draft,      setDraft]      = useState<SkullGateSceneConfig | null>(null);
  const [isDirty,    setIsDirty]    = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validation errors (publish-gate)
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishErrors,    setPublishErrors]    = useState<string[]>([]);

  // Layer/canvas state
  const [selectedLayerId,    setSelectedLayerId]    = useState<string | null>(null);
  // Multi-tab layer settings: ordered list of open layer IDs, null = Layers tab active
  const [openLayerIds,       setOpenLayerIds]       = useState<string[]>([]);
  const [activeLayerTabId,   setActiveLayerTabId]   = useState<string | null>(null);
  const [sceneSettingsOpen,  setSceneSettingsOpen]  = useState(false);
  const [previewControlsOpen, setPreviewControlsOpen] = useState(true);

  // Preview state
  const [previewChoice,  setPreviewChoice]  = useState<string | null>(null);
  const [previewOutcome, setPreviewOutcome] = useState<PreviewOutcome>(null);
  const [previewPhase,   setPreviewPhase]   = useState<PreviewPhase>('idle');
  const [canvasMode,     setCanvasMode]     = useState<CanvasMode>('editor');
  const [showOutlines,   setShowOutlines]   = useState(true);

  // JSON debug
  const [showJson,  setShowJson]  = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonDraft, setJsonDraft] = useState('');
  const [copied,    setCopied]    = useState(false);

  // ── Load scenes from DB ──────────────────────────────────────────────────────

  const loadScenes = useCallback(async () => {
    const data = await sceneApi.listScenes();
    if (data && data.length > 0) {
      setRows(data);
      setDbReady(true);
      setDbError(null);
      // Auto-select first scene if none selected
      setActiveRowId((prev) => prev ?? data[0].id);
    } else if (data && data.length === 0) {
      // DB empty — use local fallback
      setDbReady(false);
      setDbError(null);
    } else {
      // Request failed
      setDbError(sceneApi.error || 'Failed to load scenes');
      setDbReady(false);
    }
  }, [sceneApi]);

  useEffect(() => { loadScenes(); assetApi.listAssets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive active row + initialise draft ────────────────────────────────────

  const activeRow = rows.find((r) => r.id === activeRowId) ?? null;

  // When active row changes, reset draft from DB row's draft_config_json
  useEffect(() => {
    if (activeRow) {
      setDraft({ ...activeRow.draft_config_json });
      setIsDirty(false);
      setSelectedLayerId(null);
      setOpenLayerIds([]);
      setActiveLayerTabId(null);
      setValidationErrors([]);
      setPublishErrors([]);
    } else if (!dbReady && DEFAULT_SKULL_GATE_SCENES.length > 0) {
      // Fallback to local default
      setDraft({ ...DEFAULT_SKULL_GATE_SCENES[0], layers: DEFAULT_SKULL_GATE_SCENES[0].layers.map((l) => ({ ...l })) });
      setIsDirty(false);
    }
  }, [activeRow, dbReady]);

  // Active scene is working draft (or local fallback)
  const scene = draft;

  // ── Draft mutation helpers ───────────────────────────────────────────────────

  const updateDraft = useCallback((updated: SkullGateSceneConfig) => {
    setDraft(updated);
    setIsDirty(true);
    setValidationErrors(validateConfig(updated));
  }, []);

  const updateLayers = useCallback((layers: SceneLayer[]) => {
    if (!draft) return;
    updateDraft({ ...draft, layers });
  }, [draft, updateDraft]);

  const setLayerField = useCallback((updated: SceneLayer) => {
    if (!draft) return;
    updateLayers(draft.layers.map((l) => (l.id === updated.id ? updated : l)));
  }, [draft, updateLayers]);

  // ── Layer list mutations ─────────────────────────────────────────────────────

  const toggleVisible = useCallback((id: string) => {
    if (!draft) return;
    updateLayers(draft.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l));
  }, [draft, updateLayers]);

  const toggleLocked = useCallback((id: string) => {
    if (!draft) return;
    updateLayers(draft.layers.map((l) => l.id === id ? { ...l, locked: !l.locked } : l));
  }, [draft, updateLayers]);

  const moveLayerUp = useCallback((id: string) => {
    if (!draft) return;
    const sorted = [...draft.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx >= sorted.length - 1) return;
    const target = sorted[idx + 1];
    updateLayers(draft.layers.map((l) => {
      if (l.id === id)        return { ...l, zIndex: target.zIndex };
      if (l.id === target.id) return { ...l, zIndex: sorted[idx].zIndex };
      return l;
    }));
  }, [draft, updateLayers]);

  const moveLayerDown = useCallback((id: string) => {
    if (!draft) return;
    const sorted = [...draft.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    const target = sorted[idx - 1];
    updateLayers(draft.layers.map((l) => {
      if (l.id === id)        return { ...l, zIndex: target.zIndex };
      if (l.id === target.id) return { ...l, zIndex: sorted[idx].zIndex };
      return l;
    }));
  }, [draft, updateLayers]);

  const duplicateLayer = useCallback((id: string) => {
    if (!draft) return;
    const src = draft.layers.find((l) => l.id === id);
    if (!src) return;
    const maxZ = Math.max(...draft.layers.map((l) => l.zIndex));
    const copy: SceneLayer = { ...src, id: `layer_${Date.now()}`, name: `${src.name} (copy)`, zIndex: maxZ + 1 };
    updateLayers([...draft.layers, copy]);
    setSelectedLayerId(copy.id);
  }, [draft, updateLayers]);

  const deleteLayer = useCallback((id: string) => {
    if (!draft) return;
    updateLayers(draft.layers.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
    setOpenLayerIds((prev) => {
      const next = prev.filter((x) => x !== id);
      setActiveLayerTabId((cur) => {
        if (cur !== id) return cur;
        const idx = prev.indexOf(id);
        return next[idx] ?? next[idx - 1] ?? null;
      });
      return next;
    });
  }, [draft, updateLayers, selectedLayerId]);

  const reorderLayer = useCallback((draggedId: string, targetId: string) => {
    if (!draft) return;
    // Sort highest z first (matches visual list: top row = highest z)
    const sorted = [...draft.layers].sort((a, b) => b.zIndex - a.zIndex);
    const dragIdx = sorted.findIndex((l) => l.id === draggedId);
    if (dragIdx === -1) return;
    const [dragged] = sorted.splice(dragIdx, 1);
    const targetIdx = sorted.findIndex((l) => l.id === targetId);
    if (targetIdx === -1) return;
    // Insert before target (target moves down one slot)
    sorted.splice(targetIdx, 0, dragged);
    // Reassign zIndex sequentially: position 0 (top) gets highest z
    const n = sorted.length;
    updateLayers(draft.layers.map((l) => {
      const idx = sorted.findIndex((s) => s.id === l.id);
      return { ...l, zIndex: n - idx };
    }));
  }, [draft, updateLayers]);

  const addLayer = useCallback((type: LayerType) => {
    if (!draft) return;
    const newLayer = makeNewLayer(type, draft.layers);
    updateLayers([...draft.layers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setOpenLayerIds((prev) => prev.includes(newLayer.id) ? prev : [...prev, newLayer.id]);
    setActiveLayerTabId(newLayer.id);
  }, [draft, updateLayers]);

  const handleSelectLayer = useCallback((id: string | null) => {
    setSelectedLayerId(id);
    // Don't auto-switch tabs — user controls which tab is open
  }, []);

  const handleOpenLayerSettings = useCallback((id: string) => {
    setSelectedLayerId(id);
    setOpenLayerIds((prev) => prev.includes(id) ? prev : [...prev, id]);
    setActiveLayerTabId(id);
  }, []);

  const closeLayerTab = useCallback((id: string) => {
    setOpenLayerIds((prev) => {
      const next = prev.filter((x) => x !== id);
      setActiveLayerTabId((cur) => {
        if (cur !== id) return cur;
        // Closed the active tab — move to adjacent or back to Layers
        const idx = prev.indexOf(id);
        return next[idx] ?? next[idx - 1] ?? null;
      });
      return next;
    });
  }, []);

  // ── DB operations ────────────────────────────────────────────────────────────

  const handleSaveDraft = useCallback(async () => {
    if (!activeRow || !draft) return;
    setSaveStatus('saving');
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);

    const result = await sceneApi.saveDraft(activeRow.id, draft, {
      title:         draft.title,
      description:   draft.description,
      template_type: draft.templateType,
      weight:        draft.weight,
      cooldown_days: draft.cooldownDays,
      min_streak:    draft.minStreak,
      max_streak:    draft.maxStreak ?? null,
    });

    if (result?.success) {
      setSaveStatus('saved');
      setIsDirty(false);
      // Refresh rows to get updated timestamps
      const refreshed = await sceneApi.listScenes();
      if (refreshed) setRows(refreshed);
      saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
      saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [activeRow, draft, sceneApi]);

  const handlePublish = useCallback(async () => {
    if (!activeRow || !draft) return;

    // Client-side validation first
    const clientErrors = validateConfig(draft);
    if (clientErrors.length > 0) {
      setPublishErrors(clientErrors);
      return;
    }

    // Save draft first to ensure DB is up to date
    await sceneApi.saveDraft(activeRow.id, draft, {
      title: draft.title, description: draft.description,
      template_type: draft.templateType,
    });

    const result = await sceneApi.publishScene(activeRow.id);
    if (!result) {
      setPublishErrors([sceneApi.error || 'Publish failed']);
      return;
    }
    if (!result.success && result.validation_errors) {
      setPublishErrors(result.validation_errors);
      return;
    }

    setPublishErrors([]);
    setIsDirty(false);
    // Refresh
    const refreshed = await sceneApi.listScenes();
    if (refreshed) {
      setRows(refreshed);
      // Update draft from refreshed row so status badge reflects published
      const newRow = refreshed.find((r) => r.id === activeRow.id);
      if (newRow) setDraft({ ...newRow.draft_config_json });
    }
  }, [activeRow, draft, sceneApi]);

  const handleRevertDraft = useCallback(async () => {
    if (!activeRow) return;
    if (!activeRow.published_config_json) return;
    const result = await sceneApi.revertDraft(activeRow.id);
    if (result?.success) {
      const refreshed = await sceneApi.listScenes();
      if (refreshed) {
        setRows(refreshed);
        const newRow = refreshed.find((r) => r.id === activeRow.id);
        if (newRow) {
          setDraft({ ...newRow.draft_config_json });
          setIsDirty(false);
        }
      }
    }
  }, [activeRow, sceneApi]);

  const handleDuplicate = useCallback(async () => {
    if (!activeRow) return;
    const result = await sceneApi.duplicateScene(activeRow.id);
    if (result?.success && result.scene) {
      const refreshed = await sceneApi.listScenes();
      if (refreshed) {
        setRows(refreshed);
        setActiveRowId(result.scene.id);
      }
    }
  }, [activeRow, sceneApi]);

  const handleArchive = useCallback(async () => {
    if (!activeRow) return;
    if (!window.confirm(`Archive "${activeRow.title}"? This will disable live assignment.`)) return;
    await sceneApi.archiveScene(activeRow.id);
    const refreshed = await sceneApi.listScenes();
    if (refreshed) setRows(refreshed);
  }, [activeRow, sceneApi]);

  const handleCreateScene = useCallback(async () => {
    if (!createTitle.trim() || !createSlug.trim()) {
      setCreateError('Title and slug are required');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(createSlug)) {
      setCreateError('Slug must be lowercase letters, numbers, hyphens, or underscores');
      return;
    }
    setCreating(true);
    setCreateError(null);
    const initialConfig: SkullGateSceneConfig = {
      id:           createSlug,
      slug:         createSlug,
      title:        createTitle.trim(),
      templateType: createTemplate,
      layers:       [],
    };
    const result = await sceneApi.createScene(createSlug, createTitle.trim(), initialConfig);
    setCreating(false);
    if (!result) {
      setCreateError(sceneApi.error || 'Failed to create scene');
      return;
    }
    setShowCreateForm(false);
    setCreateTitle('');
    setCreateSlug('');
    setCreateTemplate('choice_2');
    const refreshed = await sceneApi.listScenes();
    if (refreshed) {
      setRows(refreshed);
      setActiveRowId(result.id);
    }
  }, [createTitle, createSlug, createTemplate, sceneApi]);

  // ── Preview ──────────────────────────────────────────────────────────────────

  const handlePreviewChoice = useCallback((id: string) => { setPreviewChoice(id); setPreviewPhase('selected'); }, []);
  const handlePreviewCta    = useCallback(() => { if (previewPhase === 'selected') setPreviewPhase('revealing'); }, [previewPhase]);
  const resetPreview        = useCallback(() => { setPreviewChoice(null); setPreviewOutcome(null); setPreviewPhase('idle'); }, []);
  const switchToPreview     = useCallback(() => { setCanvasMode('preview'); resetPreview(); }, [resetPreview]);

  // ── JSON ─────────────────────────────────────────────────────────────────────

  const prettyJson = useMemo(() => scene ? JSON.stringify(scene, null, 2) : '', [scene]);

  const copyJson = useCallback(async () => {
    if (!prettyJson) return;
    await navigator.clipboard.writeText(prettyJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [prettyJson]);

  const downloadJson = useCallback(() => {
    if (!scene) return;
    const blob = new Blob([prettyJson], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${scene.slug}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [prettyJson, scene]);

  const applyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonDraft) as SkullGateSceneConfig;
      if (!parsed.id || !Array.isArray(parsed.layers)) throw new Error('Missing id or layers array');
      updateDraft(parsed);
      setJsonError(null);
    } catch (e) { setJsonError((e as Error).message); }
  }, [jsonDraft, updateDraft]);

  const openJson = useCallback(() => { setJsonDraft(prettyJson); setShowJson(true); }, [prettyJson]);

  // ── Selected layer ────────────────────────────────────────────────────────────

  const selectedLayer = scene?.layers.find((l) => l.id === selectedLayerId) ?? null;

  // ── Save status label ─────────────────────────────────────────────────────────

  const saveStatusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved'  ? 'Saved'
    : saveStatus === 'error'  ? 'Save failed'
    : isDirty ? 'Unsaved changes'
    : 'All saved';

  const saveStatusColor = saveStatus === 'error' ? 'rgba(200,60,60,0.75)'
    : saveStatus === 'saved' ? 'rgba(120,200,90,0.75)'
    : isDirty ? 'rgba(245,208,96,0.65)'
    : 'rgba(255,255,255,0.22)';

  // ── Active row status badge ───────────────────────────────────────────────────

  const rowStatus = activeRow?.status ?? null;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!scene) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
        {sceneApi.loading
          ? <><Loader size={14} style={{ color: 'rgba(245,208,96,0.6)', animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 11, fontFamily: UF, color: 'rgba(255,255,255,0.4)' }}>Loading scenes…</span></>
          : <span style={{ fontSize: 11, fontFamily: UF, color: 'rgba(200,60,60,0.6)' }}>{dbError || 'No scenes found'}</span>
        }
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

      {/* ── Top toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, padding: '8px 0',
        borderBottom: '1px solid rgba(40,55,42,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PenLine size={15} style={{ color: 'rgba(255,154,48,0.7)', flexShrink: 0 }} strokeWidth={1.5} />
          <span style={{ fontFamily: FF, fontSize: 13, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.72)' }}>
            Gate Scene Editor
          </span>
          {/* DB status */}
          <span style={{
            fontSize: 8, fontFamily: UF, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '2px 6px',
            border: `1px solid ${dbReady ? 'rgba(120,190,80,0.35)' : 'rgba(180,140,0,0.3)'}`,
            color: dbReady ? 'rgba(130,200,90,0.65)' : 'rgba(200,175,80,0.5)',
          }}>
            {dbReady ? 'DB' : 'Local Fallback'}
          </span>
          {/* Row status */}
          {rowStatus && (
            <span style={{
              fontSize: 8, fontFamily: UF, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '2px 6px',
              border: `1px solid ${rowStatus === 'published' ? 'rgba(120,190,80,0.35)' : rowStatus === 'archived' ? 'rgba(180,40,40,0.35)' : 'rgba(180,140,0,0.3)'}`,
              color: rowStatus === 'published' ? 'rgba(130,200,90,0.7)' : rowStatus === 'archived' ? 'rgba(200,60,60,0.7)' : 'rgba(200,175,80,0.6)',
            }}>
              {rowStatus}
            </span>
          )}
          {/* Canvas mode */}
          <span style={{
            fontSize: 8, fontFamily: UF, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '2px 6px',
            border: `1px solid ${canvasMode === 'editor' ? 'rgba(245,208,96,0.3)' : 'rgba(120,190,80,0.3)'}`,
            color: canvasMode === 'editor' ? 'rgba(245,208,96,0.6)' : 'rgba(140,210,100,0.6)',
          }}>
            {canvasMode}
          </span>
          {/* Save status */}
          <span style={{ fontSize: 8, fontFamily: UF, color: saveStatusColor }}>
            {saveStatusLabel}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Save Draft */}
          <ActionBtn
            label={saveStatus === 'saving' ? 'Saving…' : 'Save Draft'}
            onClick={handleSaveDraft}
            icon={saveStatus === 'saving' ? <Loader size={11} /> : <Save size={11} />}
            disabled={!isDirty || !activeRow || saveStatus === 'saving'}
            accent={isDirty}
            small
          />
          {/* Publish */}
          <ActionBtn
            label="Publish"
            onClick={handlePublish}
            icon={<Globe size={11} />}
            disabled={!activeRow || sceneApi.loading}
            small
          />
          {/* Revert */}
          <ActionBtn
            label="Revert"
            onClick={handleRevertDraft}
            icon={<RefreshCw size={11} />}
            disabled={!activeRow?.published_config_json}
            small
          />
          {/* Duplicate */}
          <ActionBtn
            label="Duplicate"
            onClick={handleDuplicate}
            icon={<Plus size={11} />}
            disabled={!activeRow}
            small
          />
          {/* Archive */}
          <ActionBtn
            label="Archive"
            onClick={handleArchive}
            icon={<Archive size={11} />}
            disabled={!activeRow || rowStatus === 'archived'}
            danger small
          />
          <div style={{ width: 1, height: 16, background: 'rgba(40,55,42,0.5)' }} />
          <ActionBtn label={copied ? 'Copied!' : 'Copy JSON'} onClick={copyJson}
            icon={copied ? <CheckCircle size={11} /> : <Copy size={11} />} accent={copied} small />
          <ActionBtn label="Download" onClick={downloadJson} icon={<Download size={11} />} small />
          <ActionBtn label={showJson ? 'Hide JSON' : 'JSON'}
            onClick={showJson ? () => setShowJson(false) : openJson}
            icon={<Code size={11} />} small />
        </div>
      </div>

      {/* ── Publish validation errors ── */}
      {publishErrors.length > 0 && (
        <div style={{
          background: 'rgba(180,40,40,0.08)', border: '1px solid rgba(180,40,40,0.3)',
          padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={12} style={{ color: 'rgba(200,60,60,0.8)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,60,60,0.8)' }}>
              Cannot Publish
            </span>
          </div>
          {publishErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: UF, color: 'rgba(200,80,80,0.8)', paddingLeft: 18 }}>• {e}</div>
          ))}
        </div>
      )}

      {/* ── JSON editor ── */}
      {showJson && (
        <div style={{
          background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(40,55,42,0.4)',
          padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, fontFamily: UF, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
              Raw Config JSON (draft)
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              <ActionBtn label="Apply" onClick={applyJson} accent small />
              <ActionBtn label="Close" onClick={() => setShowJson(false)} small />
            </div>
          </div>
          <textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            rows={12} spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${jsonError ? 'rgba(200,60,60,0.5)' : 'rgba(40,55,42,0.5)'}`,
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Courier New', monospace", fontSize: 10,
              padding: 8, resize: 'vertical', outline: 'none',
            }}
          />
          {jsonError && <div style={{ fontSize: 10, fontFamily: UF, color: 'rgba(200,60,60,0.8)' }}>Error: {jsonError}</div>}
        </div>
      )}

      {/* ── 3-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px,240px) 280px 1fr',
        gap: 12, alignItems: 'start',
      }}>

        {/* ── Left: Scene list + controls / Asset Library ── */}
        <div style={{
          background: 'rgba(11,15,12,0.85)',
          border: '1px solid rgba(40,55,42,0.4)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Left tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(40,55,42,0.5)', flexShrink: 0 }}>
            {(['scenes', 'assets'] as LeftTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setLeftTab(t)}
                style={{
                  flex: 1, padding: '7px 4px',
                  background: leftTab === t ? 'rgba(245,208,96,0.07)' : 'transparent',
                  border: 'none',
                  borderBottom: leftTab === t ? '2px solid rgba(245,208,96,0.5)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: UF, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: leftTab === t ? 'rgba(245,208,96,0.8)' : 'rgba(255,255,255,0.3)',
                }}
              >
                {t === 'scenes' ? `Gate Scenes (${rows.length || 1})` : `Assets (${assetApi.assets.length})`}
              </button>
            ))}
          </div>

          {/* Asset Library panel */}
          {leftTab === 'assets' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <AdminAssetLibrary />
            </div>
          )}

          {/* Scene list */}
          {leftTab === 'scenes' && (
          <div style={{ borderBottom: '1px solid rgba(30,42,32,0.6)' }}>
            {/* Toolbar: New button */}
            <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(30,42,32,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => { setShowCreateForm((v) => !v); setCreateError(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', fontSize: 9, fontFamily: UF,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  border: '1px solid rgba(245,208,96,0.35)',
                  background: showCreateForm ? 'rgba(245,208,96,0.1)' : 'rgba(245,208,96,0.04)',
                  color: 'rgba(245,208,96,0.75)', cursor: 'pointer',
                }}
              >
                <Plus size={10} /> New Gate Scene
              </button>
            </div>

            {/* Inline create form */}
            {showCreateForm && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(30,42,32,0.5)', background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  placeholder="Title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(40,55,42,0.5)',
                    color: 'rgba(255,255,255,0.7)', fontFamily: UF, fontSize: 10,
                    padding: '4px 7px', outline: 'none',
                  }}
                />
                <input
                  placeholder="slug (lowercase-hyphen)"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(40,55,42,0.5)',
                    color: 'rgba(255,255,255,0.55)', fontFamily: UF, fontSize: 10,
                    padding: '4px 7px', outline: 'none',
                  }}
                />
                <select
                  value={createTemplate}
                  onChange={(e) => setCreateTemplate(e.target.value as typeof createTemplate)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(40,55,42,0.5)',
                    color: 'rgba(255,255,255,0.55)', fontFamily: UF, fontSize: 10,
                    padding: '4px 7px', outline: 'none',
                  }}
                >
                  <option value="choice_2">choice_2</option>
                  <option value="choice_3">choice_3</option>
                  <option value="ritual_roll">ritual_roll</option>
                </select>
                {createError && (
                  <div style={{ fontSize: 9, fontFamily: UF, color: 'rgba(200,60,60,0.8)' }}>{createError}</div>
                )}
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={handleCreateScene}
                    disabled={creating}
                    style={{
                      flex: 1, padding: '4px 0', fontSize: 9, fontFamily: UF,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      border: '1px solid rgba(120,190,80,0.4)',
                      background: 'rgba(120,190,80,0.08)',
                      color: 'rgba(150,220,100,0.85)', cursor: creating ? 'not-allowed' : 'pointer',
                      opacity: creating ? 0.5 : 1,
                    }}
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowCreateForm(false); setCreateError(null); setCreateTitle(''); setCreateSlug(''); }}
                    style={{
                      padding: '4px 10px', fontSize: 9, fontFamily: UF,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      border: '1px solid rgba(40,55,42,0.4)',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Search input */}
            <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(30,42,32,0.4)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={9} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  placeholder="Search scenes…"
                  value={sceneSearch}
                  onChange={(e) => setSceneSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(40,55,42,0.4)',
                    color: 'rgba(255,255,255,0.6)', fontFamily: UF, fontSize: 9,
                    padding: '4px 22px 4px 22px', outline: 'none',
                  }}
                />
                {sceneSearch && (
                  <button
                    onClick={() => setSceneSearch('')}
                    style={{
                      position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.3)', padding: 2,
                    }}
                  >
                    <XIcon size={9} />
                  </button>
                )}
              </div>
            </div>

            {/* Status filter chips */}
            <div style={{ padding: '5px 8px', display: 'flex', gap: 3, flexWrap: 'wrap', borderBottom: '1px solid rgba(30,42,32,0.4)' }}>
              {(['all', 'published', 'draft', 'archived'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    padding: '2px 7px', fontSize: 8, fontFamily: UF,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: `1px solid ${statusFilter === f ? 'rgba(245,208,96,0.4)' : 'rgba(40,55,42,0.3)'}`,
                    background: statusFilter === f ? 'rgba(245,208,96,0.07)' : 'transparent',
                    color: statusFilter === f ? 'rgba(245,208,96,0.75)' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Scrollable scene list */}
            <div style={{ maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin' }}>
              {(() => {
                const filtered = rows.filter((row) => {
                  const matchesSearch = !sceneSearch || row.title.toLowerCase().includes(sceneSearch.toLowerCase()) || row.slug.toLowerCase().includes(sceneSearch.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
                  return matchesSearch && matchesStatus;
                });
                if (filtered.length === 0 && rows.length > 0) {
                  return (
                    <div style={{ padding: '10px', fontSize: 9, fontFamily: UF, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                      No scenes match
                    </div>
                  );
                }
                return filtered.length > 0
                  ? filtered.map((row) => (
                      <SceneListItem
                        key={row.id}
                        row={row}
                        active={row.id === activeRowId}
                        onClick={() => {
                          if (isDirty && !window.confirm('Discard unsaved changes?')) return;
                          setActiveRowId(row.id);
                        }}
                      />
                    ))
                  : (
                    <div style={{ padding: '6px 10px', fontSize: 9, fontFamily: UF, color: 'rgba(255,255,255,0.3)' }}>
                      Using local fallback
                    </div>
                  );
              })()}
            </div>
          </div>
          )}

          {/* Scene settings — only when scenes tab active */}
          {leftTab === 'scenes' && (
          <CollapsibleSection
            title={`Gate Scene — ${scene.title}`}
            open={sceneSettingsOpen}
            onToggle={() => setSceneSettingsOpen((v) => !v)}
          >
            <SceneEditorSceneSettings scene={scene} onChange={updateDraft} />
          </CollapsibleSection>
          )}

          {/* Canvas & preview controls */}
          <CollapsibleSection
            title="Canvas & Preview"
            open={previewControlsOpen}
            onToggle={() => setPreviewControlsOpen((v) => !v)}
          >
            <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>Mode</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Chip label="Editor"  active={canvasMode === 'editor'}  onClick={() => setCanvasMode('editor')} />
                  <Chip label="Preview" active={canvasMode === 'preview'} onClick={switchToPreview} />
                </div>
              </div>
              {canvasMode === 'editor' && (
                <Chip label={showOutlines ? 'Outlines On' : 'Outlines Off'} active={showOutlines} onClick={() => setShowOutlines((v) => !v)} />
              )}
              {canvasMode === 'preview' && (
                <>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>Phase</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(['idle','selected','revealing','done'] as PreviewPhase[]).map((p) => (
                        <Chip key={p} label={p} active={previewPhase === p} onClick={() => setPreviewPhase(p)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>Outcome</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Chip label="None"    active={previewOutcome === null}     onClick={() => setPreviewOutcome(null)} />
                      <Chip label="Survive" active={previewOutcome === 'SURVIVE'} onClick={() => setPreviewOutcome('SURVIVE')} />
                      <Chip label="Die"     active={previewOutcome === 'DIE'}     onClick={() => setPreviewOutcome('DIE')} danger />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <ActionBtn label="Survive" onClick={() => { setPreviewOutcome('SURVIVE'); setPreviewPhase('revealing'); if (!previewChoice) setPreviewChoice('left_torch'); }} accent small />
                    <ActionBtn label="Die"     onClick={() => { setPreviewOutcome('DIE'); setPreviewPhase('revealing'); if (!previewChoice) setPreviewChoice('left_torch'); }} danger small />
                    <ActionBtn label="Reset"   onClick={resetPreview} small />
                  </div>
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* Selected layer info */}
          {selectedLayer && canvasMode === 'editor' && (
            <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(40,55,42,0.3)', fontSize: 9, fontFamily: UF, lineHeight: 1.8 }}>
              <div style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Selected</div>
              <div style={{ color: 'rgba(245,208,96,0.75)' }}>{selectedLayer.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.32)' }}>{selectedLayer.type} · {selectedLayer.role}</div>
              <div style={{ color: 'rgba(255,255,255,0.32)' }}>
                x:{selectedLayer.x?.toFixed(1)} y:{selectedLayer.y?.toFixed(1)} w:{selectedLayer.width?.toFixed(1)} h:{selectedLayer.height?.toFixed(1)}
              </div>
              {selectedLayer.locked && <div style={{ color: 'rgba(255,154,48,0.6)' }}>Locked — drag/resize disabled</div>}
            </div>
          )}

          {canvasMode === 'editor' && selectedLayer && !selectedLayer.locked && (
            <div style={{ padding: '4px 10px 8px', fontSize: 8, fontFamily: UF, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
              Arrow keys nudge · Shift+Arrow = 2× · Drag to move · Corner handles to resize
            </div>
          )}

          {/* Validation warnings */}
          {validationErrors.length > 0 && isDirty && (
            <div style={{ margin: '4px 8px 6px', padding: '5px 8px', background: 'rgba(180,140,0,0.06)', border: '1px solid rgba(180,140,0,0.2)' }}>
              {validationErrors.map((e, i) => (
                <div key={i} style={{ fontSize: 8, fontFamily: UF, color: 'rgba(200,175,80,0.6)', lineHeight: 1.6 }}>⚠ {e}</div>
              ))}
            </div>
          )}

          {/* Assignment eligibility summary */}
          {activeRow && (
            <div style={{ margin: '4px 8px 0', padding: '6px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(40,55,42,0.3)' }}>
              <div style={{ fontSize: 8, fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 5 }}>
                Assignment Config
              </div>
              {/* Source-of-truth note */}
              <div style={{ fontSize: 7.5, fontFamily: UF, color: 'rgba(245,208,96,0.38)', lineHeight: 1.5, marginBottom: 6, borderBottom: '1px solid rgba(40,55,42,0.35)', paddingBottom: 5 }}>
                Assignment uses table Enabled + Status fields.<br />
                Layer JSON controls visuals only.
              </div>
              {/* Enabled toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 8, fontFamily: UF, color: 'rgba(255,255,255,0.28)' }}>Enabled</span>
                <button
                  onClick={async () => {
                    const next = !activeRow.enabled;
                    const result = await sceneApi.setEnabled(activeRow.id, next);
                    if (result?.success) {
                      const refreshed = await sceneApi.listScenes();
                      if (refreshed) setRows(refreshed);
                    }
                  }}
                  style={{
                    padding: '2px 8px', fontSize: 8, fontFamily: UF,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: `1px solid ${activeRow.enabled ? 'rgba(120,200,90,0.45)' : 'rgba(180,40,40,0.35)'}`,
                    background: activeRow.enabled ? 'rgba(120,200,90,0.1)' : 'rgba(180,40,40,0.07)',
                    color: activeRow.enabled ? 'rgba(140,220,100,0.85)' : 'rgba(200,80,80,0.75)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {activeRow.enabled ? 'On — click to disable' : 'Off — click to enable'}
                </button>
              </div>
              {[
                ['Status',   activeRow.status],
                ['Template', activeRow.template_type],
                ['Weight',   String(activeRow.weight ?? 1)],
                ['Cooldown', `${activeRow.cooldown_days ?? 0}d`],
                ['Streak',   `${activeRow.min_streak ?? 0} – ${activeRow.max_streak ?? '∞'}`],
                ['Published config', activeRow.published_config_json ? 'Present' : 'None — publish first'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 8, fontFamily: UF, lineHeight: 1.8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.28)' }}>{k}</span>
                  <span style={{
                    color: k === 'Status' ? (activeRow.status === 'published' ? 'rgba(120,200,90,0.75)' : activeRow.status === 'archived' ? 'rgba(200,60,60,0.7)' : 'rgba(200,175,80,0.65)')
                      : k === 'Published config' ? (activeRow.published_config_json ? 'rgba(120,200,90,0.75)' : 'rgba(200,175,80,0.65)')
                      : 'rgba(245,208,96,0.6)',
                  }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Published version indicator */}
          {activeRow?.published_config_json && (
            <div style={{ margin: '4px 8px 6px', padding: '4px 8px', background: 'rgba(120,190,80,0.04)', border: '1px solid rgba(120,190,80,0.15)' }}>
              <div style={{ fontSize: 8, fontFamily: UF, color: 'rgba(130,200,90,0.55)', lineHeight: 1.6 }}>
                Published: {activeRow.published_at ? new Date(activeRow.published_at).toLocaleString() : 'yes'}<br />
                Draft edits are separate from published config until you Publish.
              </div>
            </div>
          )}
        </div>

        {/* ── Center: Canvas ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 280, height: 497, position: 'relative',
            border: `1px solid ${canvasMode === 'editor' ? 'rgba(60,80,60,0.55)' : 'rgba(40,60,40,0.4)'}`,
            overflow: 'hidden',
            boxShadow: canvasMode === 'editor'
              ? '0 0 0 1px rgba(245,208,96,0.06), 0 8px 32px rgba(0,0,0,0.75)'
              : '0 8px 32px rgba(0,0,0,0.75)',
            background: '#070A08', flexShrink: 0,
          }}>
            <SceneEditorCanvas
              sceneConfig={scene}
              canvasMode={canvasMode}
              showOutlines={showOutlines}
              selectedLayerId={selectedLayerId}
              onSelectLayer={handleSelectLayer}
              onUpdateLayer={setLayerField}
              previewChoice={previewChoice}
              previewOutcome={previewOutcome}
              previewPhase={previewPhase}
              onPreviewChoice={handlePreviewChoice}
              onPreviewCta={handlePreviewCta}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, fontFamily: UF, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <Eye size={10} />280 × 497 · 9:16
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <Chip label="Editor Mode"  active={canvasMode === 'editor'}  onClick={() => setCanvasMode('editor')} />
            <Chip label="Preview Mode" active={canvasMode === 'preview'} onClick={switchToPreview} />
          </div>
        </div>

        {/* ── Right: Layer list + settings tabs ── */}
        <div style={{
          background: 'rgba(11,15,12,0.85)',
          border: '1px solid rgba(40,55,42,0.4)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 700, minHeight: 400,
        }}>
          {/* Tab bar — scrollable if many tabs open */}
          <div style={{
            display: 'flex', flexShrink: 0, overflowX: 'auto',
            borderBottom: '1px solid rgba(40,55,42,0.4)',
            scrollbarWidth: 'none',
          }}>
            {/* Layers tab */}
            <button
              onClick={() => setActiveLayerTabId(null)}
              style={{
                padding: '5px 10px', fontSize: 9, fontFamily: UF,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                border: `1px solid ${activeLayerTabId === null ? 'rgba(245,208,96,0.4)' : 'rgba(40,55,42,0.35)'}`,
                borderBottom: 'none',
                background: activeLayerTabId === null ? 'rgba(245,208,96,0.08)' : 'transparent',
                color: activeLayerTabId === null ? '#F5D060' : 'rgba(255,255,255,0.38)',
                cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Layers
            </button>

            {/* Open layer tabs */}
            {openLayerIds.map((id) => {
              const tabLayer = scene.layers.find((l) => l.id === id);
              if (!tabLayer) return null;
              const isActive = activeLayerTabId === id;
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex', alignItems: 'center', flexShrink: 0,
                    border: `1px solid ${isActive ? 'rgba(245,208,96,0.4)' : 'rgba(40,55,42,0.35)'}`,
                    borderBottom: 'none',
                    background: isActive ? 'rgba(245,208,96,0.08)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <button
                    onClick={() => { setActiveLayerTabId(id); setSelectedLayerId(id); }}
                    title={tabLayer.name}
                    style={{
                      padding: '5px 8px', fontSize: 9, fontFamily: UF,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: isActive ? '#F5D060' : 'rgba(255,255,255,0.38)',
                      whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tabLayer.name.slice(0, 12)}
                  </button>
                  <button
                    onClick={() => closeLayerTab(id)}
                    title="Close tab"
                    style={{
                      padding: '3px 5px', background: 'transparent', border: 'none',
                      cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                      fontSize: 12, lineHeight: 1, flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,208,96,0.7)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {activeLayerTabId === null && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <SceneEditorLayerList
                layers={scene.layers}
                selectedId={selectedLayerId}
                onSelect={(id) => setSelectedLayerId(id)}
                onOpenSettings={handleOpenLayerSettings}
                onToggleVisible={toggleVisible}
                onToggleLocked={toggleLocked}
                onMoveUp={moveLayerUp}
                onMoveDown={moveLayerDown}
                onReorder={reorderLayer}
                onUpdateZIndex={(id, z) => {
                  const layer = scene.layers.find((l) => l.id === id);
                  if (layer) setLayerField({ ...layer, zIndex: z });
                }}
                onDuplicate={duplicateLayer}
                onDelete={deleteLayer}
                onAddLayer={addLayer}
              />
            </div>
          )}

          {activeLayerTabId !== null && (() => {
            const tabLayer = scene.layers.find((l) => l.id === activeLayerTabId);
            if (!tabLayer) return (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: UF, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 16 }}>
                Layer no longer exists. Close this tab.
              </div>
            );
            return (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <SceneEditorLayerSettings layer={tabLayer} onChange={setLayerField} assets={assetApi.assets} />
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ fontSize: 9, fontFamily: UF, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em', textAlign: 'center' }}>
        Best at &gt;900px · Drag layers to move · Corner handles to resize · Arrow keys to nudge · Save Draft to persist
      </div>
    </div>
  );
}
