import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { players as playersApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Trophy, CalendarDays, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useOrganization } from '@/hooks/useOrganization';

const statusColors = {
  setup: 'bg-slate-100 text-slate-600',
  registration_open: 'bg-blue-100 text-blue-700',
  registration_closed: 'bg-orange-100 text-orange-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-amber-100 text-amber-700',
};

const rulesLabel = {
  nmjl: 'Strict NMJL',
  nmjl_tl: 'NMJL + Local',
  nmjl_custom: 'Other/Custom',
};



export default function AdminTournaments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgFilter } = useOrganization();

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => tournamentsApi.filter(orgFilter(), '-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => playersApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tournamentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Tournaments</h1>
          <p className="text-slate-500 text-sm mt-1">Create, edit, and manage all tournaments</p>
        </div>
        <Button onClick={() => navigate('/admin/tournament/new/setup')} className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2">
          <Plus className="h-4 w-4" /> New Tournament
        </Button>
      </div>

      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Rounds</TableHead>
                  <TableHead>Flights</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
                )}
                {!isLoading && tournaments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">No tournaments yet. Create one to get started.</p>
                    </TableCell>
                  </TableRow>
                )}
                {tournaments.map(t => (
                   <TableRow key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/tournament/${t.id}`)}>
                     <TableCell className="font-semibold text-slate-700">{t.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {t.date ? (
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(t.date), 'MMM d, yyyy')}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {t.location ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.location}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[t.status] || statusColors.setup}>{t.status || 'setup'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.rules_variant === 'nmjl' ? 'default' : 'outline'} className="text-xs">
                        {rulesLabel[t.rules_variant] || 'Custom Rules'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{t.num_rounds || 4}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(t.flights || []).map(f => (
                          <Badge key={f} variant="outline" className="text-[10px] py-0">{f}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{players.filter(p => p.tournament_id === t.id).length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); navigate(`/admin/tournament/${t.id}/setup`); }}>
                           <Pencil className="h-3.5 w-3.5" />
                         </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                          if (confirm(`Delete "${t.name}"? This cannot be undone.`)) deleteMutation.mutate(t.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}