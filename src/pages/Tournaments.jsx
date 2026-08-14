import React, { useState } from 'react';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { navigateToTournamentCard, isTournamentRegistrationOpen } from '@/lib/tournament-registration';
import { asArray } from '@/lib/ensure-array';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Compass } from 'lucide-react';
import { format } from 'date-fns';
import BackButton from '@/components/shared/BackButton';
import DemoTournamentCard from '@/components/DemoTournamentCard';
import CheckInButton from '@/components/tournament/CheckInButton';

export default function Tournaments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tournaments = [] } = useQuery({
    queryKey: ['all-tournaments-open'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: regsByEmail = [] } = useQuery({
    queryKey: ['regs-by-email', user?.email],
    queryFn: () => registrationsApi.filter({ player_email: user.email }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.email,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: regsByPlayerId = [] } = useQuery({
    queryKey: ['regs-by-pid', user?.id],
    queryFn: () => registrationsApi.filter({ player_id: user.id }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const myRegistrations = React.useMemo(() => {
    const seen = new Set();
    return [...regsByEmail, ...regsByPlayerId].filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [regsByEmail, regsByPlayerId]);
  const [demoHidden, setDemoHidden] = useState(false);
  const showDemo = React.useMemo(() => {
    if (demoHidden) return false;
    if (localStorage.getItem('demo_completed') === 'true') return false;
    const realConfirmedCount = myRegistrations.filter(r => r.status === 'confirmed' && !r.is_demo).length;
    return realConfirmedCount < 1;
  }, [myRegistrations, demoHidden]);

  const regByTournamentId = React.useMemo(() => {
    const map = {};
    for (const r of myRegistrations) map[r.tournament_id] = r;
    return map;
  }, [myRegistrations]);

  const openTournaments = tournaments
    .filter(isTournamentRegistrationOpen)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['all-tournaments-open'] }),
      queryClient.invalidateQueries({ queryKey: ['regs-by-email'] }),
      queryClient.invalidateQueries({ queryKey: ['regs-by-pid'] }),
    ]);
  };

  if (!user) return null;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="pb-24 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton to="/app" />
        <div>
          <h2 className="text-2xl font-heading font-bold">Tournaments</h2>
          <p className="text-sm text-muted-foreground">Browse and register for open tournaments</p>
        </div>
      </div>

      {showDemo && (
        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Get Started</p>
          <DemoTournamentCard onComplete={() => setDemoHidden(true)} />
        </div>
      )}

      {openTournaments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Compass className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No open tournaments available right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {openTournaments.map(t => (
            <Card key={t.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateToTournamentCard(navigate, t, regByTournamentId[t.id], '/app/tournaments')}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <CardDescription className="flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.date}</span>
                      {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />Open
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                )}

                {t.registration_close_date && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Registration closes: {format(new Date(t.registration_close_date), 'MMM d, yyyy h:mm a')}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToTournamentCard(navigate, t, regByTournamentId[t.id], '/app/tournaments');
                    }}
                    className="flex-1 min-w-[140px]"
                  >
                    View Details
                  </Button>
                  <CheckInButton tournament={t} registration={regByTournamentId[t.id]} variant="card" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}