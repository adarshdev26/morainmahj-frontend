import { useQuery } from '@tanstack/react-query';
import { callAction } from '@/services/actions';
import { buildPlayerNameMap } from '@/lib/tournament-leaderboard';
import { FRESH_REGISTRATION_QUERY } from '@/lib/tournament-registration';

/**
 * Fetches the full confirmed player directory for a tournament (names for tablemates).
 * Backed by getTournamentPlayerNames (service role) to bypass Registration RLS limits.
 */
export function useTournamentPlayers(tournamentId, { enabled = true } = {}) {
  const query = useQuery({
    queryKey: ['tournament-players', tournamentId],
    queryFn: async () => {
      const res = await callAction('getTournamentPlayerNames', {
        tournament_id: tournamentId,
      });
      return res?.players ?? [];
    },
    enabled: !!tournamentId && enabled,
    ...FRESH_REGISTRATION_QUERY,
  });

  const nameMap = buildPlayerNameMap(query.data ?? []);

  return {
    ...query,
    players: query.data ?? [],
    nameMap,
  };
}
