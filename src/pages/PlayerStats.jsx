import React, { useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  leagueMembers as leagueMembersApi,
  leagueScoreCards as leagueScoreCardsApi,
  leagues as leaguesApi,
  registrations as registrationsApi,
  scoreCards as scoreCardsApi,
  tournaments as tournamentsApi,
} from '@/services/resources';
import { asArray } from '@/lib/ensure-array';
import { useAuth } from '@/lib/AuthContext';
import { Trophy, BarChart2, Target, Calendar, TrendingUp, Award, Star, X } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { format } from 'date-fns';

const PLAYER_ID_KEYS = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
const SCORE_KEYS = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function mergeById(rows) {
  const seen = new Set();
  return (rows || []).filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function statusMeta(status) {
  if (status === 'completed') return { label: 'Completed', className: 'bg-green-100 text-green-700' };
  if (status === 'active') return { label: 'Active', className: 'bg-blue-100 text-blue-700' };
  if (status === 'registration_open') return { label: 'Registration Open', className: 'bg-primary/10 text-primary' };
  if (status === 'registration_closed') return { label: 'Reg Closed', className: 'bg-muted text-muted-foreground' };
  if (status === 'setup') return { label: 'Upcoming', className: 'bg-muted text-muted-foreground' };
  return { label: status || '—', className: 'bg-muted text-muted-foreground' };
}

function playerScoreFromCard(sc, playerId) {
  const idx = PLAYER_ID_KEYS.findIndex((key) => sc[key] === playerId);
  if (idx < 0) return null;
  return sc[SCORE_KEYS[idx]] || [];
}

export default function PlayerStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showTournaments, setShowTournaments] = useState(false);
  const [showLeagues, setShowLeagues] = useState(false);

  const email = user?.email;
  const playerId = user?.id;

  const { data: regsByEmail = [] } = useQuery({
    queryKey: ['stats-registrations-email', email],
    queryFn: () => registrationsApi.filter({ player_email: email }, '-created_date', 500),
    select: asArray,
    enabled: !!email,
  });

  const { data: regsByPlayerId = [] } = useQuery({
    queryKey: ['stats-registrations-pid', playerId],
    queryFn: () => registrationsApi.filter({ player_id: playerId }, '-created_date', 500),
    select: asArray,
    enabled: !!playerId,
  });

  const registrations = useMemo(
    () => mergeById([...regsByEmail, ...regsByPlayerId]),
    [regsByEmail, regsByPlayerId],
  );

  const tournamentIds = useMemo(
    () => [...new Set(registrations.map((r) => r.tournament_id).filter(Boolean))],
    [registrations],
  );

  const { data: tournaments = [] } = useQuery({
    queryKey: ['stats-tournaments-by-ids', tournamentIds.join(',')],
    queryFn: () => tournamentsApi.filter({ id: tournamentIds }, '-date', Math.max(tournamentIds.length, 1)),
    select: asArray,
    enabled: tournamentIds.length > 0,
  });

  const { data: membersByEmail = [] } = useQuery({
    queryKey: ['stats-league-members-email', email],
    queryFn: () => leagueMembersApi.filter({ player_email: email }, undefined, 200),
    select: asArray,
    enabled: !!email,
  });

  const { data: membersByPlayerId = [] } = useQuery({
    queryKey: ['stats-league-members-pid', playerId],
    queryFn: () => leagueMembersApi.filter({ player_id: playerId }, undefined, 200),
    select: asArray,
    enabled: !!playerId,
  });

  const leagueMembers = useMemo(
    () => mergeById([...membersByEmail, ...membersByPlayerId]),
    [membersByEmail, membersByPlayerId],
  );

  const leagueIds = useMemo(
    () => [...new Set(leagueMembers.map((m) => m.league_id).filter(Boolean))],
    [leagueMembers],
  );

  const { data: leagues = [] } = useQuery({
    queryKey: ['stats-leagues-by-ids', leagueIds.join(',')],
    queryFn: () => leaguesApi.filter({ id: leagueIds }, undefined, Math.max(leagueIds.length, 1)),
    select: asArray,
    enabled: leagueIds.length > 0,
  });

  const { data: scorecards1 = [] } = useQuery({
    queryKey: ['stats-scorecards-p1', playerId],
    queryFn: () => scoreCardsApi.filter({ player1_id: playerId }, undefined, 500),
    select: asArray,
    enabled: !!playerId,
  });
  const { data: scorecards2 = [] } = useQuery({
    queryKey: ['stats-scorecards-p2', playerId],
    queryFn: () => scoreCardsApi.filter({ player2_id: playerId }, undefined, 500),
    select: asArray,
    enabled: !!playerId,
  });
  const { data: scorecards3 = [] } = useQuery({
    queryKey: ['stats-scorecards-p3', playerId],
    queryFn: () => scoreCardsApi.filter({ player3_id: playerId }, undefined, 500),
    select: asArray,
    enabled: !!playerId,
  });
  const { data: scorecards4 = [] } = useQuery({
    queryKey: ['stats-scorecards-p4', playerId],
    queryFn: () => scoreCardsApi.filter({ player4_id: playerId }, undefined, 500),
    select: asArray,
    enabled: !!playerId,
  });

  const allScorecards = useMemo(
    () => mergeById([...scorecards1, ...scorecards2, ...scorecards3, ...scorecards4]),
    [scorecards1, scorecards2, scorecards3, scorecards4],
  );

  const { data: leagueScEast = [] } = useQuery({
    queryKey: ['stats-league-sc-east', email],
    queryFn: () => leagueScoreCardsApi.filter({ east_player_email: email }, undefined, 500),
    select: asArray,
    enabled: !!email,
  });
  const { data: leagueScSouth = [] } = useQuery({
    queryKey: ['stats-league-sc-south', email],
    queryFn: () => leagueScoreCardsApi.filter({ south_player_email: email }, undefined, 500),
    select: asArray,
    enabled: !!email,
  });
  const { data: leagueScWest = [] } = useQuery({
    queryKey: ['stats-league-sc-west', email],
    queryFn: () => leagueScoreCardsApi.filter({ west_player_email: email }, undefined, 500),
    select: asArray,
    enabled: !!email,
  });
  const { data: leagueScNorth = [] } = useQuery({
    queryKey: ['stats-league-sc-north', email],
    queryFn: () => leagueScoreCardsApi.filter({ north_player_email: email }, undefined, 500),
    select: asArray,
    enabled: !!email,
  });

  const stats = useMemo(() => {
    const activeRegs = registrations.filter((r) => r.status === 'confirmed' || r.status === 'pending');
    const tournamentMap = new Map(tournaments.map((t) => [t.id, t]));
    const leagueMap = new Map(leagues.map((l) => [l.id, l]));

    let totalScore = 0;
    let totalSets = 0;
    const scoreByTournament = {};

    allScorecards.forEach((sc) => {
      const scores = playerScoreFromCard(sc, playerId);
      if (!scores?.length) return;
      let cardTotal = 0;
      let cardSets = 0;
      scores.forEach((s) => {
        if (s == null || s === '') return;
        const n = Number(s);
        if (Number.isNaN(n)) return;
        cardTotal += n;
        cardSets += 1;
      });
      totalScore += cardTotal;
      totalSets += cardSets;
      if (sc.tournament_id) {
        scoreByTournament[sc.tournament_id] = (scoreByTournament[sc.tournament_id] || 0) + cardTotal;
      }
    });

    const countedLeagueIds = new Set();
    const leagueScoreRows = [
      { rows: leagueScEast, scoreKey: 'east_score' },
      { rows: leagueScSouth, scoreKey: 'south_score' },
      { rows: leagueScWest, scoreKey: 'west_score' },
      { rows: leagueScNorth, scoreKey: 'north_score' },
    ];
    leagueScoreRows.forEach(({ rows, scoreKey }) => {
      rows.forEach((sc) => {
        if (!sc?.id || countedLeagueIds.has(sc.id)) return;
        countedLeagueIds.add(sc.id);
        const score = Number(sc[scoreKey]);
        if (Number.isNaN(score)) return;
        totalScore += score;
        totalSets += 1;
      });
    });

    const history = activeRegs
      .map((reg) => ({
        reg,
        tournament: tournamentMap.get(reg.tournament_id),
        score: scoreByTournament[reg.tournament_id],
      }))
      .filter((row) => row.tournament)
      .sort((a, b) => new Date(b.tournament.date || 0) - new Date(a.tournament.date || 0));

    const userLeagues = leagueMembers
      .map((m) => leagueMap.get(m.league_id))
      .filter(Boolean)
      .filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i);

    const avg = totalSets > 0 ? (totalScore / totalSets).toFixed(1) : '—';

    return {
      registeredCount: activeRegs.length,
      history,
      userLeagues,
      totalScore,
      totalSets,
      avg,
      scoreDisplay: totalSets > 0 ? totalScore : '—',
    };
  }, [
    registrations,
    tournaments,
    leagues,
    leagueMembers,
    allScorecards,
    playerId,
    leagueScEast,
    leagueScSouth,
    leagueScWest,
    leagueScNorth,
  ]);

  const openTournament = (tournamentId) => {
    if (!tournamentId) return;
    if (Capacitor.isNativePlatform()) navigate(`/app/tournament-home/${tournamentId}`);
    else navigate(`/tournament/${tournamentId}`);
  };

  const displayName = user?.full_name || user?.name || user?.email || 'Player';

  return (
    <div className="flex flex-col h-full bg-background native-app-shell" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
      <div
        className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 native-app-header"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 8px)' }}
      >
        <BackButton to="/app" onPrimary />
        <div className="flex items-center gap-2 flex-1">
          <BarChart2 className="w-5 h-5" />
          <h1 className="font-heading font-bold text-xl">My Stats</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 native-app-scroll native-bottom-scroll-pad web-bottom-scroll-pad-sm">
        {user && (
          <p className="text-sm text-muted-foreground px-1">
            Stats for <strong className="text-foreground">{displayName}</strong>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setShowTournaments(true)} className="hover:opacity-80 transition-opacity text-left">
            <StatCard icon={Trophy} label="Tournaments" value={stats.registeredCount} sub="registered" />
          </button>
          <button type="button" onClick={() => setShowLeagues(true)} className="hover:opacity-80 transition-opacity text-left">
            <StatCard icon={Award} label="Leagues" value={stats.userLeagues.length} sub="member" />
          </button>
          <StatCard
            icon={Target}
            label="Total Score"
            value={stats.scoreDisplay}
            sub={`across ${stats.totalSets} sets`}
          />
          <StatCard icon={TrendingUp} label="Avg per Set" value={stats.avg} sub="points per set" />
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-3 mt-2">
            Tournament History
          </p>
          {stats.history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-2xl">
              <Star className="w-10 h-10 text-muted-foreground/20 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No tournaments registered yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Your tournament history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.history.map(({ reg, tournament, score }) => {
                const meta = statusMeta(tournament.status);
                return (
                  <button
                    type="button"
                    key={reg.id}
                    onClick={() => openTournament(tournament.id)}
                    className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{tournament.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {tournament.date ? format(new Date(tournament.date), 'MMM d, yyyy') : '—'}
                          </span>
                          {tournament.location && (
                            <span className="text-xs text-muted-foreground truncate">· {tournament.location}</span>
                          )}
                        </div>
                        {typeof score === 'number' && (
                          <p className="text-xs text-muted-foreground mt-1">Your score: {score}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    {reg.flight && (
                      <p className="text-xs text-muted-foreground mt-2">Flight: {reg.flight}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showTournaments && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="w-full bg-card rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">My Tournaments</h2>
                <button type="button" onClick={() => setShowTournaments(false)} className="p-1" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {stats.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No tournaments found</p>
                ) : (
                  stats.history.map(({ tournament, reg }) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => {
                        openTournament(tournament.id);
                        setShowTournaments(false);
                      }}
                      className="w-full text-left bg-muted hover:bg-muted/80 rounded-lg p-3 transition-colors"
                    >
                      <p className="font-medium text-sm">{tournament.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tournament.date ? format(new Date(tournament.date), 'MMM d, yyyy') : '—'}
                        {tournament.location ? ` • ${tournament.location}` : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showLeagues && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="w-full bg-card rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">My Leagues</h2>
                <button type="button" onClick={() => setShowLeagues(false)} className="p-1" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {stats.userLeagues.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No leagues found</p>
                ) : (
                  stats.userLeagues.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        navigate('/app/leagues');
                        setShowLeagues(false);
                      }}
                      className="w-full text-left bg-muted hover:bg-muted/80 rounded-lg p-3 transition-colors"
                    >
                      <p className="font-medium text-sm">{l.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{l.location || 'No location'}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
