import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { registrations as registrationsApi, scoreCards as scoreCardsApi, tableAssignments as tableAssignmentsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { findPlayerRegistration, fetchTournamentById, FRESH_REGISTRATION_QUERY } from '@/lib/tournament-registration';
import { navigateBackFromTournament } from '@/lib/discover-navigation';
import { isEventLive } from '@/lib/tournament-status';
import { useTournamentPlayers } from '@/lib/useTournamentPlayers';
import {
  computeTournamentRankings,
  getPlayerRank,
  getPlayerDisplayName,
} from '@/lib/tournament-leaderboard';
import { ChevronLeft, ClipboardList, Map, Ticket, Trophy, Grid3X3, Users, Share2 } from 'lucide-react';
import EventShareSheet from '@/components/shared/EventShareSheet';
import CheckInButton from '@/components/tournament/CheckInButton';
import RaffleTicketPurchase from '@/components/raffle/RaffleTicketPurchase';
import AuctionCardGate from '@/components/auction/AuctionCardGate';
import SilentAuctionBidPanel from '@/components/auction/SilentAuctionBidPanel';
import DemoTRaffle from '@/components/raffle/DemoTRaffle';
import DemoFiftyFifty from '@/components/raffle/DemoFiftyFifty';
import DemoSilentAuction from '@/components/auction/DemoSilentAuction';
import QuickScoreEntry from '@/components/scorecard/QuickScoreEntry';
import RoomMapPlayerView from '@/components/roommap/RoomMapPlayerView';
import CheckInGate from '@/components/shared/CheckInGate';
import TournamentStandings from '@/components/leaderboard/TournamentStandings';
import { TournamentTimerBanner } from '@/components/timer/LiveTimerBanner';

const WIND_COLORS = {
  East:  { bg: 'bg-red-500',   text: 'text-white', light: 'bg-red-50 text-red-700 border-red-200' },
  South: { bg: 'bg-blue-500',  text: 'text-white', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  West:  { bg: 'bg-green-500', text: 'text-white', light: 'bg-green-50 text-green-700 border-green-200' },
  North: { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// Tab definitions
const TABS = [
  { id: 'home',       label: 'Home',      icon: Trophy },
  { id: 'scorecard',  label: 'Scores', icon: ClipboardList },
  { id: 'seating',    label: 'Seating',   icon: Grid3X3 },
  { id: 'map',        label: 'Room Map',  icon: Map },
  { id: 'raffle',     label: 'Raffle',    icon: Ticket },
];

export default function TournamentHome() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showQuickScore, setShowQuickScore] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const prefetchedTournament =
    location.state?.tournament?.id === tournamentId ? location.state.tournament : undefined;

  const {
    data: tournament,
    isPending: tournamentPending,
    isError: tournamentError,
  } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => fetchTournamentById(tournamentId),
    enabled: !!tournamentId,
    initialData: prefetchedTournament,
    staleTime: 60_000,
  });

  const isActiveTournament = tournament?.status === 'active';

  const { data: registrations = [] } = useQuery({
    queryKey: ['t-registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: isActiveTournament ? 20000 : false,
    ...FRESH_REGISTRATION_QUERY,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['t-assignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: isActiveTournament ? 20000 : false,
    ...FRESH_REGISTRATION_QUERY,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['t-scorecards', tournamentId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: isActiveTournament ? 15000 : false,
    ...FRESH_REGISTRATION_QUERY,
  });

  const userId = user?.id;
  const myReg = findPlayerRegistration(registrations, user);
  const isCheckedIn = myReg?.checked_in === true;
  const { nameMap } = useTournamentPlayers(tournamentId, { enabled: !!tournamentId && !!user });

  const { rankings } = useMemo(
    () => computeTournamentRankings(scorecards, nameMap),
    [scorecards, nameMap],
  );
  const myRank = getPlayerRank(rankings, userId);
  const totalPlayers = rankings.length;

  const myAssignments = assignments.filter(a =>
    a.player1_id === userId || a.player2_id === userId ||
    a.player3_id === userId || a.player4_id === userId
  );

  const getWind = (a) => {
    if (a.player1_id === userId) return 'East';
    if (a.player2_id === userId) return 'South';
    if (a.player3_id === userId) return 'West';
    return 'North';
  };

  const myCards = scorecards.filter(sc =>
    sc.player1_id === userId || sc.player2_id === userId ||
    sc.player3_id === userId || sc.player4_id === userId
  );

  const myTotal = myCards.reduce((sum, sc) => {
    const idx = ['player1_id','player2_id','player3_id','player4_id'].findIndex(k => sc[k] === userId);
    const key = ['player1_scores','player2_scores','player3_scores','player4_scores'][idx];
    return sum + (sc[key] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  }, 0);

  // Find current round (first non-verified)
  const currentRound = myCards.find(sc => sc.status !== 'verified') || myCards[myCards.length - 1];
  const currentAssignment = currentRound
    ? assignments.find(a => a.round_number === currentRound.round_number &&
        (a.player1_id === userId || a.player2_id === userId ||
         a.player3_id === userId || a.player4_id === userId))
    : myAssignments[0];

  const currentWind = currentAssignment ? getWind(currentAssignment) : null;
  const windStyle = currentWind ? WIND_COLORS[currentWind] : null;

  if (tournamentPending && !tournament) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <p className="text-muted-foreground">
          {tournamentError ? 'Could not load this tournament.' : 'Tournament not found.'}
        </p>
        <Button variant="outline" onClick={() => navigateBackFromTournament(navigate)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background native-app-shell" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
      {showShare && tournament && (
        <EventShareSheet
          contextType="tournament"
          contextId={tournamentId}
          contextName={tournament.name}
          onClose={() => setShowShare(false)}
        />
      )}
      {showQuickScore && currentRound && (
        <QuickScoreEntry
          scorecard={currentRound}
          userId={userId}
          tournamentId={tournamentId}
          onClose={() => setShowQuickScore(false)}
          onSaved={() => setShowQuickScore(false)}
        />
      )}
      {/* Top Header */}
      <div
        className="bg-primary text-primary-foreground px-4 pb-3 shrink-0 native-app-header"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigateBackFromTournament(navigate)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-primary-foreground/60 text-xs">Tournament</p>
            <h1 className="font-heading font-bold text-lg leading-tight truncate">{tournament.name}</h1>
          </div>
          {tournament.player_sharing_enabled !== false && (
            <button
              onClick={() => setShowShare(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform"
              title="Invite a friend"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {isEventLive(tournament, myReg) && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-green-500 text-white px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>
        <TournamentTimerBanner tournamentId={tournamentId} />
      </div>

      {/* Tab Bar */}
      <div className="bg-card border-b border-border overflow-x-auto shrink-0 native-app-subheader">
        <div className="flex min-w-max px-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => tab.id === 'scorecard' ? navigate(`/app/scorecard?tournamentId=${tournamentId}`) : setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto native-app-scroll native-bottom-scroll-pad">

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-4 pb-8">
            {/* Registration CTA for invited (pending) players */}
            {myReg && myReg.status === 'pending' && (
              <button
                onClick={() => navigate(`/player-signup?tournament_id=${tournamentId}&from=app`)}
                className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-4 flex flex-col items-center text-center mb-3 shadow-md active:scale-[0.98] transition-all w-full"
              >
                <Users className="w-8 h-8 mb-2" />
                <span className="font-bold text-base">Complete Your Registration</span>
                <span className="text-xs opacity-80 mt-0.5">You've been invited — secure your spot!</span>
              </button>
            )}

            {/* Check-in button — hidden for completed tournaments, shows live or upcoming variants for confirmed players */}
            <CheckInButton tournament={tournament} registration={myReg} />


            {/* Top Row: Enter Scores + Seating */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => isCheckedIn ? (currentRound ? setShowQuickScore(true) : setActiveTab('scorecard')) : null}
                disabled={!isCheckedIn}
                className={`rounded-2xl p-4 flex flex-col items-start transition-transform ${isCheckedIn ? 'bg-primary text-primary-foreground active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
              >
                <ClipboardList className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Enter Scores</span>
                <span className="text-xs opacity-70">{isCheckedIn ? 'Submit your scorecard' : 'Check in first'}</span>
              </button>
              <button
                onClick={() => isCheckedIn && setActiveTab('seating')}
                disabled={!isCheckedIn}
                className={`rounded-2xl p-4 flex flex-col items-start transition-transform ${isCheckedIn ? 'bg-card border border-border active:scale-[0.98]' : 'bg-muted border-border cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Grid3X3 className={`w-6 h-6 ${isCheckedIn ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-semibold text-sm">Seating</span>
                </div>
                <div className="space-y-0.5">
                  {!isCheckedIn ? (
                    <span className="text-xs text-muted-foreground">Check in to view</span>
                  ) : myAssignments.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No assignments yet</span>
                  ) : (
                    Array.from({ length: tournament?.num_rounds || 4 }, (_, i) => {
                      const a = myAssignments.find(x => x.round_number === i + 1);
                      if (!a) return null;
                      const wind = getWind(a);
                      return (
                        <p key={i} className="text-xs text-primary font-medium">
                          R{i + 1} · T{a.table_number} · {wind.charAt(0)}
                        </p>
                      );
                    })
                  )}
                </div>
              </button>
            </div>

            {/* Second Row: Score + Rank */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Your Score</span>
                </div>
                <span className={`text-4xl font-heading font-bold ${myTotal < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {myTotal}
                </span>
                <span className="text-xs text-muted-foreground mt-1">tournament total</span>
              </div>
              <button 
                onClick={() => navigate(`/app/leaderboard?from=tournament&tournamentId=${tournamentId}`)}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Your Rank</span>
                </div>
                <span className="text-4xl font-heading font-bold text-foreground">
                  {myRank > 0 ? `#${myRank}` : '—'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {totalPlayers > 0 ? `of ${totalPlayers} players` : 'field'}
                </span>
              </button>
            </div>

            {/* Third Row: Room Map + Raffle + Loaned Set (if applicable) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => isCheckedIn && setActiveTab('map')}
                disabled={!isCheckedIn}
                className={`rounded-2xl p-4 flex flex-col items-start transition-transform ${isCheckedIn ? 'bg-card border border-border active:scale-[0.98]' : 'bg-muted border-border cursor-not-allowed'}`}
              >
                <Map className={`w-6 h-6 mb-2 ${isCheckedIn ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-sm">Room Map</span>
                <span className="text-xs text-muted-foreground">{isCheckedIn ? 'Find your table' : 'Check in to view'}</span>
              </button>
              <button
                onClick={() => setActiveTab('raffle')}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col items-start active:scale-[0.98] transition-transform"
              >
                <Ticket className="w-6 h-6 mb-2 text-primary" />
                <span className="font-semibold text-sm">Raffle / Auction</span>
                <span className="text-xs text-muted-foreground">Buy tickets & bid</span>
              </button>
              {myReg?.bringing_borrowed_set && (
                <div className="bg-card border border-amber-500/30 rounded-2xl p-4 flex flex-col col-span-2">
                  <span className="text-xs text-amber-700 mb-1">Loaned Set</span>
                  <span className="text-4xl font-heading font-bold text-amber-600">
                    {myReg.borrowed_set_table_number}
                  </span>
                  <span className="text-xs text-amber-600 mt-1">table assigned</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEATING / STANDINGS TAB */}
        {activeTab === 'seating' && (
          <div className="p-4 space-y-4">
            {!isCheckedIn ? (
              <CheckInGate tournamentName={tournament.name} />
            ) : (
            <>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Tournament
              </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Your Seating by Round</h3>
              <button
                onClick={() => setActiveTab('map')}
                className="text-xs text-primary font-medium active:scale-[0.98] transition-transform"
              >
                View Room Map →
              </button>
            </div>

            {myAssignments.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
                {tournament?.status === 'active' ? 'No seating assigned yet' : 'Seating assigned at check in'}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: tournament?.num_rounds || 4 }, (_, i) => {
                  const a = myAssignments.find(x => x.round_number === i + 1);
                  return a ? { round: i + 1, assignment: a } : null;
                })
                  .filter(Boolean)
                  .map(({ assignment: a }) => {
                    const wind = getWind(a);
                    const ws = WIND_COLORS[wind];
                    const players = [
                      { id: a.player1_id, pos: 'East' },
                      { id: a.player2_id, pos: 'South' },
                      { id: a.player3_id, pos: 'West' },
                      { id: a.player4_id, pos: 'North' },
                    ];
                    return (
                      <div key={a.id} className="bg-card border border-border rounded-2xl p-4">
                        <p className="text-sm font-bold mb-3">Round {a.round_number} • Table {a.table_number}</p>
                        <div className="space-y-2">
                          {players.map(p => {
                            const reg = registrations.find(r => r.player_id === p.id);
                            const isMe = p.id === userId;
                            const displayName = getPlayerDisplayName(nameMap, p.id, reg?.player_name || 'Unknown');
                            return (
                              <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg ${isMe ? 'bg-primary/10' : 'bg-muted/30'}`}>
                                <div className="flex-1">
                                  <p className={`text-xs font-medium ${isMe ? 'text-primary font-bold' : ''}`}>
                                    {displayName}{isMe && ' (you)'}
                                  </p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${WIND_COLORS[p.pos].light}`}>
                                  {p.pos}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            </>
            )}
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div className="p-4">
            {!isCheckedIn ? (
              <CheckInGate tournamentName={tournament.name} />
            ) : (
            <RoomMapPlayerView
              tournamentId={tournamentId}
              onBackToTournament={() => setActiveTab('home')}
              roundAssignments={myAssignments.map(a => ({
                round: a.round_number,
                table: a.table_number,
                wind: getWind(a),
              }))}
            />
            )}
          </div>
        )}

        {/* RAFFLE / AUCTION TAB */}
        {activeTab === 'raffle' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Tournament
              </button>
            </div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>🎟️</span> Raffle & Auction
            </h3>
            <DemoFiftyFifty tournamentId={tournamentId} user={user} />
            <DemoTRaffle tournamentId={tournamentId} user={user} />
            <DemoSilentAuction tournamentId={tournamentId} user={user} />
          </div>
        )}
      </div>
    </div>
  );
}