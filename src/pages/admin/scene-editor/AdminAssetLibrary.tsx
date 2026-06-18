// Admin Asset Library — manual asset path registry for Skull Gate scenes.
// No file upload. Assets are registered by path, type, and tags.

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CreditCard as Edit2, Check, X, Image } from 'lucide-react';
import {
  useSkullGateAssets,
  ASSET_TYPES,
  ASSET_PATH_SUGGESTIONS,
  type SkullGateAsset,
  type AssetType,
} from '../../../hooks/useSkullGateAssets';

const UF = "'Inter', system-ui, sans-serif";

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '6px 8px', fontSize: 11, fontFamily: UF,
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(50,70,50,0.45)',
  color: 'rgba(255,255,255,0.8)', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  paddingRight: 24,
};

const TYPE_COLORS: Partial<Record<AssetType, string>> = {
  background:      '#3B6B8A',
  back_plate:      '#3B5A8A',
  gate_frame:      '#7A5A20',
  gate_door_left:  '#7A4020',
  gate_door_right: '#7A4020',
  inner_light:     '#6A7A20',
  foreground:      '#2A6A3A',
  object:          '#5A4A7A',
  flame:           '#8A4010',
  overlay:         '#4A4A4A',
  effect:          '#3A5A6A',
  particle:        '#3A6A5A',
  button:          '#5A5A20',
  icon:            '#4A5A4A',
  source_plate:    '#3A3A3A',
};

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumb({ path }: { path: string }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: 52, height: 52, flexShrink: 0,
      background: 'rgba(0,0,0,0.45)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      {!err ? (
        <img
          src={path}
          alt=""
          onLoad={() => setOk(true)}
          onError={() => setErr(true)}
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'center',
            display: ok ? 'block' : 'none',
          }}
        />
      ) : null}
      {(!ok || err) && (
        <Image size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />
      )}
    </div>
  );
}

// ── Inline edit form ──────────────────────────────────────────────────────────

interface FormState {
  asset_path: string;
  asset_type: AssetType;
  name:       string;
  tags:       string;
  notes:      string;
}

function emptyForm(type: AssetType = 'object'): FormState {
  return { asset_path: '', asset_type: type, name: '', tags: '', notes: '' };
}

function AssetForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = (k: keyof FormState, v: string) => setF((p) => ({ ...p, [k]: v }));

  const suggestedPath = ASSET_PATH_SUGGESTIONS[f.asset_type] ?? '/assets/games/skull-gate/shared/';

  return (
    <div style={{
      background: 'rgba(10,18,12,0.98)', border: '1px solid rgba(245,208,96,0.18)',
      padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Type</div>
          <select value={f.asset_type} onChange={(e) => set('asset_type', e.target.value)} style={selectStyle}>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Name</div>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Display name" style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
          Asset Path
          <span style={{ color: 'rgba(255,255,255,0.18)', marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
            suggested: {suggestedPath}
          </span>
        </div>
        <input
          value={f.asset_path}
          onChange={(e) => set('asset_path', e.target.value)}
          placeholder={`${suggestedPath}filename.png`}
          style={inputStyle}
        />
      </div>

      <div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Tags (comma-separated)</div>
        <input value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="torch, left, fire" style={inputStyle} />
      </div>

      <div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: UF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Notes (optional)</div>
        <input value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional admin note" style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
        <button
          onClick={onCancel}
          style={{ padding: '5px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: UF, fontSize: 11 }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(f)}
          disabled={saving || !f.asset_path.trim()}
          style={{
            padding: '5px 14px',
            background: saving || !f.asset_path.trim() ? 'rgba(80,120,60,0.3)' : 'rgba(80,140,50,0.25)',
            border: '1px solid rgba(80,140,50,0.4)',
            color: saving || !f.asset_path.trim() ? 'rgba(255,255,255,0.3)' : '#A8D090',
            cursor: saving || !f.asset_path.trim() ? 'not-allowed' : 'pointer',
            fontFamily: UF, fontSize: 11,
          }}
        >
          {saving ? 'Saving…' : 'Save Asset'}
        </button>
      </div>
    </div>
  );
}

// ── Asset row ─────────────────────────────────────────────────────────────────

function AssetRow({
  asset,
  onEdit,
  onDelete,
}: {
  asset: SkullGateAsset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = TYPE_COLORS[asset.asset_type] ?? '#3A3A3A';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderBottom: 'none',
    }}>
      <Thumb path={asset.asset_path} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{
            fontSize: 9, padding: '1px 6px',
            background: color + '33', border: `1px solid ${color}66`,
            color: '#DDD', fontFamily: UF, letterSpacing: '0.1em',
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            {asset.asset_type}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: UF, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {asset.name || asset.asset_path.split('/').pop()}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: UF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.asset_path}
        </div>
        {asset.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {asset.tags.map((t) => (
              <span key={t} style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontFamily: UF }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)' }}>
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(180,60,60,0.6)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminAssetLibrary() {
  const { assets, loading, error, listAssets, createAsset, updateAsset, deleteAsset } = useSkullGateAssets();

  const [filterType,   setFilterType]   = useState<AssetType | 'all'>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null);

  useEffect(() => { listAssets(); }, [listAssets]);

  const handleCreate = useCallback(async (f: FormState) => {
    setSaving(true);
    const tags = f.tags.split(',').map((t) => t.trim()).filter(Boolean);
    await createAsset({ asset_path: f.asset_path.trim(), asset_type: f.asset_type, name: f.name.trim(), tags, notes: f.notes.trim() || undefined });
    setSaving(false);
    setShowCreate(false);
  }, [createAsset]);

  const handleUpdate = useCallback(async (id: string, f: FormState) => {
    setSaving(true);
    const tags = f.tags.split(',').map((t) => t.trim()).filter(Boolean);
    await updateAsset(id, { asset_path: f.asset_path.trim(), asset_type: f.asset_type, name: f.name.trim(), tags, notes: f.notes.trim() || undefined });
    setSaving(false);
    setEditingId(null);
  }, [updateAsset]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteAsset(id);
    setConfirmDel(null);
  }, [deleteAsset]);

  const filtered = assets.filter((a) => {
    if (filterType !== 'all' && a.asset_type !== filterType) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return a.name.toLowerCase().includes(q)
        || a.asset_path.toLowerCase().includes(q)
        || a.tags.some((t) => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontFamily: UF, color: 'rgba(245,208,96,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Asset Library
          <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 8, textTransform: 'none' }}>
            {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', background: 'rgba(80,140,50,0.18)',
            border: '1px solid rgba(80,140,50,0.35)', cursor: 'pointer',
            fontFamily: UF, fontSize: 11, color: '#A8D090',
          }}
        >
          <Plus size={12} /> Add Asset
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <input
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Search name, path, tag…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as AssetType | 'all')} style={{ ...selectStyle, width: 130 }}>
          <option value="all">All types</option>
          {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <AssetForm
            initial={emptyForm()}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 14px', fontSize: 11, color: '#CC5555', fontFamily: UF, flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading && assets.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: UF }}>
            Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: UF }}>
            {assets.length === 0 ? 'No assets yet. Add one above.' : 'No assets match the filter.'}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {filtered.map((asset) => (
            <div key={asset.id}>
              {editingId === asset.id ? (
                <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <AssetForm
                    initial={{
                      asset_path: asset.asset_path,
                      asset_type: asset.asset_type,
                      name:       asset.name,
                      tags:       asset.tags.join(', '),
                      notes:      asset.notes ?? '',
                    }}
                    onSave={(f) => handleUpdate(asset.id, f)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : confirmDel === asset.id ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', background: 'rgba(100,20,20,0.18)',
                  border: '1px solid rgba(160,40,40,0.25)', borderBottom: 'none',
                  fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.6)',
                }}>
                  <span style={{ flex: 1 }}>Delete &ldquo;{asset.name || asset.asset_path.split('/').pop()}&rdquo;?</span>
                  <button onClick={() => handleDelete(asset.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(140,30,30,0.4)', border: '1px solid rgba(160,40,40,0.5)', color: '#CC7777', cursor: 'pointer', fontFamily: UF, fontSize: 11 }}>
                    <Check size={11} /> Delete
                  </button>
                  <button onClick={() => setConfirmDel(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: UF, fontSize: 11 }}>
                    <X size={11} /> Cancel
                  </button>
                </div>
              ) : (
                <AssetRow
                  asset={asset}
                  onEdit={() => { setEditingId(asset.id); setShowCreate(false); }}
                  onDelete={() => setConfirmDel(asset.id)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
