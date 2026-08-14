import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { me as authMe } from '@/services/authApi';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, CalendarDays, Dice5, Gift } from 'lucide-react';
import RoomMapPlayerView from '@/components/roommap/RoomMapPlayerView';
import RaffleTicketPurchase from '@/components/raffle/RaffleTicketPurchase';
import SilentAuctionBidPanel from '@/components/auction/SilentAuctionBidPanel';

const WIND_COLORS = {
  East:  'bg-red-100 text-red-700 border-red-200',
  South: 'bg-blue-100 text-blue-700 border-blue-200',
  West:  'bg-green-100 text-green-700 border-green-200',
  North: 'bg-amber-100 text-amber-700 border-amber-200',
};

const WIND_TEXT = {
  East:  'text-red-700',
  South: 'text-blue-700',
  West:  'text-green-700',
  North: 'text-amber-700',
};

export default function TournamentOverview() {
  const navigate = useNavigate();
  const params = useParams();
  const tournamentId = params.tournamentId || new URLSearchParams(window.location.search).get('tournamentId');
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch user
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await authMe();
      setCurrentUser(user);
      return user;
    },
  });

  // Fetch specific tournament by ID, or fall back to first registered one
  const [fallbackTournamentId, setFallbackTournamentId] = useState(null);

  useQuery({
    queryKey: ['userTournamentsOverview'],
    queryFn: async () => {
      const user = await authMe();
      const regs = await registrationsApi.filter({ player_id: user.id });
      const firstId = regs[0]?.tournament_id;
      if (firstId) setFallbackTournamentId(firstId);
      return regs;
    },
    enabled: !tournamentId,
  });

  const resolvedTournamentId = tournamentId || fallbackTournamentId;

  const { data: currentTournamentData } = useQuery({
    queryKey: ['tournamentOverview', resolvedTournamentId],
    queryFn: () => tournamentsApi.filter({ id: resolvedTournamentId }).then(r => r[0] || null),
    enabled: !!resolvedTournamentId,
  });

  const currentTournament = currentTournamentData;

  // Fetch registration, table assignments, and sets
  const { data: registration } = useQuery({
    queryKey: ['registration', currentTournament?.id],
    queryFn: () => currentTournament ? registrationsApi.filter({ tournament_id: currentTournament.id }) : Promise.resolve([]),
    enabled: !!currentTournament,
  });

  const { data: tableAssignments } = useQuery({
    queryKey: ['tableAssignments', currentTournament?.id],
    queryFn: () => currentTournament ? tableAssignmentsApi.filter({ tournament_id: currentTournament.id }) : Promise.resolve([]),
    enabled: !!currentTournament,
  });

  const { data: sets } = useQuery({
    queryKey: ['sets', currentTournament?.id],
    queryFn: () => currentTournament ? registrationsApi.filter({ tournament_id: currentTournament.id, bringing_borrowed_set: true }) : Promise.resolve([]),
    enabled: !!currentTournament,
  });

  if (!currentTournament) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No active tournament</p>
          <Button onClick={() => navigate('/app/my-tournaments')}>View My Tournaments</Button>
        </div>
      </div>
    );
  }

  const userReg = registration?.[0];
  const userAssignments = tableAssignments?.filter(a => 
    a.player1_id === userReg?.player_id || 
    a.player2_id === userReg?.player_id || 
    a.player3_id === userReg?.player_id || 
    a.player4_id === userReg?.player_id
  ) || [];

  const getWindForUser = (assignment) => {
    if (assignment.player1_id === userReg?.player_id) return 'East';
    if (assignment.player2_id === userReg?.player_id) return 'South';
    if (assignment.player3_id === userReg?.player_id) return 'West';
    if (assignment.player4_id === userReg?.player_id) return 'North';
    return null;
  };

  const setVolunteers = sets?.filter(s => s.borrowed_set_table_number) || [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-heading text-foreground">{currentTournament.name}</h1>
            <p className="text-sm text-muted-foreground">Tournament Overview</p>
          </div>
        </div>

        {/* Tournament Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tournament Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(currentTournament.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{currentTournament.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Dice5 className="h-4 w-4 text-muted-foreground" />
              <span>{currentTournament.num_rounds} rounds</span>
            </div>
            {userReg?.bringing_borrowed_set && (
              <div className="flex items-center gap-3 text-sm p-3 bg-secondary/30 rounded-lg border border-secondary">
                <Gift className="h-4 w-4 text-secondary-foreground" />
                <div>
                  <p className="font-medium">You're donating a set</p>
                  <p className="text-xs text-muted-foreground">Table {userReg.borrowed_set_table_number}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Round Assignments */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Your Round Assignments</h2>
          <div className="space-y-3">
            {userAssignments.map((assignment) => {
              const wind = getWindForUser(assignment);
              return (
                <Card key={assignment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Round {assignment.round_number}</p>
                        <p className="text-lg font-semibold text-foreground">Table {assignment.table_number}</p>
                      </div>
                      <Badge className={WIND_COLORS[wind]}>
                        <span className={`text-sm font-bold ${WIND_TEXT[wind]}`}>{wind}</span>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Set Donations */}
        {setVolunteers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Set Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {setVolunteers.map((volunteer) => (
                  <div key={volunteer.id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-secondary">
                    <span className="text-sm font-medium">{volunteer.player_name}</span>
                    <Badge variant="outline">Table {volunteer.set_table_number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Room Map */}
        {currentTournament && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <RoomMapPlayerView
                tournamentId={currentTournament.id}
                roundAssignments={userAssignments.map(a => ({
                  round: a.round_number,
                  table: a.table_number,
                  wind: getWindForUser(a),
                }))}
              />
            </CardContent>
          </Card>
        )}

        {/* Raffle Tickets */}
        {currentUser && (
          <div className="mb-6">
            <RaffleTicketPurchase tournamentId={currentTournament.id} user={currentUser} />
          </div>
        )}

        {/* Silent Auctions */}
        {currentUser && (
          <div className="mb-6">
            <SilentAuctionBidPanel tournamentId={currentTournament.id} user={currentUser} />
          </div>
        )}

        {/* Quick Links */}
        <div className="flex gap-2 mt-8 flex-wrap">
          <Button className="flex-1" onClick={() => navigate('/app/scores')}>
            Enter Scores
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/app/leaderboard')}>
            View Standings
          </Button>
        </div>
      </div>
    </div>
  );
}