import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';
import RoundTimerControl from '@/components/tournament/RoundTimerControl';
import ScoreVerificationLog from '@/components/tournament/ScoreVerificationLog';

export default function TournamentTiming() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.list().then(ts => ts.find(t => t.id === id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/tournament/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-500" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-800">Timing & Log</h1>
            {tournament && <p className="text-slate-500 text-sm">{tournament.name}</p>}
          </div>
        </div>
      </div>

      <RoundTimerControl tournamentId={id} numRounds={tournament?.num_rounds || 4} />
      <ScoreVerificationLog tournamentId={id} />
    </div>
  );
}