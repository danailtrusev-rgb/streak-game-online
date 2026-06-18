import { useEffect, useState } from 'react';
import { Trophy, Plus, Check } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import type { QualificationRule } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EMPTY_RULE: Omit<QualificationRule, 'id'> = {
  rule_name: '',
  target_event: 'saturday_main_event',
  rule_type: 'min_points',
  threshold_value: 50,
  required_games_json: [],
  active: true,
  priority: 1,
};

export default function AdminQualificationRules() {
  const { fetchQualRules, updateQualRule, createQualRule, loading, error } = useAdmin();
  const [rules, setRules] = useState<QualificationRule[]>([]);
  const [editValues, setEditValues] = useState<Record<string, Partial<QualificationRule>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({ ...EMPTY_RULE });

  const load = async () => {
    const data = await fetchQualRules();
    if (data) setRules(data);
  };

  useEffect(() => { load(); }, []);

  const setField = (id: string, key: keyof QualificationRule, value: unknown) => {
    setEditValues((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  const save = async (id: string) => {
    const fields = editValues[id];
    if (!fields) return;
    setSaving(id);
    await updateQualRule(id, fields);
    setSaving(null);
    setSaveMsg('Saved');
    await load();
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const handleCreate = async () => {
    if (!newRule.rule_name) return;
    setSaving('new');
    await createQualRule(newRule);
    setSaving(null);
    setShowCreate(false);
    setNewRule({ ...EMPTY_RULE });
    await load();
  };

  if (loading && !rules.length) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Qualification Rules</h2>
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
            <Plus className="h-3 w-3" strokeWidth={2} /> New Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/20 px-3 py-2 text-xs text-death-glow">{error}</div>
      )}

      {showCreate && (
        <div className="border border-torch-orange/20 bg-torch-orange/5 px-4 py-4 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">New Rule</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Rule Name</label>
              <input value={newRule.rule_name} onChange={(e) => setNewRule((p) => ({ ...p, rule_name: e.target.value }))} className="ritual-input w-full text-xs" placeholder="e.g. Saturday 50pts" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Target Event</label>
              <select value={newRule.target_event} onChange={(e) => setNewRule((p) => ({ ...p, target_event: e.target.value }))} className="ritual-input w-full text-xs">
                <option value="saturday_main_event">Saturday</option>
                <option value="sunday_winners_event">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Rule Type</label>
              <select value={newRule.rule_type} onChange={(e) => setNewRule((p) => ({ ...p, rule_type: e.target.value }))} className="ritual-input w-full text-xs">
                <option value="min_points">Min Points</option>
                <option value="min_games_played">Min Games Played</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Threshold</label>
              <input type="number" value={newRule.threshold_value} onChange={(e) => setNewRule((p) => ({ ...p, threshold_value: Number(e.target.value) }))} className="ritual-input w-full text-xs" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Priority</label>
              <input type="number" value={newRule.priority} onChange={(e) => setNewRule((p) => ({ ...p, priority: Number(e.target.value) }))} className="ritual-input w-full text-xs" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newRule.active} onChange={(e) => setNewRule((p) => ({ ...p, active: e.target.checked }))} className="accent-torch-ember" />
                <span className="text-[12px] text-bone-muted">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={saving === 'new' || !newRule.rule_name} className="jungle-button px-6 py-2 text-xs">
              {saving === 'new' ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-[12px] text-bone-dark hover:text-bone-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {rules.sort((a, b) => a.priority - b.priority).map((rule) => {
        const ev = editValues[rule.id] ?? rule;
        return (
          <div key={rule.id} className="border border-moss-dark/20 bg-ritual-surface/20 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-bone">{rule.rule_name}</div>
                <div className="text-[11px] text-bone-faint mt-0.5">{rule.target_event} · {rule.rule_type} · pri {rule.priority}</div>
              </div>
              <div className={`h-2 w-2 rounded-full ${rule.active ? 'bg-moss-light' : 'bg-bone-faint'}`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Threshold</label>
                <input
                  type="number"
                  value={Number(ev.threshold_value ?? rule.threshold_value)}
                  onChange={(e) => setField(rule.id, 'threshold_value', Number(e.target.value))}
                  className="ritual-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Priority</label>
                <input
                  type="number"
                  value={Number(ev.priority ?? rule.priority)}
                  onChange={(e) => setField(rule.id, 'priority', Number(e.target.value))}
                  className="ritual-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Target Event</label>
                <select
                  value={String(ev.target_event ?? rule.target_event)}
                  onChange={(e) => setField(rule.id, 'target_event', e.target.value)}
                  className="ritual-input w-full text-xs"
                >
                  <option value="saturday_main_event">Saturday</option>
                  <option value="sunday_winners_event">Sunday</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(ev.active ?? rule.active)}
                    onChange={(e) => setField(rule.id, 'active', e.target.checked)}
                    className="accent-torch-ember"
                  />
                  <span className="text-[12px] text-bone-muted">Active</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => save(rule.id)}
              disabled={saving === rule.id}
              className="jungle-button px-6 py-2 text-xs"
            >
              {saving === rule.id ? 'Saving...' : 'Save'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
