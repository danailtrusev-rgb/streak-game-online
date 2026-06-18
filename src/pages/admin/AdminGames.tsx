import { useEffect, useState } from 'react';
import { Gamepad2, ChevronDown, ChevronUp, Check, X, Plus } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import type { GameModule } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const LAUNCH_STATES = ['live', 'coming_soon', 'beta'] as const;
const CATEGORIES    = ['daily', 'qualifier', 'weekend', 'special'] as const;

// ── Create form ───────────────────────────────────────────────────────────────

interface CreateForm {
  game_id:               string;
  name:                  string;
  description:           string;
  category:              string;
  launch_state:          string;
  sort_order:            number;
  points_on_play:        number;
  points_on_win:         number;
  qualification_enabled: boolean;
}

function emptyCreate(): CreateForm {
  return {
    game_id: '', name: '', description: '',
    category: 'daily', launch_state: 'coming_soon',
    sort_order: 99, points_on_play: 5, points_on_win: 15,
    qualification_enabled: true,
  };
}

function CreateGameForm({
  onSave, onCancel, saving, error,
}: {
  onSave:   (f: CreateForm) => void;
  onCancel: () => void;
  saving:   boolean;
  error:    string | null;
}) {
  const [f, setF] = useState<CreateForm>(emptyCreate);
  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const idValid = /^[a-z0-9_]+$/.test(f.game_id);
  const valid   = f.game_id.trim().length > 0 && idValid && f.name.trim().length > 0;

  return (
    <div className="border border-gold-500/20 bg-ritual-surface/40 px-4 py-4 space-y-4">
      <div className="text-[9px] uppercase tracking-[0.18em] text-gold-300/70">New Game</div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-[10px] text-death-glow">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">
            Game ID <span className="normal-case tracking-normal text-bone-dark">(snake_case)</span>
          </label>
          <input
            value={f.game_id}
            onChange={(e) => set('game_id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="daily_myname"
            className={`ritual-input w-full text-xs ${f.game_id && !idValid ? 'border-death-red/50' : ''}`}
          />
        </div>
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Display Name</label>
          <input
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="My Game"
            className="ritual-input w-full text-xs"
          />
        </div>
      </div>

      <div>
        <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Description</label>
        <input
          value={f.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Short description shown to players"
          className="ritual-input w-full text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Category</label>
          <select value={f.category} onChange={(e) => set('category', e.target.value)} className="ritual-input w-full text-xs">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Launch State</label>
          <select value={f.launch_state} onChange={(e) => set('launch_state', e.target.value)} className="ritual-input w-full text-xs">
            {LAUNCH_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Points on Play</label>
          <input type="number" value={f.points_on_play} onChange={(e) => set('points_on_play', Number(e.target.value))} className="ritual-input w-full text-xs" />
        </div>
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Points on Win</label>
          <input type="number" value={f.points_on_win} onChange={(e) => set('points_on_win', Number(e.target.value))} className="ritual-input w-full text-xs" />
        </div>
        <div>
          <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Sort Order</label>
          <input type="number" value={f.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} className="ritual-input w-full text-xs" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={f.qualification_enabled}
              onChange={(e) => set('qualification_enabled', e.target.checked)}
              className="accent-torch-ember"
            />
            <span className="text-[10px] text-bone-muted">Qual Enabled</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-moss-dark/20">
        <button
          onClick={() => onSave(f)}
          disabled={saving || !valid}
          className="jungle-button px-6 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Create Game'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-[10px] text-bone-dark hover:text-bone-muted"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminGames() {
  const { fetchGames, createGame, updateGame, loading, error } = useAdmin();
  const [games,        setGames]       = useState<GameModule[]>([]);
  const [expanded,     setExpanded]    = useState<string | null>(null);
  const [editValues,   setEditValues]  = useState<Record<string, Partial<GameModule>>>({});
  const [saving,       setSaving]      = useState<string | null>(null);
  const [saveMsg,      setSaveMsg]     = useState<string | null>(null);
  const [showCreate,   setShowCreate]  = useState(false);
  const [createError,  setCreateError] = useState<string | null>(null);

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

  const handleCreate = async (f: CreateForm) => {
    setSaving('__new__');
    setCreateError(null);
    const result = await createGame({
      game_id:               f.game_id.trim(),
      name:                  f.name.trim(),
      description:           f.description.trim(),
      category:              f.category,
      launch_state:          f.launch_state,
      sort_order:            f.sort_order,
      points_on_play:        f.points_on_play,
      points_on_win:         f.points_on_win,
      qualification_enabled: f.qualification_enabled,
    });
    setSaving(null);
    if (result?.success) {
      setShowCreate(false);
      setSaveMsg(`Created ${f.game_id}`);
      const updated = await fetchGames();
      if (updated) setGames(updated);
      setTimeout(() => setSaveMsg(null), 2500);
    } else {
      setCreateError(error ?? 'Failed to create game');
    }
  };

  if (loading && !games.length) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Games</h2>
          <span className="text-[10px] text-bone-dark">{games.length}</span>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="flex items-center gap-1 text-[10px] text-moss-light">
              <Check className="h-3 w-3" strokeWidth={2} /> {saveMsg}
            </span>
          )}
          <button
            onClick={() => { setShowCreate((v) => !v); setCreateError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] border border-moss-dark/40 text-moss-light hover:border-moss-light/40 transition-colors"
          >
            <Plus className="h-3 w-3" />
            New Game
          </button>
        </div>
      </div>

      {error && !showCreate && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-xs text-death-glow">{error}</div>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateGameForm
          onSave={handleCreate}
          onCancel={() => { setShowCreate(false); setCreateError(null); }}
          saving={saving === '__new__'}
          error={createError}
        />
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
                <span className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">{game.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
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
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Launch State</label>
                    <select
                      value={String(ev.launch_state ?? game.launch_state)}
                      onChange={(e) => setField(game.game_id, 'launch_state', e.target.value)}
                      className="ritual-input w-full text-xs"
                    >
                      {LAUNCH_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Category</label>
                    <select
                      value={String(ev.category ?? game.category)}
                      onChange={(e) => setField(game.game_id, 'category', e.target.value)}
                      className="ritual-input w-full text-xs"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Points on Play</label>
                    <input
                      type="number"
                      value={ev.points_on_play ?? game.points_on_play}
                      onChange={(e) => setField(game.game_id, 'points_on_play', Number(e.target.value))}
                      className="ritual-input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Points on Win</label>
                    <input
                      type="number"
                      value={ev.points_on_win ?? game.points_on_win}
                      onChange={(e) => setField(game.game_id, 'points_on_win', Number(e.target.value))}
                      className="ritual-input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Sort Order</label>
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
                      <span className="text-[10px] text-bone-muted">Qual Enabled</span>
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
                    className="flex items-center gap-1 text-[10px] text-bone-dark hover:text-bone-muted"
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
