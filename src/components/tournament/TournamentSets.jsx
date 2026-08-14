import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrations as registrationsApi } from '@/services/resources';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PackageCheck, PackageX, Users, CheckCircle2, X, Shuffle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TournamentSets({ tournamentId, tournament }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [randomizing, setRandomizing] = useState(false);

  const { data: registrations = [] } = useQuery({
    queryKey: ['tournament-registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const tableAssignMutation = useMutation({
    mutationFn: ({ id, set_table_number }) =>
      registrationsApi.update(id, { set_table_number: set_table_number ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
      setSelectedVolunteer(null);
    },
  });

  const needed = tournament?.sets_needed || 6;
  const confirmed = registrations.filter(r => r.status === 'confirmed');
  const volunteers = confirmed.filter(r => r.bringing_set);
  const stillNeeded = Math.max(0, needed - volunteers.length);

  // Map table number -> volunteer registration
  const tableMap = {};
  volunteers.forEach(r => {
    if (r.set_table_number) tableMap[r.set_table_number] = r;
  });

  const unassigned = volunteers.filter(r => !r.set_table_number);
  const assignedCount = volunteers.filter(r => r.set_table_number).length;

  const handleTableClick = (tableNum) => {
    const occupant = tableMap[tableNum];

    if (selectedVolunteer) {
      // If clicking same table that already has this volunteer, unassign
      if (occupant?.id === selectedVolunteer) {
        tableAssignMutation.mutate({ id: selectedVolunteer, set_table_number: null });
        return;
      }
      // If table is occupied by someone else, move them out first then assign
      if (occupant) {
        tableAssignMutation.mutate({ id: occupant.id, set_table_number: null });
      }
      tableAssignMutation.mutate({ id: selectedVolunteer, set_table_number: tableNum });
    } else if (occupant) {
      // Select the occupant for re-assignment
      setSelectedVolunteer(occupant.id);
    }
  };

  const handleRandomize = async () => {
    setRandomizing(true);
    try {
      // Shuffle volunteers and assign them to tables 1..needed sequentially
      const shuffled = [...volunteers].sort(() => Math.random() - 0.5);
      const tableNums = Array.from({ length: needed }, (_, i) => i + 1);

      // Clear all assignments first, then reassign
      await Promise.all(volunteers.map(v =>
        registrationsApi.update(v.id, { set_table_number: null })
      ));
      await Promise.all(shuffled.map((v, idx) => {
        if (idx < tableNums.length) {
          return registrationsApi.update(v.id, { set_table_number: tableNums[idx] });
        }
        return Promise.resolve();
      }));

      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', tournamentId] });
      toast({ title: 'Tables randomized!', description: `${Math.min(shuffled.length, needed)} volunteers assigned to tables.` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setRandomizing(false);
    }
  };

  const handleUnassign = (regId) => {
    tableAssignMutation.mutate({ id: regId, set_table_number: null });
    if (selectedVolunteer === regId) setSelectedVolunteer(null);
  };

  if (!tournament?.sets_needed_enabled) {
    return (
      <div className="text-center py-12 text-slate-400">
        <PackageX className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Game set tracking is not enabled for this tournament.</p>
        <p className="text-xs mt-1">Enable it in the tournament edit settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
          <p className="text-2xl font-bold text-white">{needed}</p>
          <p className="text-xs text-slate-400 mt-1">Tables Needed</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
          <p className="text-2xl font-bold text-emerald-400">{volunteers.length}</p>
          <p className="text-xs text-slate-400 mt-1">Volunteers</p>
        </div>
        <div className={`rounded-lg p-4 text-center border ${stillNeeded > 0 ? 'bg-amber-900/30 border-amber-700' : 'bg-emerald-900/30 border-emerald-700'}`}>
          <p className={`text-2xl font-bold ${stillNeeded > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stillNeeded > 0 ? stillNeeded : '✓'}
          </p>
          <p className={`text-xs mt-1 ${stillNeeded > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {stillNeeded > 0 ? 'Still Needed' : 'All Covered!'}
          </p>
        </div>
      </div>

      {/* Instruction banner */}
      {selectedVolunteer ? (
        <div className="flex items-center justify-between bg-emerald-900/40 border border-emerald-600 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-300 font-medium">
              Assigning: <span className="font-bold text-white">{volunteers.find(v => v.id === selectedVolunteer)?.player_name}</span>
            </span>
            <span className="text-xs text-emerald-400">— click a table to assign</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelectedVolunteer(null)} className="text-slate-400 hover:text-white h-7">
            Cancel
          </Button>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-400">
            <span className="text-slate-300 font-medium">How to assign:</span> Click a volunteer below, then click a table to assign them. Click an occupied table to select that volunteer for reassignment.
          </p>
        </div>
      )}

      {/* Table Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-300">Table Assignments</p>
          {volunteers.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRandomize}
              disabled={randomizing}
              className="gap-2 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Shuffle className="h-3.5 w-3.5" />
              {randomizing ? 'Randomizing...' : 'Randomize'}
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-600">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-200 uppercase tracking-wider w-20">Table</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-200 uppercase tracking-wider">Volunteer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-200 uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {Array.from({ length: needed }, (_, i) => i + 1).map(tableNum => {
                const occupant = tableMap[tableNum];
                const isBeingAssigned = !!selectedVolunteer && !occupant;
                const isSelected = occupant && occupant.id === selectedVolunteer;

                return (
                  <tr
                    key={tableNum}
                    onClick={() => handleTableClick(tableNum)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-800/60'
                        : occupant
                        ? 'bg-emerald-950/60 hover:bg-emerald-900/40'
                        : isBeingAssigned
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/30'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{tableNum}</span>
                    </td>
                    <td className="px-4 py-3">
                      {occupant ? (
                        <span className="font-medium text-white">{occupant.player_name}</span>
                      ) : isBeingAssigned ? (
                        <span className="text-emerald-300 text-xs font-medium">← Click to assign here</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {occupant && <span className="text-slate-300 text-xs">{occupant.player_email}</span>}
                      {occupant?.set_notified && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline ml-2" title="Notified" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {occupant && (
                        <button
                          onClick={e => { e.stopPropagation(); handleUnassign(occupant.id); }}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Volunteers list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-300">
            Volunteers ({volunteers.length})
          </p>
          <span className="text-xs text-slate-500">— {assignedCount} assigned, {volunteers.length - assignedCount} unassigned</span>
        </div>

        {volunteers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No volunteers yet.</p>
        ) : (
          <div className="space-y-2">
            {volunteers.map(reg => {
              const isActive = selectedVolunteer === reg.id;
              return (
                <div
                  key={reg.id}
                  onClick={() => setSelectedVolunteer(isActive ? null : reg.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-emerald-900/40 border-emerald-500 shadow-md'
                      : reg.set_table_number
                      ? 'bg-slate-800 border-slate-600 opacity-60'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PackageCheck className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : reg.set_table_number ? 'text-slate-500' : 'text-emerald-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{reg.player_name}</p>
                      <p className="text-xs text-slate-400">{reg.player_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {reg.set_table_number ? (
                      <Badge className="bg-emerald-800 text-emerald-300 border-emerald-600">Table {reg.set_table_number}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-400 border-amber-600">Unassigned</Badge>
                    )}
                    {reg.set_notified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" title="Notified" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}