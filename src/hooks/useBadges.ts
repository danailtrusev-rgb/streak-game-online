import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserBadge, BadgeKey } from '../lib/types';

export function useBadges() {
  const [badges, setBadges]   = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_badges');
      if (!error && data) {
        setBadges(data as UserBadge[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const isUnlocked = useCallback(
    (key: BadgeKey) => badges.some((b) => b.badge_key === key),
    [badges],
  );

  const getUnlockedAt = useCallback(
    (key: BadgeKey) => badges.find((b) => b.badge_key === key)?.unlocked_at ?? null,
    [badges],
  );

  return { badges, loading, fetchBadges, isUnlocked, getUnlockedAt };
}
