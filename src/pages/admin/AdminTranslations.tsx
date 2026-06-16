import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Plus, Upload, Download, Trash2, Check, X, CreditCard as Edit2, ChevronDown, ChevronUp, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { invalidateTranslationCache } from '../../context/I18nContext';

interface Language {
  code: string;
  name: string;
  native_name: string;
  enabled: boolean;
  is_default: boolean;
  sort_order: number;
}

interface TranslationRow {
  id: string;
  language_code: string;
  key: string;
  value: string;
}

type ImportMode = 'overwrite' | 'only_new';

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: 10,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      border: `1px solid ${enabled ? 'rgba(120,176,96,0.4)' : 'rgba(255,255,255,0.12)'}`,
      color: enabled ? '#78B060' : 'rgba(255,255,255,0.35)',
      background: enabled ? 'rgba(120,176,96,0.06)' : 'transparent',
    }}>
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

// ── Language management ───────────────────────────────────────────────────────

function LanguageManager({ onLanguageChange }: { onLanguageChange: () => void }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLang, setNewLang] = useState({ code: '', name: '', native_name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_languages')
      .select('*')
      .order('sort_order');
    setLanguages((data as Language[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (lang: Language) => {
    if (lang.is_default) return;
    await supabase
      .from('app_languages')
      .update({ enabled: !lang.enabled })
      .eq('code', lang.code);
    invalidateTranslationCache(lang.code);
    await load();
    onLanguageChange();
  };

  const handleAdd = async () => {
    const code = newLang.code.toLowerCase().trim();
    if (!code || !newLang.name.trim() || !newLang.native_name.trim()) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    setError(null);
    const maxOrder = Math.max(0, ...languages.map((l) => l.sort_order));
    const { error: dbErr } = await supabase.from('app_languages').insert({
      code,
      name: newLang.name.trim(),
      native_name: newLang.native_name.trim(),
      enabled: false,
      is_default: false,
      sort_order: maxOrder + 1,
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setNewLang({ code: '', name: '', native_name: '' });
    setShowAddForm(false);
    await load();
    onLanguageChange();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)' }}>
          Languages
        </span>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 border border-torch-orange/20 px-3 py-1.5 text-[10px] tracking-widest uppercase text-torch-ember transition-all hover:border-torch-orange/40"
        >
          <Plus className="h-3 w-3" /> Add Language
        </button>
      </div>

      {showAddForm && (
        <div style={{ padding: '16px', background: 'rgba(255,122,0,0.04)', border: '1px solid rgba(255,122,0,0.15)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>New Language</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Code (BCP-47)</div>
              <input
                className="ritual-input w-full"
                value={newLang.code}
                onChange={(e) => setNewLang((p) => ({ ...p, code: e.target.value }))}
                placeholder="e.g. fr"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>English Name</div>
              <input
                className="ritual-input w-full"
                value={newLang.name}
                onChange={(e) => setNewLang((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. French"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Native Name</div>
              <input
                className="ritual-input w-full"
                value={newLang.native_name}
                onChange={(e) => setNewLang((p) => ({ ...p, native_name: e.target.value }))}
                placeholder="e.g. Français"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
          {error && <div style={{ fontSize: 11, color: '#CC5555' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="jungle-button text-[11px] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add Language'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setError(null); }}
              className="border border-white/10 px-3 py-1.5 text-[11px] text-bone-dark hover:text-bone-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '16px 0' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {languages.map((lang) => (
            <div key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Globe className="h-4 w-4 text-bone-dark flex-shrink-0" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {lang.native_name} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>({lang.name})</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {lang.code}{lang.is_default ? ' · Default' : ''}
                </div>
              </div>
              <StatusBadge enabled={lang.enabled} />
              {!lang.is_default && (
                <button
                  onClick={() => handleToggle(lang)}
                  style={{ fontSize: 11, color: lang.enabled ? 'rgba(200,80,80,0.7)' : 'rgba(120,176,96,0.8)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  {lang.enabled ? 'Disable' : 'Enable'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Translation editor ────────────────────────────────────────────────────────

interface EditingCell {
  id: string;
  value: string;
}

function TranslationEditor({ languages }: { languages: Language[] }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('only_new');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadRows = useCallback(async (lang: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('translations')
      .select('id, language_code, key, value')
      .eq('language_code', lang)
      .order('key');
    setRows((data as TranslationRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRows(selectedLang); }, [selectedLang, loadRows]);

  const handleSaveCell = async () => {
    if (!editing) return;
    setSaving(true);
    await supabase
      .from('translations')
      .update({ value: editing.value })
      .eq('id', editing.id);
    invalidateTranslationCache(selectedLang);
    setRows((prev) => prev.map((r) => r.id === editing.id ? { ...r, value: editing.value } : r));
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (row: TranslationRow) => {
    if (!confirm(`Delete key "${row.key}" for ${row.language_code}?`)) return;
    await supabase.from('translations').delete().eq('id', row.id);
    invalidateTranslationCache(row.language_code);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const handleAddRow = async () => {
    const key = newKey.trim();
    const value = newValue.trim();
    if (!key || !value) return;
    const { data, error } = await supabase
      .from('translations')
      .upsert({ language_code: selectedLang, key, value }, { onConflict: 'language_code,key' })
      .select()
      .single();
    if (!error && data) {
      invalidateTranslationCache(selectedLang);
      setRows((prev) => {
        const filtered = prev.filter((r) => r.key !== key);
        return [...filtered, data as TranslationRow].sort((a, b) => a.key.localeCompare(b.key));
      });
      setNewKey('');
      setNewValue('');
      setShowNewRow(false);
    }
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const header = 'key,value\n';
    const body = rows
      .map((r) => `${JSON.stringify(r.key)},${JSON.stringify(r.value)}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_${selectedLang}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV import ────────────────────────────────────────────────────────────
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      // Skip header row if it starts with "key"
      const dataLines = lines[0]?.toLowerCase().startsWith('"key"') || lines[0]?.toLowerCase().startsWith('key')
        ? lines.slice(1)
        : lines;

      type ParsedRow = { key: string; value: string };
      const parsed: ParsedRow[] = [];
      for (const line of dataLines) {
        // Simple CSV parse supporting quoted fields
        const match = line.match(/^"([^"]*(?:""[^"]*)*)","?(.*?)"?$/);
        if (match) {
          parsed.push({ key: match[1].replace(/""/g, '"'), value: match[2].replace(/""/g, '"') });
        } else {
          const commaIdx = line.indexOf(',');
          if (commaIdx > 0) {
            parsed.push({ key: line.slice(0, commaIdx).trim(), value: line.slice(commaIdx + 1).trim() });
          }
        }
      }

      if (parsed.length === 0) { setImportError('No rows found in CSV.'); setImporting(false); return; }

      let upsertRows: ParsedRow[];
      if (importMode === 'only_new') {
        const existingKeys = new Set(rows.map((r) => r.key));
        upsertRows = parsed.filter((p) => !existingKeys.has(p.key));
      } else {
        upsertRows = parsed;
      }

      if (upsertRows.length === 0) {
        setImportSuccess('No new keys to import (all already exist).');
        setImporting(false);
        return;
      }

      const { error: dbErr } = await supabase.from('translations').upsert(
        upsertRows.map((r) => ({ language_code: selectedLang, key: r.key, value: r.value })),
        { onConflict: 'language_code,key' },
      );

      if (dbErr) { setImportError(dbErr.message); setImporting(false); return; }

      invalidateTranslationCache(selectedLang);
      await loadRows(selectedLang);
      setImportSuccess(`Imported ${upsertRows.length} row${upsertRows.length === 1 ? '' : 's'} successfully.`);
    } catch (err) {
      setImportError(String(err));
    }
    setImporting(false);
  };

  const filteredRows = filter
    ? rows.filter((r) => r.key.toLowerCase().includes(filter.toLowerCase()) || r.value.toLowerCase().includes(filter.toLowerCase()))
    : rows;

  const enabledLanguages = languages.filter((l) => l.enabled || l.is_default);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Language selector — dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              padding: '6px 32px 6px 12px',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '1px solid rgba(255,122,0,0.35)',
              background: 'rgba(255,122,0,0.06)',
              color: '#FF9A30',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 140,
            }}
          >
            {enabledLanguages.map((l) => (
              <option
                key={l.code}
                value={l.code}
                style={{ background: '#0B0F0C', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}
              >
                {l.code.toUpperCase()} — {l.native_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#FF9A30',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Search */}
        <div style={{ flex: 1, position: 'relative', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            className="ritual-input w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter keys…"
            style={{ paddingLeft: 30, fontSize: 12 }}
          />
        </div>

        <button
          onClick={() => loadRows(selectedLang)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px', transition: 'color 0.15s' }}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[10px] tracking-wider uppercase text-bone-dark hover:text-bone-muted hover:border-white/20 transition-all"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>

      {/* Import strip */}
      <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>Import CSV:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['only_new', 'overwrite'] as ImportMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setImportMode(mode)}
              style={{
                padding: '4px 10px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                border: `1px solid ${importMode === mode ? 'rgba(255,122,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: importMode === mode ? 'rgba(255,122,0,0.07)' : 'transparent',
                color: importMode === mode ? '#FF9A30' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}
            >
              {mode === 'only_new' ? 'Only New' : 'Overwrite All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 border border-torch-orange/25 px-3 py-1.5 text-[10px] tracking-wider uppercase text-torch-ember hover:border-torch-orange/45 transition-all disabled:opacity-40"
        >
          <Upload className="h-3 w-3" /> {importing ? 'Importing…' : 'Choose File'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }}
        />
        {importError && (
          <span style={{ fontSize: 11, color: '#CC5555', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} /> {importError}
          </span>
        )}
        {importSuccess && (
          <span style={{ fontSize: 11, color: '#78B060', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} /> {importSuccess}
          </span>
        )}
      </div>

      {/* Key count + Add row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
          {loading ? 'Loading…' : `${filteredRows.length} ${filteredRows.length === 1 ? 'key' : 'keys'}${filter ? ' matching' : ''} · ${rows.length} total`}
        </span>
        <button
          onClick={() => setShowNewRow((v) => !v)}
          className="flex items-center gap-1.5 border border-torch-orange/20 px-3 py-1.5 text-[10px] tracking-wider uppercase text-torch-ember hover:border-torch-orange/40 transition-all"
        >
          <Plus className="h-3 w-3" /> Add Key
        </button>
      </div>

      {/* Add new key form */}
      {showNewRow && (
        <div style={{ padding: '12px 14px', background: 'rgba(255,122,0,0.04)', border: '1px solid rgba(255,122,0,0.15)', display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            className="ritual-input"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key.name"
            style={{ fontSize: 12, flex: '0 0 220px' }}
          />
          <input
            className="ritual-input"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Translation value"
            style={{ fontSize: 12, flex: 1, minWidth: 180 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); }}
          />
          <button onClick={handleAddRow} className="jungle-button text-[11px]">Save</button>
          <button onClick={() => { setShowNewRow(false); setNewKey(''); setNewValue(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '8px' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Translation rows */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Loading translations…</div>
      ) : filteredRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
          {filter ? 'No keys match the filter.' : 'No translations yet. Import a CSV or add keys manually.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredRows.map((row) => {
            const isEditing = editing?.id === row.id;
            return (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 0,
                  background: isEditing ? 'rgba(255,122,0,0.05)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${isEditing ? 'rgba(255,122,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  transition: 'all 0.1s',
                }}
              >
                {/* Key */}
                <div style={{ padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11, color: 'rgba(255,200,100,0.75)', letterSpacing: '0.02em' }}>
                    {row.key}
                  </span>
                </div>

                {/* Value */}
                <div style={{ padding: '6px 10px', borderRight: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center' }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      className="ritual-input w-full"
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCell();
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      style={{ fontSize: 12 }}
                    />
                  ) : (
                    <span
                      style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, cursor: 'text' }}
                      onDoubleClick={() => setEditing({ id: row.id, value: row.value })}
                    >
                      {row.value || <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>empty</span>}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveCell}
                        disabled={saving}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78B060', padding: '4px', opacity: saving ? 0.5 : 1 }}
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px' }}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing({ id: row.id, value: row.value })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '4px', transition: 'color 0.15s' }}
                        title="Edit"
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px', transition: 'color 0.15s' }}
                        title="Delete"
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(200,80,80,0.7)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function AdminTranslations() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeSection, setActiveSection] = useState<'editor' | 'languages'>('editor');

  const loadLanguages = useCallback(async () => {
    const { data } = await supabase.from('app_languages').select('*').order('sort_order');
    setLanguages((data as Language[]) ?? []);
  }, []);

  useEffect(() => { loadLanguages(); }, [loadLanguages]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-torch-ember" strokeWidth={1.4} />
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-bone-muted">Translation Manager</h2>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['editor', 'languages'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-3 py-1.5 text-[10px] tracking-widest uppercase border transition-all ${
                activeSection === s
                  ? 'border-torch-orange/30 bg-torch-orange/5 text-torch-ember'
                  : 'border-transparent text-bone-dark hover:text-bone-muted'
              }`}
            >
              {s === 'editor' ? 'Translations' : 'Languages'}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'editor' && <TranslationEditor languages={languages} />}
      {activeSection === 'languages' && <LanguageManager onLanguageChange={loadLanguages} />}
    </div>
  );
}
