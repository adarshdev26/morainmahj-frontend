import React, { useState } from 'react';
import { me as authMe } from '@/services/authApi';
import { players as playersApi, scoreCards as scoreCardsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import PageHeader from '@/components/shared/PageHeader';
import { Power, RefreshCw, Trash2, FileText, Clock, CheckCircle2 } from 'lucide-react';

const STATUS_CONFIG = {
  setup: { label: 'Setup', color: 'bg-gray-100 text-gray-700' },
  registration_open: { label: 'Registration Open', color: 'bg-blue-100 text-blue-700' },
  registration_closed: { label: 'Registration Closed', color: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-700' },
};

export default function DirectorControl() {
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState('');
  const [roundFilter, setRoundFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [statusToTransition, setStatusToTransition] = useState(null);
  const [resetScoreId, setResetScoreId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => authMe(),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const tournament = tournaments.find(t => t.id === selectedTournament);

  const { data: players = [] } = useQuery({
    queryKey: ['players', selectedTournament],
    queryFn: () => playersApi.filter({ tournament_id: selectedTournament }),
    enabled: !!selectedTournament,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['scorecards', selectedTournament],
    queryFn: () => scoreCardsApi.filter({ tournament_id: selectedTournament }),
    enabled: !!selectedTournament,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', selectedTournament],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: selectedTournament }),
    enabled: !!selectedTournament,
  });

  // Status transition
  const transitionMutation = useMutation({
    mutationFn: (newStatus) => tournamentsApi.update(selectedTournament, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setStatusToTransition(null);
    },
  });

  // Reset scorecard
  const resetScorecardMutation = useMutation({
    mutationFn: (scorecardId) =>
      scoreCardsApi.update(scorecardId, {
        status: 'pending',
        east_verified: false,
        player1_scores: [],
        player2_scores: [],
        player3_scores: [],
        player4_scores: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecards'] });
      setResetScoreId(null);
    },
  });

  // Override scorecard to verified
  const verifyScorecardMutation = useMutation({
    mutationFn: (scorecardId) =>
      scoreCardsApi.update(scorecardId, {
        status: 'verified',
        east_verified: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecards'] });
    },
  });

  // Delete scorecard
  const deleteScorecardMutation = useMutation({
    mutationFn: (scorecardId) => scoreCardsApi.remove(scorecardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecards'] });
    },
  });

  // Admin only check
  if (user && user.role !== 'admin') {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-10 text-center">
          <p className="text-destructive font-semibold">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">Tournament Director controls require admin privileges.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredScorecards =
    scoreFilter === 'all'
      ? scorecards
      : roundFilter === 'all'
      ? scorecards.filter(s => s.status === scoreFilter)
      : scorecards.filter(s => s.round_number === Number(roundFilter) && s.status === scoreFilter);

  const numRounds = tournament?.num_rounds || 4;

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

  const canTransitionTo = (from, to) => {
    const order = ['setup', 'registration_open', 'registration_closed', 'active', 'completed'];
    return order.indexOf(to) > order.indexOf(from);
  };

  return (
    <div>
      <PageHeader
        title="Tournament Director Control"
        subtitle="Manage tournament status, bulk assignments, and scorecard overrides"
      />

      <div className="mb-6">
        <label className="text-sm font-medium">Select Tournament</label>
        <div className="mt-2 max-w-md">
          <ResponsiveSelect
            value={selectedTournament}
            onValueChange={setSelectedTournament}
            placeholder="Choose a tournament…"
            title="Select Tournament"
            options={tournaments.map(t => ({ value: t.id, label: `${t.name} (${t.status})` }))}
          />
        </div>
      </div>

      {!selectedTournament ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a tournament to manage
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="scorecards">Scorecards ({scorecards.length})</TabsTrigger>
          </TabsList>

          {/* Status Management */}
          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-4 w-4" /> Tournament Status
                </CardTitle>
                <CardDescription>Transition tournament through lifecycle stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium">Current Status</p>
                    <Badge className={`mt-1 ${STATUS_CONFIG[tournament?.status]?.color}`}>
                      {STATUS_CONFIG[tournament?.status]?.label}
                    </Badge>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {Object.entries(STATUS_CONFIG).map(([key]) => {
                      const canTransition = canTransitionTo(tournament?.status, key);
                      const isCurrentStatus = key === tournament?.status;
                      return (
                        <Dialog key={key}>
                          <DialogTrigger asChild>
                            <Button
                              variant={isCurrentStatus ? 'outline' : 'ghost'}
                              size="sm"
                              disabled={!canTransition}
                              onClick={() => canTransition && setStatusToTransition(key)}
                            >
                              {STATUS_CONFIG[key].label}
                            </Button>
                          </DialogTrigger>
                          {canTransition && !isCurrentStatus && (
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Transition to {STATUS_CONFIG[key].label}?</DialogTitle>
                                <DialogDescription>
                                  This will update the tournament status. Some operations (like scorecard generation for 'active') will be triggered automatically.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex gap-2 justify-end pt-4">
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  onClick={() => transitionMutation.mutate(key)}
                                  disabled={transitionMutation.isPending}
                                >
                                  {transitionMutation.isPending ? 'Updating...' : 'Confirm'}
                                </Button>
                              </div>
                            </DialogContent>
                          )}
                        </Dialog>
                      );
                    })}
                  </div>
                </div>

                {tournament?.status === 'active' && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4 text-sm text-blue-900">
                      <p className="font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Tournament is active
                      </p>
                      <p className="mt-1 text-xs">
                        Players can verify scores and view standings. Scorecards were auto-generated for all {numRounds} rounds.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            {tournament && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{players.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tables Assigned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{Math.ceil(players.length / 4)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Scorecards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{scorecards.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Verified</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{scorecards.filter(s => s.status === 'verified').length}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Scorecard Management */}
          <TabsContent value="scorecards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Scorecard Overrides
                </CardTitle>
                <CardDescription>Reset, verify, or delete scorecards to fix errors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-48">
                    <label className="text-xs font-medium">Filter by Round</label>
                     <div className="mt-1">
                       <ResponsiveSelect
                         value={roundFilter}
                         onValueChange={setRoundFilter}
                         title="Filter by Round"
                         options={[
                           { value: 'all', label: 'All Rounds' },
                           ...Array.from({ length: numRounds }, (_, i) => ({ value: String(i + 1), label: `Round ${i + 1}` })),
                         ]}
                       />
                     </div>
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="text-xs font-medium">Filter by Status</label>
                     <div className="mt-1">
                       <ResponsiveSelect
                         value={scoreFilter}
                         onValueChange={setScoreFilter}
                         title="Filter by Status"
                         options={[
                           { value: 'all', label: 'All Statuses' },
                           { value: 'pending', label: 'Pending' },
                           { value: 'submitted', label: 'Submitted' },
                           { value: 'verified', label: 'Verified' },
                         ]}
                       />
                     </div>
                  </div>
                </div>

                {filteredScorecards.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No scorecards match filter</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredScorecards.map(sc => (
                      <div
                        key={sc.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            Round {sc.round_number}, Table {sc.table_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getPlayerName(sc.player1_id)} (E) • {getPlayerName(sc.player2_id)} (S) •{' '}
                            {getPlayerName(sc.player3_id)} (W) • {getPlayerName(sc.player4_id)} (N)
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Status: <Badge variant="outline" className="text-[10px]">{sc.status}</Badge>
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {sc.status !== 'verified' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => verifyScorecardMutation.mutate(sc.id)}
                              disabled={verifyScorecardMutation.isPending}
                              title="Force verify this scorecard"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {sc.status !== 'pending' && (
                            <AlertDialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResetScoreId(sc.id)}
                                  title="Reset to pending and clear scores"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </DialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Scorecard?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will clear all scores and set the scorecard back to pending status. The East player will need to re-enter scores.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => resetScorecardMutation.mutate(sc.id)}
                                    disabled={resetScorecardMutation.isPending}
                                  >
                                    {resetScorecardMutation.isPending ? 'Resetting...' : 'Reset'}
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Scorecard?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the scorecard for Round {sc.round_number}, Table {sc.table_number}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex gap-2 justify-end">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteScorecardMutation.mutate(sc.id)}
                                  disabled={deleteScorecardMutation.isPending}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deleteScorecardMutation.isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}