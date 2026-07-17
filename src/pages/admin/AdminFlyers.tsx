import { useEffect, useState } from 'react';
import { Image, Plus, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import type { PromotionalAsset } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ASSET_TYPES = ['flyer', 'winner_card', 'event_banner', 'qualification_badge'] as const;
const TEMPLATES = ['gold', 'dark', 'jungle', 'ember'];

const EMPTY_FLYER: Omit<PromotionalAsset, 'id'> = {
  asset_type: 'flyer',
  template_key: 'gold',
  title: '',
  subtitle: '',
  body_json: {},
  image_path: '',
  sort_order: 10,
};

export default function AdminFlyers() {
  const { fetchFlyers, updateFlyer, createFlyer, loading, error } = useAdmin();
  const [flyers, setFlyers] = useState<PromotionalAsset[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, Partial<PromotionalAsset>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newFlyer, setNewFlyer] = useState({ ...EMPTY_FLYER });

  const load = async () => {
    const data = await fetchFlyers();
    if (data) setFlyers(data);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    if (!editValues[id]) {
      const f = flyers.find((x) => x.id === id);
      if (f) setEditValues((prev) => ({ ...prev, [id]: { ...f } }));
    }
  };

  const setField = (id: string, key: keyof PromotionalAsset, value: unknown) => {
    setEditValues((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  const save = async (id: string) => {
    const fields = editValues[id];
    if (!fields) return;
    setSaving(id);
    await updateFlyer(id, fields);
    setSaving(null);
    setSaveMsg('Saved');
    await load();
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const handleCreate = async () => {
    if (!newFlyer.title) return;
    setSaving('new');
    await createFlyer(newFlyer);
    setSaving(null);
    setShowCreate(false);
    setNewFlyer({ ...EMPTY_FLYER });
    await load();
  };

  if (loading && !flyers.length) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Flyers & Assets</h2>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="flex items-center gap-1 text-[12px] text-moss-light">
              <Check className="h-3 w-3" strokeWidth={2} /> {saveMsg}
            </span>
          )}
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 border border-torch-orange/30 px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-torch-ember hover:bg-torch-orange/5 transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2} /> New Flyer
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-xs text-death-glow">{error}</div>
      )}

      {showCreate && (
        <div className="border border-torch-orange/20 bg-torch-orange/5 px-4 py-4 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">New Flyer</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Title</label>
              <input value={newFlyer.title} onChange={(e) => setNewFlyer((p) => ({ ...p, title: e.target.value }))} className="ritual-input w-full text-xs" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Subtitle</label>
              <input value={newFlyer.subtitle} onChange={(e) => setNewFlyer((p) => ({ ...p, subtitle: e.target.value }))} className="ritual-input w-full text-xs" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Asset Type</label>
              <select value={newFlyer.asset_type} onChange={(e) => setNewFlyer((p) => ({ ...p, asset_type: e.target.value as PromotionalAsset['asset_type'] }))} className="ritual-input w-full text-xs">
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Template</label>
              <select value={newFlyer.template_key} onChange={(e) => setNewFlyer((p) => ({ ...p, template_key: e.target.value }))} className="ritual-input w-full text-xs">
                {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Image Path</label>
              <input value={newFlyer.image_path} onChange={(e) => setNewFlyer((p) => ({ ...p, image_path: e.target.value }))} className="ritual-input w-full text-xs" placeholder="/assets/..." />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Sort Order</label>
              <input type="number" value={newFlyer.sort_order} onChange={(e) => setNewFlyer((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="ritual-input w-full text-xs" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={saving === 'new' || !newFlyer.title} className="jungle-button px-6 py-2 text-xs">
              {saving === 'new' ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-[12px] text-bone-dark hover:text-bone-muted">Cancel</button>
          </div>
        </div>
      )}

      {flyers.sort((a, b) => a.sort_order - b.sort_order).map((flyer) => {
        const ev = editValues[flyer.id] ?? flyer;
        const isOpen = expanded === flyer.id;
        return (
          <div key={flyer.id} className="border border-moss-dark/20 bg-ritual-surface/20">
            <button
              onClick={() => toggle(flyer.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <div className="text-xs font-medium text-bone">{flyer.title}</div>
                <div className="text-[11px] text-bone-faint mt-0.5">{flyer.asset_type} · {flyer.template_key}</div>
              </div>
              {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-bone-dark" /> : <ChevronDown className="h-3.5 w-3.5 text-bone-dark" />}
            </button>

            {isOpen && (
              <div className="border-t border-moss-dark/20 px-4 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Title</label>
                    <input value={String(ev.title ?? flyer.title)} onChange={(e) => setField(flyer.id, 'title', e.target.value)} className="ritual-input w-full text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Subtitle</label>
                    <input value={String(ev.subtitle ?? flyer.subtitle)} onChange={(e) => setField(flyer.id, 'subtitle', e.target.value)} className="ritual-input w-full text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Template</label>
                    <select value={String(ev.template_key ?? flyer.template_key)} onChange={(e) => setField(flyer.id, 'template_key', e.target.value)} className="ritual-input w-full text-xs">
                      {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Sort Order</label>
                    <input type="number" value={Number(ev.sort_order ?? flyer.sort_order)} onChange={(e) => setField(flyer.id, 'sort_order', Number(e.target.value))} className="ritual-input w-full text-xs" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Image Path</label>
                    <input value={String(ev.image_path ?? flyer.image_path)} onChange={(e) => setField(flyer.id, 'image_path', e.target.value)} className="ritual-input w-full text-xs" placeholder="/assets/..." />
                  </div>
                </div>
                <button onClick={() => save(flyer.id)} disabled={saving === flyer.id} className="jungle-button px-6 py-2 text-xs">
                  {saving === flyer.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
