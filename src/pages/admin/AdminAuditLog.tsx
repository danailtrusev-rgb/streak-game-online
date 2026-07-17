import { useEffect, useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import type { AuditLogEntry } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminAuditLog() {
  const { fetchAuditLog, loading, error } = useAdmin();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    fetchAuditLog().then((data) => {
      if (data) setEntries(data);
    });
  }, [fetchAuditLog]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-death-red/30 bg-death-dim/30 px-4 py-3 text-sm text-death-glow">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-bone-dark">
        No admin actions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const date = new Date(entry.created_at);
        return (
          <div key={entry.id} className="border border-moss-dark/30 bg-ritual-surface/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-bone">{entry.action}</span>
              <span className="text-[11px] text-bone-dark">
                {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-bone-dark">{entry.admin_actor}</div>
            <pre className="mt-2 overflow-x-auto border border-moss-dark/20 bg-ritual-bg/60 px-2 py-1 text-[12px] text-bone-muted">
              {JSON.stringify(entry.payload_json, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
