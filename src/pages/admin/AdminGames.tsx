import { useEffect, useState } from 'react';
import { Gamepad2, ChevronDown, ChevronUp, Check, X, Layers, PenLine, ArrowLeft, Library } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import type { GameModule } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSkullGatePreview from './AdminSkullGatePreview';
import AdminSceneEditor from './scene-editor/AdminSceneEditor';
import AdminSceneLibrary from './AdminSceneLibrary';

type GamesTool = null | 'gate_preview' | 'scene_editor' | 'scene_library';

const LAUNCH_STATES = ['live', 'coming_soon', 'beta'] as const;
const CATEGORIES    = ['daily', 'qualifier', 'weekend', 'special'] as const;

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminGames() {
  const { fetchGames, updateGame, loading, error } = useAdmin();
  const [games,       setGames]      = useState<GameModule[]>([]);
  const [expanded,    setExpanded]   = useState<string | null>(null);
  const [editValues,  setEditValues] = useState<Record<string, Partial<GameModule>>>({});
  const [saving,      setSaving]     = useState<string | null>(null);
  const [saveMsg,     setSaveMsg]    = useState<string | null>(null);
  const [tool,        setTool]       = useState<GamesTool>(null);
  const [sceneEditorInitialId, setSceneEditorInitialId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchGames().then((data) => { if (data) setGames(data); });
  }, [fetchGames]);

  const toggle = (gameId: string) => {
    setExpanded((prev) => (prev === gameId ? null : gameId));
    if (!editValues[gameId]) {
      const g = games.find((x) => x.game_id === gameId);
      if (g) setEditValues((prev) => ({ ...prev, [gameId]: { ...g } }));
    }
  };

  const setField = (gameId: string, key: keyof GameModule, value: unknown) =>
    setEditValues((prev) => ({ ...prev, [gameId]: { ...prev[gameId], [key]: value } }));

  const save = async (gameId: string) => {
    const fields = editValues[gameId];
    if (!fields) return;
    setSaving(gameId);
    const result = await updateGame(gameId, fields);
    setSaving(null);
    if (result !== null) {
      setSaveMsg(`Saved ${gameId}`);
      const updated = await fetchGames();
      if (updated) setGames(updated);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  };


  if (loading && !games.length) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  if (tool === 'gate_preview') {
    return (
      <div className="space-y-4">
        <button onClick={() => setTool(null)} className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted transition-colors">
          <ArrowLeft className="h-3 w-3" /> Games
        </button>
        <AdminSkullGatePreview />
      </div>
    );
  }

  if (tool === 'scene_editor') {
    return (
      <div className="space-y-4">
        <button onClick={() => setTool(null)} className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted transition-colors">
          <ArrowLeft className="h-3 w-3" /> Games
        </button>
        <AdminSceneEditor initialSceneId={sceneEditorInitialId} />
      </div>
    );
  }

  if (tool === 'scene_library') {
    return (
      <div className="space-y-4">
        <button onClick={() => setTool(null)} className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted transition-colors">
          <ArrowLeft className="h-3 w-3" /> Games
        </button>
        <AdminSceneLibrary onEdit={(id) => { setSceneEditorInitialId(id); setTool('scene_editor'); }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Gate Scene tools — top of page */}
      <div className="border border-moss-dark/20 bg-ritual-surface/10 px-3 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-bone-faint mb-2.5">Gate Scenes</div>
        <div className="flex gap-2">
          <button
            onClick={() => setTool('scene_editor')}
            className="flex items-center gap-2 border border-torch-ember/30 bg-torch-ember/5 px-3 py-2 text-[12px] uppercase tracking-[0.1em] text-torch-ember/80 hover:text-torch-ember hover:border-torch-ember/50 transition-colors"
          >
            <PenLine className="h-3.5 w-3.5" strokeWidth={1.5} /> Gate Scene Editor
          </button>
          <button
            onClick={() => setTool('scene_library')}
            className="flex items-center gap-2 border border-moss-dark/25 px-3 py-2 text-[12px] uppercase tracking-[0.1em] text-bone-dark hover:text-bone hover:border-moss-dark/40 transition-colors"
          >
            <Library className="h-3.5 w-3.5" strokeWidth={1.5} /> Scene Library
          </button>
          <button
            onClick={() => setTool('gate_preview')}
            className="flex items-center gap-2 border border-moss-dark/25 px-3 py-2 text-[12px] uppercase tracking-[0.1em] text-bone-dark hover:text-bone hover:border-moss-dark/40 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" strokeWidth={1.5} /> Gate Preview
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Game Catalog</h2>
          <span className="text-[12px] text-bone-dark">{games.length}</span>
        </div>
        {saveMsg && (
          <span className="flex items-center gap-1 text-[12px] text-moss-light">
            <Check className="h-3 w-3" strokeWidth={2} /> {saveMsg}
          </span>
        )}
      </div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-xs text-death-glow">{error}</div>
      )}

      {/* Game list */}
      {games.sort((a, b) => a.sort_order - b.sort_order).map((game) => {
        const ev     = editValues[game.game_id] ?? game;
        const isOpen = expanded === game.game_id;
        return (
          <div key={game.game_id} className="border border-moss-dark/20 bg-ritual-surface/20">
            <button
              onClick={() => toggle(game.game_id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${
                  game.launch_state === 'live' ? 'bg-moss-light' :
                  game.launch_state === 'beta' ? 'bg-torch-ember' :
                                                 'bg-bone-faint'
                }`} />
                <span className="text-xs font-medium text-bone">{game.name}</span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-bone-faint">{game.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
                  game.launch_state === 'live'
                    ? 'border-moss-dark/40 text-moss-light'
                    : 'border-bone-faint/20 text-bone-faint'
                }`}>{game.launch_state}</span>
                {isOpen
                  ? <ChevronUp   className="h-3.5 w-3.5 text-bone-dark" />
                  : <ChevronDown className="h-3.5 w-3.5 text-bone-dark" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-moss-dark/20 px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Launch State</label>
                    <select
                      value={String(ev.launch_state ?? game.launch_state)}
                      onChange={(e) => setField(game.game_id, 'launch_state', e.target.value)}
                      className="ritual-input w-full text-xs"
                    >
                      {LAUNCH_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Category</label>
                    <select
                      value={String(ev.category ?? game.category)}
                      onChange={(e) => setField(game.game_id, 'category', e.target.value)}
                      className="ritual-input w-full text-xs"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Points on Play</label>
                    <input
                      type="number"
                      value={ev.points_on_play ?? game.points_on_play}
                      onChange={(e) => setField(game.game_id, 'points_on_play', Number(e.target.value))}
                      className="ritual-input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Points on Win</label>
                    <input
                      type="number"
                      value={ev.points_on_win ?? game.points_on_win}
                      onChange={(e) => setField(game.game_id, 'points_on_win', Number(e.target.value))}
                      className="ritual-input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Sort Order</label>
                    <input
                      type="number"
                      value={ev.sort_order ?? game.sort_order}
                      onChange={(e) => setField(game.game_id, 'sort_order', Number(e.target.value))}
                      className="ritual-input w-full text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(ev.qualification_enabled ?? game.qualification_enabled)}
                        onChange={(e) => setField(game.game_id, 'qualification_enabled', e.target.checked)}
                        className="accent-torch-ember"
                      />
                      <span className="text-[12px] text-bone-muted">Qual Enabled</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => save(game.game_id)}
                    disabled={saving === game.game_id}
                    className="jungle-button px-6 py-2 text-xs"
                  >
                    {saving === game.game_id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditValues((prev) => ({ ...prev, [game.game_id]: { ...game } }))}
                    className="flex items-center gap-1 text-[12px] text-bone-dark hover:text-bone-muted"
                  >
                    <X className="h-3 w-3" /> Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
