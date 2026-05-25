import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GAME_REGISTRY } from '../lib/gameRegistry';
import type { GameModule } from '../lib/types';

/** DB row shape (subset of GameModule) */
interface DBGame {
  game_id:     string;
  name:        string;
  description: string;
  status:      'active' | 'coming_soon' | 'disabled';
  icon:        string;
  sort_order:  number;
  category?:   string;
  config_json?: Record<string, unknown>;
}

/**
 * Merges DB game rows with the client-side registry.
 * DB is the source of truth for: name, description, status, sort_order.
 * Registry provides: route, icon component, category, color, bgClass.
 * Missing DB fields get sensible defaults.
 */
function mergeGame(db: DBGame): GameModule {
  const def = GAME_REGISTRY[db.game_id];
  const cfg = db.config_json ?? {};
  const cat = (db.category as GameModule['category']) ?? def?.category ?? 'daily';

  return {
    game_id:               db.game_id,
    name:                  db.name,
    short_label:           db.name,
    description:           db.description,
    status:                db.status,
    launch_state:          db.status === 'coming_soon' ? 'coming_soon' : 'live',
    icon:                  db.icon,
    sort_order:            db.sort_order,
    category:              cat,
    play_frequency:        'daily',
    qualification_enabled: cat === 'daily' || cat === 'qualifier',
    visible_from_dow:      0,
    visible_to_dow:        6,
    points_on_play:        Number(cfg.points_on_play ?? 5),
    points_on_win:         Number(cfg.points_on_win  ?? 10),
    config_json:           cfg,
  };
}

export function useGamesCatalog() {
  const [games, setGames] = useState<GameModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryErr } = await supabase
        .from('games')
        .select('game_id, name, description, status, icon, sort_order, category, config_json')
        .order('sort_order');
      if (queryErr) throw new Error(queryErr.message);

      const merged = (data as DBGame[]).map(mergeGame);
      setGames(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  const dailyGames   = games.filter((g) => g.category === 'daily' || g.category === 'qualifier');
  const weekendGames = games.filter((g) => g.category === 'weekend');
  const specialGames = games.filter((g) => g.category === 'special');
  const activeGames  = games.filter((g) => g.status === 'active');
  const getGame      = (gameId: string) => games.find((g) => g.game_id === gameId) ?? null;

  return {
    games,
    dailyGames,
    weekendGames,
    specialGames,
    activeGames,
    loading,
    error,
    fetchGames,
    getGame,
  };
}
