import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribe } from '@/services/realtime';
import { leagueRoundTimers as leagueRoundTimersApi } from '@/services/resources';
import { RELATED_ROW_LIMIT } from '@/lib/query-limits';

/**
 * useLeagueTimers — optimized timer data hook.
 *
 * Replaces the old 5-second blind polling with:
 *  1. Realtime entity subscription (instant push updates when any timer changes)
 *  2. A 30-second backup poll, ONLY when at least one timer is actively "running"
 *     — idle sessions produce zero network traffic.
 *
 * @param {string[]} sessionIds — LeagueSession IDs to watch
 * @param {boolean} isAdmin — only admins need timer data
 * @returns {{ data: array, refetch: function }}
 */
export function useLeagueTimers(sessionIds, isAdmin) {
  const queryClient = useQueryClient();
  const key = sessionIds.join(',');
  const queryKey = ['league-timers-detail', key];

  const { data: leagueTimers = [], refetch } = useQuery({
    queryKey,
    queryFn: () =>
      leagueRoundTimersApi.filter(
        { session_id: sessionIds },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    enabled: isAdmin && sessionIds.length > 0,
    // No fixed refetchInterval — subscriptions + conditional backup poll handle freshness.
  });

  // ── 1. Realtime subscription: instant invalidation on any timer change ──
  useEffect(() => {
    if (!isAdmin || sessionIds.length === 0) return;

    let unsubscribe = null;
    try {
      unsubscribe = subscribe((event) => {
        // Only refetch if the event belongs to one of our sessions
        const sid = event?.data?.session_id;
        if (!sid || sessionIds.includes(sid)) {
          queryClient.invalidateQueries({ queryKey });
        }
      });
    } catch {
      // subscription unavailable — backup poll below still covers us
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch {}
      }
    };
  }, [isAdmin, key]);

  // ── 2. Backup poll: 30s ONLY when a timer is actively running ──
  const hasRunningTimer = leagueTimers.some(t => t.status === 'running');

  useEffect(() => {
    if (!isAdmin || !hasRunningTimer) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey });
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, hasRunningTimer]);

  return { data: leagueTimers, refetch };
}