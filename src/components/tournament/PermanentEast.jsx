import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertCircle, Shuffle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PermanentEast({ tournamentId, tournament }) {
  const queryClient = useQueryClient();
  const [adminAssignments, setAdminAssignments] = useState({});

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
  });

  const { data: tableAssignments = [] } = useQuery({
    queryKey: ['tableAssignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: (payload) => registrationsApi.update(payload.id, payload.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations', tournamentId] }),
  });

  const permanentEastVolunteers = useMemo(() => {
    return registrations.filter(r => r.permanent_east);
  }, [registrations]);

  const assignedTables = useMemo(() => {
    return registrations
      .filter(r => r.permanent_east_table_number !== null && r.permanent_east_table_number !== undefined)
      .map(r => r.permanent_east_table_number);
  }, [registrations]);

  const needsNeeded = tournament?.permanent_east_needed || 0;
  const volunteersCount = permanentEastVolunteers.length;
  const shortfall = Math.max(0, needsNeeded - volunteersCount);

  const handleRandomize = async () => {
    if (volunteersCount === 0) {
      toast.error('No volunteers available');
      return;
    }

    try {
      const shuffled = [...permanentEastVolunteers].sort(() => Math.random() - 0.5).slice(0, needsNeeded);
      const updates = shuffled.map((volunteer, idx) => ({
        id: volunteer.id,
        data: { permanent_east_table_number: idx + 1 },
      }));

      for (const update of updates) {
        await updateRegistrationMutation.mutateAsync(update);
      }

      toast.success(`Assigned ${shuffled.length} permanent East players`);
    } catch (error) {
      toast.error(`Error assigning: ${error.message}`);
    }
  };

  const handleAdminAssign = async (volunteer) => {
    const tableNumber = adminAssignments[volunteer.id];
    if (!tableNumber) {
      toast.error('Enter a table number');
      return;
    }

    try {
      await updateRegistrationMutation.mutateAsync({
        id: volunteer.id,
        data: { permanent_east_table_number: parseInt(tableNumber) },
      });
      setAdminAssignments(prev => {
        const updated = { ...prev };
        delete updated[volunteer.id];
        return updated;
      });
      toast.success(`${volunteer.player_name} assigned to table ${tableNumber}`);
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleRemoveAssignment = async (volunteerId) => {
    try {
      await updateRegistrationMutation.mutateAsync({
        id: volunteerId,
        data: { permanent_east_table_number: null },
      });
      toast.success('Assignment removed');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  if (!tournament?.permanent_east_enabled) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">Permanent East is not enabled for this tournament.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Permanent East Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">Needed</p>
              <p className="text-2xl font-bold text-slate-800">{needsNeeded}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Volunteers</p>
              <p className="text-2xl font-bold text-slate-800">{volunteersCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Shortfall</p>
              <p className={`text-2xl font-bold ${shortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {shortfall > 0 ? `+${shortfall}` : '✓'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-assign */}
      {volunteersCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Auto-Assign</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Randomly assign volunteers to available table positions (1 through {needsNeeded}).
            </p>
            <Button onClick={handleRandomize} className="gap-2">
              <Shuffle className="h-4 w-4" />
              Randomize Assignments
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Volunteers List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Volunteers & Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {permanentEastVolunteers.length === 0 ? (
            <p className="text-sm text-slate-600">No volunteers yet.</p>
          ) : (
            <div className="space-y-3">
              {permanentEastVolunteers.map(volunteer => (
                <div key={volunteer.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{volunteer.player_name}</p>
                    <p className="text-xs text-slate-500">{volunteer.player_email}</p>
                  </div>

                  {volunteer.permanent_east_table_number !== null && volunteer.permanent_east_table_number !== undefined ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">
                        Table {volunteer.permanent_east_table_number}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(volunteer.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : shortfall > 0 ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max={needsNeeded}
                        placeholder="Table #"
                        value={adminAssignments[volunteer.id] || ''}
                        onChange={e => setAdminAssignments(prev => ({ ...prev, [volunteer.id]: e.target.value }))}
                        className="w-20 h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdminAssign(volunteer)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Assign
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-slate-600">Unassigned</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-xs text-blue-800">
            Permanent East players stay at the same table for all rounds. Once assigned, they won't move between table assignments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}