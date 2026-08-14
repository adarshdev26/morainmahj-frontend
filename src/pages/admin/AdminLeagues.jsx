import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { leagues as leaguesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Users, MapPin, Trophy, Pause, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const statusColors = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  ended: 'bg-slate-100 text-slate-500',
};

export default function AdminLeagues() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { orgFilter } = useOrganization();

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => leaguesApi.filter(orgFilter(), '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => leaguesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leagues'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => callAction('deleteLeagueCascade', { league_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast({ title: 'League deleted.' });
    },
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading leagues…</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900">Leagues</h1>
            <p className="text-sm text-slate-500 mt-1">Manage recurring league groups and sessions</p>
          </div>
          <Button onClick={() => navigate('/admin/leagues/new')} className="gap-2">
            <Plus className="h-4 w-4" /> New League
          </Button>
        </div>

        {leagues.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No leagues yet</p>
            <p className="text-sm mt-1">Create your first league to get started</p>
          </div>
        )}

        <div className="grid gap-4">
          {leagues.map(league => (
            <Card key={league.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/leagues/${league.id}`)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-semibold text-slate-800">{league.name}</h2>
                      <Badge className={statusColors[league.status] || ''}>{league.status}</Badge>
                      {league.scoring_enabled && <Badge variant="outline" className="gap-1"><Trophy className="h-3 w-3" /> Scored</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                      {league.day_of_week != null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {DAY_NAMES[league.day_of_week]}s {league.start_time && `· ${league.start_time}`}{league.end_time && `–${league.end_time}`}
                        </span>
                      )}
                      {league.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {league.location}
                        </span>
                      )}
                      {league.player_cap && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Cap: {league.player_cap}
                        </span>
                      )}
                    </div>
                    {league.description && <p className="text-sm text-slate-400 mt-1 line-clamp-1">{league.description}</p>}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => updateMutation.mutate({ id: league.id, data: { status: league.status === 'active' ? 'paused' : 'active' } })}
                    >
                      {league.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm" variant="destructive"
                      onClick={() => { if (confirm('Delete this league?')) deleteMutation.mutate(league.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}