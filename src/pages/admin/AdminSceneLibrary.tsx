import { useEffect, useState, useCallback } from 'react';
import { Layers, ToggleLeft, ToggleRight, Archive, Trash2, RefreshCw, AlertTriangle, PenLine } from 'lucide-react';
import { useSkullGateScenes, type SkullGateSceneRow } from '../../hooks/useSkullGateScenes';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type View = 'active' | 'archived';

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function statusColor(status: SkullGateSceneRow['status']) {
  if (status === 'published') return 'text-moss-light';
  if (status === 'archived')  return 'text-death-glow';
  return 'text-torch-ember';
}

function statusBg(status: SkullGateSceneRow['status']) {
  if (status === 'published') return 'border-moss-dark/40 text-moss-light';
  if (status === 'archived')  return 'border-death-red/30 text-death-glow';
  return 'border-torch-orange/30 text-torch-ember';
}

export default function AdminSceneLibrary({ onEdit }: { onEdit?: (sceneId: string) => void } = {}) {
  const api = useSkullGateScenes();
  const [rows,    setRows]    = useState<SkullGateSceneRow[]>([]);
  const [view,    setView]    = useState<View>('active');
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.listScenes();
    if (data) setRows(data);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  };

  const handleToggleEnabled = async (row: SkullGateSceneRow) => {
    setActioning(row.id + '_enable');
    const result = await api.setEnabled(row.id, !row.enabled);
    setActioning(null);
    if (result?.success) { await load(); flash(`${row.title} ${!row.enabled ? 'enabled' : 'disabled'}`); }
  };

  const handleArchive = async (row: SkullGateSceneRow) => {
    setActioning(row.id + '_archive');
    const result = await api.archiveScene(row.id);
    setActioning(null);
    if (result?.success) { await load(); flash(`"${row.title}" archived`); }
  };

  const handleDelete = async (row: SkullGateSceneRow) => {
    setActioning(row.id + '_delete');
    const result = await api.deleteScene(row.id);
    setActioning(null);
    setConfirmDelete(null);
    if (result?.success) { await load(); flash(`"${row.title}" permanently deleted`); }
  };

  const active   = rows.filter((r) => r.status !== 'archived');
  const archived = rows.filter((r) => r.status === 'archived');
  const displayed = view === 'active' ? active : archived;

  if (api.loading && rows.length === 0) {
    return <div className="flex justify-center py-10"><LoadingSpinner size="sm" /></div>;
  }

  return (
    <div className="space-y-4">

      {/* Header + tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Scene Library</h2>
          <span className="text-[12px] text-bone-dark">{rows.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-[12px] text-moss-light">{msg}</span>}
          {api.error && <span className="text-[12px] text-death-glow">{api.error}</span>}
          <button
            onClick={load}
            className="flex items-center gap-1 text-[12px] uppercase tracking-[0.1em] text-bone-dark hover:text-bone-muted transition-colors"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex gap-1 border-b border-moss-dark/20 pb-0">
        {([['active', `Active (${active.length})`], ['archived', `Archived (${archived.length})`]] as [View, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-[12px] uppercase tracking-[0.1em] border-b-2 transition-colors ${
              view === v
                ? 'border-torch-ember text-torch-ember'
                : 'border-transparent text-bone-dark hover:text-bone-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Archived warning */}
      {view === 'archived' && archived.length > 0 && (
        <div className="flex items-start gap-2 border border-death-red/20 bg-death-dim/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-death-glow flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[12px] text-death-glow/80 leading-snug">
            Deletion is permanent and cannot be undone. Only archived scenes can be deleted.
          </p>
        </div>
      )}

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="py-8 text-center text-sm text-bone-dark">
          {view === 'active' ? 'No active scenes.' : 'No archived scenes.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-moss-dark/25">
                {['Title', 'Slug', 'Status', 'Enabled', 'Weight', 'Created', 'Last Updated', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-bone-faint font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((row) => {
                const isActioning = actioning?.startsWith(row.id);
                return (
                  <tr key={row.id} className="border-b border-moss-dark/15 hover:bg-ritual-surface/20 transition-colors">
                    {/* Title */}
                    <td className="px-3 py-3">
                      {onEdit ? (
                        <button
                          onClick={() => onEdit(row.id)}
                          className="text-[13px] font-medium text-bone hover:text-torch-ember transition-colors max-w-[180px] truncate block text-left"
                          title="Edit scene"
                        >
                          {row.title}
                        </button>
                      ) : (
                        <div className="text-[13px] font-medium text-bone max-w-[180px] truncate">{row.title}</div>
                      )}
                    </td>
                    {/* Slug */}
                    <td className="px-3 py-3">
                      <span className="text-[11px] font-mono text-bone-dark">{row.slug}</span>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={`text-[11px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${statusBg(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    {/* Enabled */}
                    <td className="px-3 py-3">
                      {view === 'active' ? (
                        <button
                          onClick={() => handleToggleEnabled(row)}
                          disabled={!!isActioning}
                          className="flex items-center gap-1.5 transition-colors"
                          title={row.enabled ? 'Click to disable' : 'Click to enable'}
                        >
                          {row.enabled
                            ? <ToggleRight className="h-4 w-4 text-moss-light" strokeWidth={1.5} />
                            : <ToggleLeft  className="h-4 w-4 text-bone-faint" strokeWidth={1.5} />
                          }
                          <span className={`text-[11px] ${row.enabled ? 'text-moss-light' : 'text-bone-faint'}`}>
                            {row.enabled ? 'On' : 'Off'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-bone-faint">—</span>
                      )}
                    </td>
                    {/* Weight */}
                    <td className="px-3 py-3">
                      <span className="text-[12px] text-bone-muted">{row.weight ?? 1}</span>
                    </td>
                    {/* Created */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-[11px] text-bone-dark">{fmt(row.created_at)}</span>
                    </td>
                    {/* Updated */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-[11px] text-bone-dark">{fmt(row.updated_at)}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {onEdit && view === 'active' && (
                          <button
                            onClick={() => onEdit(row.id)}
                            disabled={!!isActioning}
                            className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-bone-dark hover:text-torch-ember transition-colors disabled:opacity-40"
                            title="Edit scene"
                          >
                            <PenLine className="h-3 w-3" strokeWidth={1.5} />
                            Edit
                          </button>
                        )}
                        {view === 'active' && (
                          <button
                            onClick={() => handleArchive(row)}
                            disabled={!!isActioning}
                            className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-bone-dark hover:text-death-glow transition-colors disabled:opacity-40"
                            title="Archive scene"
                          >
                            {actioning === row.id + '_archive'
                              ? <RefreshCw className="h-3 w-3 animate-spin" />
                              : <Archive className="h-3 w-3" strokeWidth={1.5} />
                            }
                            Archive
                          </button>
                        )}
                        {view === 'archived' && confirmDelete !== row.id && (
                          <button
                            onClick={() => setConfirmDelete(row.id)}
                            disabled={!!isActioning}
                            className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-death-glow/60 hover:text-death-glow transition-colors disabled:opacity-40"
                            title="Delete permanently"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            Delete
                          </button>
                        )}
                        {view === 'archived' && confirmDelete === row.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-death-glow/80">Confirm?</span>
                            <button
                              onClick={() => handleDelete(row)}
                              disabled={actioning === row.id + '_delete'}
                              className="text-[11px] uppercase tracking-[0.08em] border border-death-red/40 bg-death-dim/15 px-2 py-0.5 text-death-glow hover:bg-death-dim/30 transition-colors disabled:opacity-40"
                            >
                              {actioning === row.id + '_delete' ? '…' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[11px] text-bone-dark hover:text-bone-muted transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
