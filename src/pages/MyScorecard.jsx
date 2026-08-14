import React, { useState, useEffect, useMemo } from 'react';
import { registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTournamentPlayers } from '@/lib/useTournamentPlayers';
import { getPlayerDisplayName } from '@/lib/tournament-leaderboard';
import { FRESH_REGISTRATION_QUERY, findPlayerRegistration } from '@/lib/tournament-registration';
import CheckInGate from '@/components/shared/CheckInGate';
import { isCapacitorNative } from '@/lib/capacitor-utils';

import { ClipboardList, ShieldCheck, Send, Clock, Trophy, CheckCircle2, ChevronLeft } from 'lucide-react';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { TournamentTimerBanner } from '@/components/timer/LiveTimerBanner';
import { usePlayerAlerts } from '@/hooks/usePlayerAlerts';
import { haptics } from '@/lib/haptics';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East: 'bg-red-100 text-red-700 border-red-200',
  South: 'bg-blue-100 text-blue-700 border-blue-200',
  West: 'bg-green-100 text-green-700 border-green-200',
  North: 'bg-amber-100 text-amber-700 border-amber-200',
};
const WIND_ABBR = { East: 'E', South: 'S', West: 'W', North: 'N' };

function PlayerScoreCard({ scorecard, nameMap, currentUserId, onUpdate }) {
  const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
  const playerScoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

  const getPlayerName = (id) => getPlayerDisplayName(nameMap, id);

  const myWindIdx = playerIdKeys.findIndex(k => scorecard[k] === currentUserId);
  const isEast = myWindIdx === 0;

  const setSubmittedAt = scorecard.set_submitted_at && scorecard.set_submitted_at.length === 4
    ? scorecard.set_submitted_at
    : [null, null, null, null];
  const setVerifiedAt = (scorecard.set_verified_at && scorecard.set_verified_at.length === 4
    ? scorecard.set_verified_at
    : [null, null, null, null]
  ).map(ts => (ts === '' ? null : ts));
  const isLocked = scorecard.status === 'verified';
  const allSetsSubmitted = setSubmittedAt.every(ts => !!ts);
  const allSetsVerified = setVerifiedAt.every(ts => !!ts);

  const handleVerifySet = (setIdx) => {
    haptics.medium();
    const newSetVerifiedAt = [...setVerifiedAt].map(ts => ts && ts !== '' ? ts : '');
    newSetVerifiedAt[setIdx] = new Date().toISOString();
    const allVerified = newSetVerifiedAt.every(ts => ts !== '');
    const update = { set_verified_at: newSetVerifiedAt };
    if (allVerified) {
      update.status = 'verified';
      update.east_verified = true;
      update.verified_at = new Date().toISOString();
    } else {
      update.status = 'submitted';
      if (!scorecard.submitted_at) update.submitted_at = new Date().toISOString();
    }
    onUpdate(scorecard.id, update);
  };

  const handleUnverifySet = (setIdx) => {
    haptics.medium();
    const newSetVerifiedAt = [...setVerifiedAt].map(ts => ts && ts !== '' ? ts : '');
    newSetVerifiedAt[setIdx] = '';
    const anyVerified = newSetVerifiedAt.some(ts => ts !== '');
    const update = { set_verified_at: newSetVerifiedAt };
    if (!anyVerified) {
      update.status = 'submitted';
      update.east_verified = false;
      update.verified_at = null;
    } else {
      update.status = 'submitted';
      update.east_verified = false;
    }
    onUpdate(scorecard.id, update);
  };

  const handleVerifyAll = () => {
    haptics.success();
    const now = new Date().toISOString();
    const newSetVerifiedAt = setVerifiedAt.map(ts => ts && ts !== '' ? ts : now);
    onUpdate(scorecard.id, {
      status: 'verified',
      east_verified: true,
      verified_at: now,
      set_verified_at: newSetVerifiedAt,
      submitted_at: scorecard.submitted_at || now,
    });
  };

  // Show all 4 hands, but indicate which have scores
  const allHands = [0, 1, 2, 3];

  // Check if any hand has scores (for verify button)
  const anyHandHasScores = allHands.some(setIdx =>
    playerScoreKeys.some(k => {
      const v = scorecard[k]?.[setIdx];
      return v !== null && v !== undefined;
    })
  );

  return (
    <div className="space-y-3">
      {allHands.map(setIdx => {
        const isSetVerified = !!setVerifiedAt[setIdx];
        const isSetSubmitted = !!setSubmittedAt[setIdx];
        const hasScores = playerScoreKeys.some(k => {
          const v = scorecard[k]?.[setIdx];
          return v !== null && v !== undefined;
        });

        return (
          <div key={setIdx} className={`rounded-2xl border-2 p-4 ${
            isSetVerified ? 'border-green-300 bg-green-50/60 dark:bg-green-950/20' :
            isSetSubmitted ? 'border-primary bg-amber-50/40 dark:bg-amber-950/20' :
            'border-border bg-card'
          }`}>
            {/* Hand header */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">Hand {setIdx + 1}</span>
              {isSetVerified ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              ) : isSetSubmitted ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <Send className="h-3 w-3" /> Awaiting East
                </span>
              ) : null}
            </div>

            {/* Player rows */}
            <div className="space-y-2">
              {playerIdKeys.map((idKey, pIdx) => {
                const wind = WINDS[pIdx];
                const playerId = scorecard[idKey];
                const playerName = getPlayerName(playerId);
                const isMe = playerId === currentUserId;
                const val = scorecard[playerScoreKeys[pIdx]]?.[setIdx];
                const hasValue = val !== null && val !== undefined;

                return (
                  <div key={pIdx} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? 'bg-primary/10' : 'bg-muted/40'}`}>
                    <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded border ${WIND_COLORS[wind]}`}>
                      {wind[0]}
                    </span>
                    <span className={`flex-1 text-sm ${isMe ? 'font-bold text-primary' : 'text-foreground'}`}>
                      {playerName}{isMe ? ' (you)' : ''}
                    </span>
                    <span className={`text-base font-bold font-heading min-w-[3rem] text-right ${
                      !hasValue ? 'text-muted-foreground/30' :
                      val < 0 ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {hasValue ? ((val > 0 ? '+' : '') + val) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* East verify/unverify buttons */}
            {isEast && hasScores && !isSetVerified && !isLocked && (
              <button
                onClick={() => handleVerifySet(setIdx)}
                className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <ShieldCheck className="h-4 w-4" /> Verify Hand {setIdx + 1}
              </button>
            )}
            {isEast && isSetVerified && !isLocked && (
              <button
                onClick={() => handleUnverifySet(setIdx)}
                className="mt-3 w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm flex items-center justify-center gap-2 border border-border active:scale-[0.98] transition-transform"
              >
                <Send className="h-4 w-4 rotate-180" /> Unverify Hand {setIdx + 1}
              </button>
            )}
          </div>
        );
      })}

      {/* East: verify all scores button */}
      {isEast && anyHandHasScores && !isLocked && allSetsSubmitted && (
        <button
          onClick={handleVerifyAll}
          className="w-full py-3 rounded-2xl bg-green-600 text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-green-700"
        >
          <ShieldCheck className="h-5 w-5" />
          Verify Round
        </button>
      )}

      {isLocked && (
        <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium py-3 bg-primary/5 rounded-2xl border border-primary/20">
          <CheckCircle2 className="h-5 w-5" /> All scores verified
        </div>
      )}
    </div>
  );
}

export default function MyScorecard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeRound, setActiveRound] = useState('1');

  const tournamentIdFromUrl = searchParams.get('tournamentId');

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const activeTournament = useMemo(() => {
    if (tournamentIdFromUrl) {
      return tournaments.find(t => t.id === tournamentIdFromUrl) ?? null;
    }
    return null;
  }, [tournamentIdFromUrl, tournaments]);

  const { nameMap } = useTournamentPlayers(activeTournament?.id, {
    enabled: !!activeTournament?.id && !!user,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['my-scorecards', activeTournament?.id],
    queryFn: () => scoreCardsApi.filter({ tournament_id: activeTournament.id }),
    enabled: !!activeTournament?.id,
    refetchInterval: 15000,
    ...FRESH_REGISTRATION_QUERY,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['my-scorecard-registrations', activeTournament?.id],
    queryFn: () => registrationsApi.filter({ tournament_id: activeTournament.id }),
    enabled: !!activeTournament?.id,
    ...FRESH_REGISTRATION_QUERY,
  });

  const myReg = findPlayerRegistration(registrations, user);
  const isCheckedIn = myReg?.checked_in;

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('Updating scorecard', id, data);
      const result = await scoreCardsApi.update(id, data);
      console.log('Update result', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Update successful', data);
    },
    onError: (error) => {
      console.error('Update failed', error);
      alert('Failed to update: ' + (error.message || 'Unknown error'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['my-scorecards'] }),
  });

  const numRounds = activeTournament?.num_rounds || 4;

  // Find scorecards for this user across rounds
  const userId = user?.id;

  // Real-time alerts: table changes + timer pauses
  usePlayerAlerts({ tournamentId: activeTournament?.id ?? null, userId: userId ?? null });
  const myScorecardForRound = scorecards.find(
    sc =>
      sc.round_number === Number(activeRound) &&
      (sc.player1_id === userId ||
        sc.player2_id === userId ||
        sc.player3_id === userId ||
        sc.player4_id === userId)
  );

  // Auto-select current round based on where there's a pending/submitted scorecard
  useEffect(() => {
    if (scorecards.length === 0 || !userId) return;
    const myCards = scorecards.filter(
      sc =>
        sc.player1_id === userId ||
        sc.player2_id === userId ||
        sc.player3_id === userId ||
        sc.player4_id === userId
    );
    // Find first non-verified round
    const pending = myCards.find(sc => sc.status !== 'verified');
    if (pending) setActiveRound(String(pending.round_number));
  }, [scorecards.length, userId]);

  if (!tournamentIdFromUrl || !activeTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Trophy className="h-14 w-14 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-heading font-semibold mb-2">No Tournament Selected</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Open scores from a tournament dashboard to view your scorecard.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="text-sm text-primary font-medium"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!myScorecardForRound && scorecards.length > 0) {
    const hasAnyCard = scorecards.some(
      sc =>
        sc.player1_id === userId ||
        sc.player2_id === userId ||
        sc.player3_id === userId ||
        sc.player4_id === userId
    );
    if (!hasAnyCard) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <ClipboardList className="h-14 w-14 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-heading font-semibold mb-2">No scorecard assigned</h2>
          <p className="text-muted-foreground text-sm">Your scorecard hasn't been set up yet. Please check with the tournament director.</p>
        </div>
      );
    }
  }

  // Compute my overall total across all verified rounds
  const myAllCards = scorecards.filter(
    sc =>
      sc.player1_id === userId ||
      sc.player2_id === userId ||
      sc.player3_id === userId ||
      sc.player4_id === userId
  );
  const myOverallTotal = myAllCards.reduce((sum, sc) => {
    const idx = ['player1_id','player2_id','player3_id','player4_id'].findIndex(k => sc[k] === userId);
    const scoreKey = ['player1_scores','player2_scores','player3_scores','player4_scores'][idx];
    const roundTotal = (sc[scoreKey] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    return sum + roundTotal;
  }, 0);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-scorecards', activeTournament?.id] }),
      queryClient.invalidateQueries({ queryKey: ['tournament-players', activeTournament?.id] }),
    ]);
  };

  const isNative = isCapacitorNative();

  const headerBlock = (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(`/app/tournament-home/${activeTournament.id}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tournament
        </button>
      </div>

      <TournamentTimerBanner tournamentId={activeTournament.id} />

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-heading font-bold">{activeTournament.name}</h1>
        {isCheckedIn && myOverallTotal !== 0 && (
          <span className={`text-lg font-bold font-heading shrink-0 ml-2 ${myOverallTotal < 0 ? 'text-destructive' : 'text-primary'}`}>
            {user?.full_name?.split(' ')[0] || 'Player'}: {myOverallTotal}
          </span>
        )}
      </div>

      {isCheckedIn && (
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {Array.from({ length: numRounds }, (_, i) => {
          const rNum = i + 1;
          const roundCard = scorecards.find(
            sc => sc.round_number === rNum &&
              (sc.player1_id === userId || sc.player2_id === userId ||
               sc.player3_id === userId || sc.player4_id === userId)
          );
          const isActive = activeRound === String(rNum);
          return (
            <button
              key={rNum}
              onClick={() => setActiveRound(String(rNum))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              Round {rNum}
              {roundCard?.status === 'verified' && <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>
      )}
    </>
  );

  const scorecardBody = !isCheckedIn ? (
    <CheckInGate tournamentName={activeTournament.name} />
  ) : !myScorecardForRound ? (
    <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
      No scorecard for Round {activeRound} yet
    </div>
  ) : (
    <PlayerScoreCard
      key={myScorecardForRound.id}
      scorecard={myScorecardForRound}
      nameMap={nameMap}
      currentUserId={userId}
      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
    />
  );

  if (isNative) {
    return (
      <div className="h-full flex flex-col native-app-shell" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
        <div className="native-app-header shrink-0 px-4 pt-4 pb-3 bg-background border-b border-border">
          {headerBlock}
        </div>
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 min-h-0">
          <div className="px-4 py-4 native-bottom-scroll-pad">
            {scorecardBody}
          </div>
        </PullToRefresh>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-2xl mx-auto pb-8" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
      {headerBlock}
      {scorecardBody}
    </div>
    </PullToRefresh>
  );
}