import React, { useState } from 'react';
import { matchResults as matchResultsApi, registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ClipboardList, Trophy, Lock, Layers, Gavel } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import ScoreTable from '@/components/scores/ScoreTable';
import CheckInGate from '@/components/shared/CheckInGate';
import HandLogComposer from '@/components/hand-logging/HandLogComposer';
import MatchSubmission from '@/components/match-approval/MatchSubmission';
import MatchApprovalQueue from '@/components/match-approval/MatchApprovalQueue';
import { findPlayerRegistration } from '@/lib/tournament-registration';

export default function ScoreEntry() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [activeRound, setActiveRound] = useState('1');
  const [handLogOpen, setHandLogOpen] = useState(false);
  const [matchSubmitOpen, setMatchSubmitOpen] = useState(false);

  // Use the active tournament automatically
  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-all'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  // Show scorecards for active, registration_closed, or completed tournaments
  // (tables may be assigned before the tournament goes active)
  const activeTournament = tournaments.find(t => t.status === 'active')
    || tournaments.find(t => t.status === 'registration_closed')
    || tournaments.find(t => t.status === 'completed');
  // Can only edit scores when tournament is active (not completed)
  const canEditScores = activeTournament?.status === 'active';

  // Fetch registrations for player name lookup
  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', activeTournament?.id],
    queryFn: () => registrationsApi.filter({ tournament_id: activeTournament.id }),
    enabled: !!activeTournament,
  });

  // Find the current user's registration to check check-in status
  const myReg = findPlayerRegistration(registrations, user);
  const isCheckedIn = myReg?.checked_in === true;

  // Build a players-like array from registrations for ScoreTable compatibility
  const players = registrations.map(r => ({ id: r.player_id, name: r.player_name || r.player_email }));

  const { data: scorecards = [] } = useQuery({
    queryKey: ['scorecards-entry', activeTournament?.id],
    queryFn: () => scoreCardsApi.filter({ tournament_id: activeTournament.id }),
    enabled: !!activeTournament,
  });

  const approvalEnabled = activeTournament?.approval_workflow_enabled === true;

  const { data: matchResultsForMe = [] } = useQuery({
    queryKey: ['match-results-for-entry', activeTournament?.id],
    queryFn: () => matchResultsApi.filter({ tournament_id: activeTournament.id }, '-submitted_at', 200),
    enabled: !!activeTournament && approvalEnabled,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => scoreCardsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scorecards-entry'] }),
  });

  const numRounds = activeTournament?.num_rounds || 4;

  // Only show scorecards where this player is seated
  const roundCards = scorecards
    .filter(s =>
      s.round_number === Number(activeRound) &&
      (s.player1_id === userId || s.player2_id === userId || s.player3_id === userId || s.player4_id === userId)
    )
    .sort((a, b) => a.table_number - b.table_number);

  const myTableCard = roundCards[0];
  const isEast = myTableCard?.player1_id === userId;
  const tablePlayers = myTableCard
    ? [myTableCard.player1_id, myTableCard.player2_id, myTableCard.player3_id, myTableCard.player4_id]
        .filter(Boolean)
        .map((pid) => ({ id: pid, name: players.find((p) => p.id === pid)?.name || 'Unknown' }))
    : [];
  const existingResult = matchResultsForMe.find(
    (r) => r.round_number === Number(activeRound) && r.table_number === myTableCard?.table_number
  );

  if (!activeTournament) {
    return (
      <div>
        <PageHeader title="Score Entry" subtitle="Enter and verify scores for your table" />
        <Card className="border-dashed mt-6">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No tournament with scorecards right now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Score Entry"
        subtitle={activeTournament.name}
      />

      {!isCheckedIn ? (
        <CheckInGate tournamentName={activeTournament.name} />
      ) : (
      <>
      {approvalEnabled && (
        <div className="mb-4">
          <MatchApprovalQueue tournamentId={activeTournament.id} />
        </div>
      )}
      <div className="flex justify-end mb-4 gap-2">
        {approvalEnabled && isEast && (
          <Button onClick={() => setMatchSubmitOpen(true)} className="gap-2">
            <Gavel className="h-4 w-4" /> Submit Match Result
          </Button>
        )}
        <Button
          onClick={() => setHandLogOpen(true)}
          variant={approvalEnabled && isEast ? 'outline' : 'default'}
          className="gap-2"
        >
          <Layers className="h-4 w-4" /> Log Hand Details
        </Button>
      </div>
      <Tabs value={activeRound} onValueChange={setActiveRound} className="mb-6">
        <TabsList>
          {Array.from({ length: numRounds }, (_, i) => (
            <TabsTrigger key={i + 1} value={String(i + 1)}>Round {i + 1}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {roundCards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No scorecard assigned for Round {activeRound}.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTournament?.status === 'completed' && (
            <Card className="bg-amber-50 border-amber-200 mb-4">
              <CardContent className="flex items-center gap-3 py-4">
                <Lock className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-800 font-medium">
                  This tournament has ended. Score entry is locked.
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {roundCards.map(sc => (
              <ScoreTable
                key={sc.id}
                scorecard={sc}
                players={players}
                canEdit={canEditScores}
                tournamentStatus={activeTournament?.status || 'setup'}
                onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              />
            ))}
          </div>
        </>
      )}
      </>
      )}

      {approvalEnabled && myTableCard && (
        <MatchSubmission
          open={matchSubmitOpen}
          onClose={() => setMatchSubmitOpen(false)}
          context={{
            tournament_id: activeTournament.id,
            round_number: Number(activeRound),
            table_number: myTableCard.table_number,
            players: tablePlayers,
            card_year: new Date().getFullYear(),
            organization_id: activeTournament.organization_id,
          }}
          existingResult={existingResult || null}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['match-results-for-entry'] })}
        />
      )}

      <HandLogComposer
        open={handLogOpen}
        onClose={() => setHandLogOpen(false)}
        context={{
          tournament_id: activeTournament?.id,
          tournament_name: activeTournament?.name,
          card_year: new Date().getFullYear(),
          round: Number(activeRound),
          organization_id: activeTournament?.organization_id,
        }}
      />
    </div>
  );
}