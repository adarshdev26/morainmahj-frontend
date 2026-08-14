import React, { useMemo } from 'react';
import { me as authMe } from '@/services/authApi';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Gift } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';

const WIND_COLORS = {
  East:  { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  South: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  West:  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  North: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
};

const WIND_DISPLAY = ['East', 'South', 'West', 'North'];

export default function RoundAssignments() {
  const { tournamentId } = useParams();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authMe(),
  });

  const { data: registration } = useQuery({
    queryKey: ['registration', tournamentId, user?.id],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId, player_id: user?.id }),
    enabled: !!user?.id && !!tournamentId,
  });

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.filter({ id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: tableAssignments } = useQuery({
    queryKey: ['tableAssignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const reg = registration?.[0];
  const tourn = tournament?.[0];

  const roundData = useMemo(() => {
    if (!tableAssignments || !user) return [];

    return tableAssignments
      .filter(ta => [ta.player1_id, ta.player2_id, ta.player3_id, ta.player4_id].includes(user.id))
      .sort((a, b) => a.round_number - b.round_number)
      .map(ta => {
        const windIdx = [ta.player1_id, ta.player2_id, ta.player3_id, ta.player4_id].indexOf(user.id);
        const wind = WIND_DISPLAY[windIdx];
        return {
          round: ta.round_number,
          table: ta.table_number,
          wind,
          windStyle: WIND_COLORS[wind],
        };
      });
  }, [tableAssignments, user]);

  if (!user || !tourn) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <BackButton to="/app/my-tournaments" />
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground tracking-tight">
            {tourn.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-body">Your Round Assignments</p>
        </div>
      </div>

      {/* Set volunteering info */}
      {reg?.bringing_set && reg?.set_table_number && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <Gift className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">You volunteered a game set</p>
              <p className="text-sm text-amber-800 mt-0.5">
                Please bring your set to <strong>Table {reg.set_table_number}</strong> before Round 1
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rounds */}
      <div className="space-y-4">
        {roundData.map(round => (
          <Card key={round.round}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Round {round.round}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-semibold">Table {round.table}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Badge className={`${round.windStyle.bg} ${round.windStyle.text} border ${round.windStyle.border}`}>
                  {round.wind} Position
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roundData.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-muted-foreground">No assignments yet. Check back after check-in.</p>
        </Card>
      )}
    </div>
  );
}