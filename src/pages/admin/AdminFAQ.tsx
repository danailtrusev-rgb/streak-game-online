import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
}

const UF = "'Inter', system-ui, sans-serif";
const BF = "'Lora', Georgia, serif";

function FaqRow({
  item,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: FaqItem;
  onUpdate: (updated: Partial<FaqItem>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    await onUpdate({ question: question.trim(), answer: answer.trim() });
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setEditing(false);
  };

  return (
    <div style={{
      border: `1px solid ${editing ? 'rgba(255,122,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
      background: editing ? 'rgba(255,122,0,0.03)' : 'rgba(255,255,255,0.02)',
      transition: 'border-color 0.15s ease, background 0.15s ease',
      opacity: item.enabled ? 1 : 0.5,
    }}>
      {editing ? (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Question</div>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                color: '#E8E0D4', fontFamily: UF, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Answer</div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                color: '#E8E0D4', fontFamily: BF, fontSize: 13, lineHeight: 1.6,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving || !question.trim() || !answer.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', cursor: 'pointer',
                background: 'rgba(120,176,96,0.12)', border: '1px solid rgba(120,176,96,0.3)',
                fontFamily: UF, fontSize: 12, color: '#A8D090',
                opacity: saving || !question.trim() || !answer.trim() ? 0.5 : 1,
              }}
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)',
              }}
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
          {/* Reorder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <button onClick={onMoveUp} disabled={isFirst} style={{ background: 'none', border: 'none', cursor: isFirst ? 'not-allowed' : 'pointer', padding: 2, opacity: isFirst ? 0.2 : 0.5 }}>
              <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
            <button onClick={onMoveDown} disabled={isLast} style={{ background: 'none', border: 'none', cursor: isLast ? 'not-allowed' : 'pointer', padding: 2, opacity: isLast ? 0.2 : 0.5 }}>
              <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
              {item.question}
            </div>
            <div style={{ fontFamily: BF, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
              {item.answer}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onUpdate({ enabled: !item.enabled })}
              title={item.enabled ? 'Hide' : 'Show'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: item.enabled ? 'rgba(120,176,96,0.7)' : 'rgba(255,255,255,0.2)' }}
            >
              {item.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'rgba(255,122,0,0.6)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
              onClick={onDelete}
              title="Delete"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'rgba(180,50,50,0.6)' }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFAQ() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('faq_items')
      .select('*')
      .order('sort_order', { ascending: true });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data ?? []) as FaqItem[]);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleUpdate = async (id: string, patch: Partial<FaqItem>) => {
    const { error: err } = await supabase.from('faq_items').update(patch).eq('id', id);
    if (err) { setError(err.message); return; }
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this FAQ item?')) return;
    const { error: err } = await supabase.from('faq_items').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const updated = [...items];
    const prevOrder = updated[idx - 1].sort_order;
    const currOrder = updated[idx].sort_order;
    await supabase.from('faq_items').update({ sort_order: prevOrder }).eq('id', updated[idx].id);
    await supabase.from('faq_items').update({ sort_order: currOrder }).eq('id', updated[idx - 1].id);
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    updated[idx - 1] = { ...updated[idx - 1], sort_order: prevOrder };
    updated[idx]     = { ...updated[idx],     sort_order: currOrder };
    setItems(updated);
  };

  const handleMoveDown = async (idx: number) => {
    if (idx === items.length - 1) return;
    const updated = [...items];
    const nextOrder = updated[idx + 1].sort_order;
    const currOrder = updated[idx].sort_order;
    await supabase.from('faq_items').update({ sort_order: nextOrder }).eq('id', updated[idx].id);
    await supabase.from('faq_items').update({ sort_order: currOrder }).eq('id', updated[idx + 1].id);
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    updated[idx]     = { ...updated[idx],     sort_order: nextOrder };
    updated[idx + 1] = { ...updated[idx + 1], sort_order: currOrder };
    setItems(updated);
  };

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setSaving(true);
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
    const { data, error: err } = await supabase
      .from('faq_items')
      .insert({ question: newQuestion.trim(), answer: newAnswer.trim(), sort_order: maxOrder + 10, enabled: true })
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    setItems((prev) => [...prev, data as FaqItem]);
    setNewQuestion('');
    setNewAnswer('');
    setAddingNew(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: UF, fontSize: 16, fontWeight: 700, color: '#E8E0D4', margin: 0 }}>FAQ Management</h2>
          <p style={{ fontFamily: BF, fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · shown on Settings &gt; Support
          </p>
        </div>
        <button
          onClick={() => setAddingNew(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', cursor: 'pointer',
            background: 'rgba(120,176,96,0.10)', border: '1px solid rgba(120,176,96,0.3)',
            fontFamily: UF, fontSize: 12, fontWeight: 600, color: '#A8D090',
          }}
        >
          <Plus size={14} /> Add Question
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(80,0,0,0.2)', border: '1px solid rgba(180,30,30,0.3)', fontSize: 12, color: '#CC5555', fontFamily: UF }}>
          {error}
        </div>
      )}

      {/* Add new form */}
      {addingNew && (
        <div style={{ border: '1px solid rgba(255,122,0,0.28)', background: 'rgba(255,122,0,0.03)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: UF, fontSize: 12, fontWeight: 600, color: 'rgba(255,122,0,0.8)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            New FAQ Item
          </div>
          <div>
            <div style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Question</div>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. How does the pot work?"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                color: '#E8E0D4', fontFamily: UF, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>
          <div>
            <div style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Answer</div>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Full answer text…"
              rows={4}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                color: '#E8E0D4', fontFamily: BF, fontSize: 13, lineHeight: 1.6,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', cursor: 'pointer',
                background: 'rgba(120,176,96,0.12)', border: '1px solid rgba(120,176,96,0.3)',
                fontFamily: UF, fontSize: 12, color: '#A8D090',
                opacity: saving || !newQuestion.trim() || !newAnswer.trim() ? 0.5 : 1,
              }}
            >
              <Plus size={13} /> {saving ? 'Adding…' : 'Add Item'}
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewQuestion(''); setNewAnswer(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)',
              }}
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: UF, fontSize: 12 }}>
          Loading FAQ items…
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: UF, fontSize: 13 }}>
          No FAQ items yet. Add the first one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, idx) => (
            <FaqRow
              key={item.id}
              item={item}
              onUpdate={(patch) => handleUpdate(item.id, patch)}
              onDelete={() => handleDelete(item.id)}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
