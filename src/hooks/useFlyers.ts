import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { PromotionalAsset, WinnerAnnouncement } from '../lib/types';

export function useFlyers() {
  const [assets, setAssets] = useState<PromotionalAsset[]>([]);
  const [winners, setWinners] = useState<WinnerAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: promos }, { data: wins }] = await Promise.all([
        supabase.from('promotional_assets').select('*').eq('active', true).order('sort_order'),
        supabase.from('winner_announcements').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      setAssets((promos || []) as PromotionalAsset[]);
      setWinners((wins || []) as WinnerAnnouncement[]);
    } finally {
      setLoading(false);
    }
  }, []);

  const banners = assets.filter((a) => a.asset_type === 'event_banner');
  const flyers = assets.filter((a) => a.asset_type === 'flyer');
  const winnerCards = assets.filter((a) => a.asset_type === 'winner_card');

  return { assets, banners, flyers, winnerCards, winners, loading, fetchAssets };
}
