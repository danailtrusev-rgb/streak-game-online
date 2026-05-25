import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, RefreshCw, DollarSign, Trophy, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { formatCents } from '../../lib/constants';
import type { AdminUser } from '../../lib/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { searchUsers, adjustBalance, resetStreak, banUser, grantQualification, loading, error } = useAdmin();

  const [query, setQuery]           = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const [adjustModal, setAdjustModal]   = useState<{ userId: string; guestId: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [qualModal, setQualModal]       = useState<{ userId: string; guestId: string } | null>(null);
  const [qualTarget, setQualTarget]     = useState<'saturday_main_event' | 'sunday_winners_event'>('saturday_main_event');
  const [qualGrant, setQualGrant]       = useState(true);
  const [actioning, setActioning]       = useState<string | null>(null);

  const load = useCallback(async (q: string, p: number) => {
    const data = await searchUsers(q, p, PAGE_SIZE);
    if (data) {
      setUsers(data.users);
      setTotal(data.total);
    }
  }, [searchUsers]);

  // Load first page on mount
  useEffect(() => { load('', 1); }, [load]);

  const handleSearch = () => {
    const q = draftQuery.trim();
    setQuery(q);
    setPage(1);
    setExpanded(null);
    load(q, 1);
  };

  const handleClearSearch = () => {
    setDraftQuery('');
    setQuery('');
    setPage(1);
    setExpanded(null);
    load('', 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    setExpanded(null);
    load(query, p);
  };

  const refreshCurrent = () => load(query, page);

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount) return;
    const cents = Math.round(parseFloat(adjustAmount) * 100);
    if (isNaN(cents)) return;
    setActioning('adjust');
    await adjustBalance(adjustModal.userId, cents, adjustReason || 'Admin adjustment');
    setActioning(null);
    setAdjustModal(null);
    setAdjustAmount('');
    setAdjustReason('');
    refreshCurrent();
  };

  const handleResetStreak = async (userId: string) => {
    setActioning(userId + '_reset');
    await resetStreak(userId);
    setActioning(null);
    refreshCurrent();
  };

  const handleBan = async (userId: string, banned: boolean) => {
    setActioning(userId + '_ban');
    await banUser(userId, banned);
    setActioning(null);
    refreshCurrent();
  };

  const handleGrantQual = async () => {
    if (!qualModal) return;
    setActioning('qual');
    await grantQualification(qualModal.userId, qualTarget, qualGrant);
    setActioning(null);
    setQualModal(null);
    refreshCurrent();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">

      {/* Search bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-bone-dark pointer-events-none" />
          <input
            type="text"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Search by guest ID or UUID…"
            className="ritual-input w-full pl-9 pr-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {draftQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-dark hover:text-bone transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="jungle-button-secondary px-4 py-2 text-xs flex items-center gap-1.5 flex-shrink-0"
        >
          {loading ? <LoadingSpinner size="sm" /> : <Search className="h-3.5 w-3.5" />}
          Search
        </button>
      </div>

      {/* Count + sort note */}
      <div className="flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">
          {query
            ? `${total} result${total !== 1 ? 's' : ''} for "${query}"`
            : `${total} player${total !== 1 ? 's' : ''} · sorted by recent activity`}
        </div>
        {total > 0 && (
          <div className="text-[9px] text-bone-dark">
            Page {page} of {totalPages}
          </div>
        )}
      </div>

      {error && (
        <div className="border border-death-red/30 bg-death-dim/30 px-4 py-3 text-sm text-death-glow">
          {error}
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : users.length === 0 ? (
        <div className="py-8 text-center text-sm text-bone-dark">
          {query ? 'No players found.' : 'No players yet.'}
        </div>
      ) : (
        <>
          {/* User rows */}
          <div className="space-y-1">
            {users.map((user) => {
              const isExpanded = expanded === user.id;
              return (
                <div key={user.id} className="border border-moss-dark/30 bg-ritual-surface/30">
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpanded(isExpanded ? null : user.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${user.status === 'banned' ? 'bg-death-red' : 'bg-moss-light'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-bone truncate max-w-[120px] sm:max-w-none">
                          {user.guest_id}
                        </div>
                        <div className="text-[9px] text-bone-dark font-mono">{user.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-bone font-heading">{user.current_streak} streak</div>
                        <div className="text-[9px] text-bone-dark">{formatCents(user.wallet_balance)}</div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-3.5 w-3.5 text-bone-dark" />
                        : <ChevronDown className="h-3.5 w-3.5 text-bone-dark" />
                      }
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-moss-dark/20 px-4 py-4 space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="border border-moss-dark/15 px-2 py-2">
                          <div className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">Streak</div>
                          <div className="font-heading font-bold text-bone">{user.current_streak}</div>
                        </div>
                        <div className="border border-moss-dark/15 px-2 py-2">
                          <div className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">Pot</div>
                          <div className="font-heading font-bold text-torch-ember">{formatCents(user.pot_cents)}</div>
                        </div>
                        <div className="border border-moss-dark/15 px-2 py-2">
                          <div className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">Wallet</div>
                          <div className="font-heading font-bold text-bone">{formatCents(user.wallet_balance)}</div>
                        </div>
                      </div>

                      {/* Qualification */}
                      {user.qualification && (
                        <div className="border border-moss-dark/15 px-3 py-2">
                          <div className="text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Qualification</div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 rounded-full ${user.qualification.saturday_qualified ? 'bg-moss-light' : 'bg-bone-faint'}`} />
                              <span className="text-bone-muted">Sat</span>
                              <span className={user.qualification.saturday_qualified ? 'text-moss-light' : 'text-bone-dark'}>
                                {user.qualification.saturday_qualified ? 'Qual' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 rounded-full ${user.qualification.sunday_qualified ? 'bg-torch-ember' : 'bg-bone-faint'}`} />
                              <span className="text-bone-muted">Sun</span>
                              <span className={user.qualification.sunday_qualified ? 'text-torch-ember' : 'text-bone-dark'}>
                                {user.qualification.sunday_qualified ? 'Qual' : 'No'}
                              </span>
                            </div>
                            <div className="ml-auto text-[9px] text-bone-faint">
                              {user.qualification.total_points} pts · {user.qualification.games_played_count} games
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent plays */}
                      {user.recent_plays.length > 0 && (
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.2em] text-bone-faint mb-1.5">Recent Plays</div>
                          <div className="space-y-1">
                            {user.recent_plays.slice(0, 5).map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs gap-2">
                                <span className="text-bone-muted">{p.play_date}</span>
                                <span className={p.outcome === 'SURVIVE' ? 'text-moss-light' : 'text-death-glow'}>
                                  {p.outcome}
                                </span>
                                <span className="text-bone-dark">{formatCents(p.stake_cents)}</span>
                                <span className="text-bone-faint text-[9px]">streak {p.streak_after}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setAdjustModal({ userId: user.id, guestId: user.guest_id })}
                          className="jungle-button-secondary flex items-center justify-center gap-1.5 text-xs py-2"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Balance
                        </button>
                        <button
                          onClick={() => handleResetStreak(user.id)}
                          disabled={actioning === user.id + '_reset'}
                          className="jungle-button-secondary flex items-center justify-center gap-1.5 text-xs py-2"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${actioning === user.id + '_reset' ? 'animate-spin' : ''}`} />
                          Reset Streak
                        </button>
                        <button
                          onClick={() => setQualModal({ userId: user.id, guestId: user.guest_id })}
                          className="jungle-button-secondary flex items-center justify-center gap-1.5 text-xs py-2"
                        >
                          <Trophy className="h-3.5 w-3.5 text-gold-300" /> Qualification
                        </button>
                        <button
                          onClick={() => handleBan(user.id, user.status !== 'banned')}
                          disabled={actioning === user.id + '_ban'}
                          className={`jungle-button-secondary flex items-center justify-center gap-1.5 text-xs py-2 ${user.status === 'banned' ? 'text-moss-light' : 'text-death-glow'}`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {user.status === 'banned' ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1 || loading}
                className="jungle-button-secondary flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePage(p)}
                      className={`w-7 h-7 text-xs border transition-colors ${
                        p === page
                          ? 'border-torch-ember/60 bg-torch-ember/15 text-torch-ember'
                          : 'border-moss-dark/25 text-bone-dark hover:text-bone hover:border-moss-dark/50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= totalPages || loading}
                className="jungle-button-secondary flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-30"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Adjust Balance Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setAdjustModal(null)}>
          <div className="w-full max-w-sm border border-moss-dark/40 bg-ritual-bg space-y-4 px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="ritual-text text-sm font-bold tracking-[0.1em]">
              Adjust Balance: {adjustModal.guestId.slice(0, 16)}
            </h3>
            <input
              type="number"
              step="0.01"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="Amount in EUR (negative to deduct)"
              className="ritual-input w-full"
              autoFocus
            />
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Reason"
              className="ritual-input w-full"
            />
            <div className="flex gap-2">
              <button onClick={() => setAdjustModal(null)} className="jungle-button-secondary flex-1">Cancel</button>
              <button onClick={handleAdjust} disabled={actioning === 'adjust'} className="jungle-button flex-1">
                {actioning === 'adjust' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Qualification Modal */}
      {qualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setQualModal(null)}>
          <div className="w-full max-w-sm border border-moss-dark/40 bg-ritual-bg space-y-4 px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="ritual-text text-sm font-bold tracking-[0.1em]">
              Qualification: {qualModal.guestId.slice(0, 16)}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Event</label>
                <select
                  value={qualTarget}
                  onChange={(e) => setQualTarget(e.target.value as typeof qualTarget)}
                  className="ritual-input w-full text-xs"
                >
                  <option value="saturday_main_event">Saturday Showdown</option>
                  <option value="sunday_winners_event">Sunday Crown</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">Action</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQualGrant(true)}
                    className={`flex-1 border px-3 py-2 text-xs transition-colors ${qualGrant ? 'border-moss-light/40 bg-moss-dark/30 text-moss-light' : 'border-moss-dark/25 text-bone-dark hover:text-bone-muted'}`}
                  >
                    Grant
                  </button>
                  <button
                    onClick={() => setQualGrant(false)}
                    className={`flex-1 border px-3 py-2 text-xs transition-colors ${!qualGrant ? 'border-death-red/40 bg-death-dim/20 text-death-glow' : 'border-moss-dark/25 text-bone-dark hover:text-bone-muted'}`}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setQualModal(null)} className="jungle-button-secondary flex-1">Cancel</button>
              <button onClick={handleGrantQual} disabled={actioning === 'qual'} className="jungle-button flex-1">
                {actioning === 'qual' ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
