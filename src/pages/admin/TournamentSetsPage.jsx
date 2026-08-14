import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tournaments as tournamentsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TournamentSets from '@/components/tournament/TournamentSets';
import PermanentEast from '@/components/tournament/PermanentEast';

export default function TournamentSetsPage() {
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
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/tournament/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Manage Sets</h1>
          <p className="text-slate-500 text-sm mt-1">{tournament?.name}</p>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        <TournamentSets tournamentId={id} tournament={tournament} />
        <PermanentEast tournamentId={id} tournament={tournament} />
      </div>
    </div>
  );
}