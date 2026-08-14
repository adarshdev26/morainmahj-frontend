import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leagueScoreCards as leagueScoreCardsApi, leagueSessions as leagueSessionsApi, leagues as leaguesApi } from '@/services/resources';

const SEATS = [
  { emailKey: 'east_player_email', scoreKey: 'east_score' },
  { emailKey: 'south_player_email', scoreKey: 'south_score' },
  { emailKey: 'west_player_email', scoreKey: 'west_score' },
  { emailKey: 'north_player_email', scoreKey: 'north_score' },
];

// Fetches the logged-in player's league scorecards (seated by email) and
// derives one row per round, including whether the player won that round.
// Shared by the Hand Tracker tabs and the League Rounds section.
export function useLeagueRounds(email) {
  const qE = useQuery({
    queryKey: ['league-sc-east', email],
    queryFn: () => leagueScoreCardsApi.filter({ east_player_email: email }),
    enabled: !!email,
  });
  const qS = useQuery({
    queryKey: ['league-sc-south', email],
    queryFn: () => leagueScoreCardsApi.filter({ south_player_email: email }),
    enabled: !!email,
  });
  const qW = useQuery({
    queryKey: ['league-sc-west', email],
    queryFn: () => leagueScoreCardsApi.filter({ west_player_email: email }),
    enabled: !!email,
  });
  const qN = useQuery({
    queryKey: ['league-sc-north', email],
    queryFn: () => leagueScoreCardsApi.filter({ north_player_email: email }),
    enabled: !!email,
  });
  const { data: leagues = [] } = useQuery({
    queryKey: ['league-names', email],
    queryFn: () => leaguesApi.list(),
    enabled: !!email,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['league-session-names', email],
    queryFn: () => leagueSessionsApi.list({}, { sort: '-date', limit: 200 }),
    enabled: !!email,
  });

  const isLoading = qE.isLoading || qS.isLoading || qW.isLoading || qN.isLoading;

  const rounds = useMemo(() => {
    const leagueMap = new Map(leagues.map((l) => [l.id, l]));
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const norm = (v) => (v || '').toLowerCase();
    const seen = new Set();
    const rows = [];
    const all = [...(qE.data || []), ...(qS.data || []), ...(qW.data || []), ...(qN.data || [])];
    all.forEach((sc) => {
      if (!sc?.id || seen.has(sc.id)) return;
      seen.add(sc.id);
      const seat = SEATS.find((s) => norm(sc[s.emailKey]) === norm(email));
      if (!seat) return;
      const myScore = Number(sc[seat.scoreKey]) || 0;
      const tableScores = SEATS.map((s) => Number(sc[s.scoreKey])).filter((v) => !isNaN(v));
      const maxScore = tableScores.length ? Math.max(...tableScores) : 0;
      const tiedAtMax = tableScores.filter((v) => v === maxScore).length;
      const wonRound = myScore === maxScore && tiedAtMax === 1 && maxScore !== 0;
      const league = leagueMap.get(sc.league_id);
      const session = sessionMap.get(sc.session_id);
      rows.push({
        id: sc.id,
        leagueName: league?.name || 'League',
        sessionDate: session?.date,
        round: sc.round_number,
        table: sc.table_number,
        score: myScore,
        wonRound,
        created_date: sc.submitted_at || session?.date,
      });
    });
    rows.sort((a, b) => {
      const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
      const db = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
      if (db !== da) return db - da;
      return (b.round || 0) - (a.round || 0);
    });
    return rows;
  }, [qE.data, qS.data, qW.data, qN.data, leagues, sessions, email]);

  return { rounds, isLoading };
}