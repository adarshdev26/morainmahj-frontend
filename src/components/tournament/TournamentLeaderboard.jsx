import React from 'react';
import { registrations as registrationsApi, scoreCards as scoreCardsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';

export default function TournamentLeaderboard({ tournamentId, tournament }) {
  const { data: scorecards = [] } = useQuery({
    queryKey: ['tournament-scorecards-lb', tournamentId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['tournament-registrations-lb', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  // Build player list from registrations, shaped like Player records (id + name)
  const playerIdsInTournament = new Set(
    scorecards.flatMap(s => [s.player1_id, s.player2_id, s.player3_id, s.player4_id].filter(Boolean))
  );
  const players = registrations
    .filter(r => playerIdsInTournament.has(r.player_id))
    .map(r => ({ id: r.player_id, name: r.player_name, flight: r.flight || '' }));

  return (
    <LeaderboardTable
      tournament={tournament}
      players={players}
      scorecards={scorecards}
    />
  );
}