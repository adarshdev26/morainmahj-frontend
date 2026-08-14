import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  players as playersApi,
  registrations as registrationsApi,
  tableAssignments,
  tournaments,
} from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Pencil, Trophy, CalendarDays, MapPin, Users, UserPlus, UserCheck, X, Map, Printer, Sparkles, Gavel } from 'lucide-react';
import PlayerSharingToggle from '@/components/shared/PlayerSharingToggle';
import ShareInviteStats from '@/components/shared/ShareInviteStats';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RoundAssignments from '@/components/tournament/RoundAssignments';
import TournamentCheckIn from '@/components/tournament/TournamentCheckIn';
import TournamentScoreCards from '@/components/tournament/TournamentScoreCards';
import TournamentLeaderboard from '@/components/tournament/TournamentLeaderboard';
import TournamentSets from '@/components/tournament/TournamentSets';
import TournamentBroadcast from '@/components/tournament/TournamentBroadcast';
import RoundTimerControl from '@/components/tournament/RoundTimerControl';
import ScoreVerificationLog from '@/components/tournament/ScoreVerificationLog';
import QRCodeDisplay from '@/components/checkin/QRCodeDisplay';
import RoomMapEditor from '@/components/roommap/RoomMapEditor';
import CommunityFeed from '@/components/community/CommunityFeed';
import CommunityRulesAdmin from '@/components/community/CommunityRulesAdmin';
import PlayerPrintSheet from '@/components/print/PlayerPrintSheet';
import NameTagsPrint from '@/components/print/NameTagsPrint';
import BrotherLabelPrint from '@/components/print/BrotherLabelPrint';
import RaffleAdmin from '@/components/raffle/RaffleAdmin';
import TournamentWebsiteTab from '@/components/tournament-website/TournamentWebsiteTab';

const statusColors = {
  setup: 'bg-slate-100 text-slate-600',
  registration_open: 'bg-blue-100 text-blue-700',
  registration_closed: 'bg-orange-100 text-orange-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-amber-100 text-amber-700',
};

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeRound, setActiveRound] = useState('1');
  const [activeTab, setActiveTab] = useState('assignments');
  const [showBroadcast, setShowBroadcast] = useState(false);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournaments.get(id),
    enabled: !!id,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['tournament-registrations', id],
    queryFn: () => registrationsApi.list({ tournament_id: id }),
    enabled: !!id,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['tournament-players', id],
    queryFn: () => {
      if (!registrations.length) return [];
      const playerIds = [...new Set(registrations.map(r => r.player_id).filter(Boolean))];
      if (!playerIds.length) return [];
      return playersApi.list({ id: playerIds }, { limit: playerIds.length });
    },
    enabled: !!registrations.length,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['tournament-assignments', id],
    queryFn: () => tableAssignments.list({ tournament_id: id }),
    enabled: !!id,
  });

  const statusChangeCreateScores = useMutation({
    mutationFn: async (data) => {
      // Scorecard generation now happens automatically via the onTableAssigned
      // backend function when table assignments are created — not here.
      return await tournaments.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
  });

  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const waitlistedCount = registrations.filter(r => r.status === 'waitlisted').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Tournament not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tournaments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-slate-800">{tournament.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Manage tournament details and settings</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/admin/tournament/${id}/invite`)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Invite Players
        </Button>
        <Button onClick={() => navigate(`/admin/tournament/${id}/setup`)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Status</p>
                <Badge className={`mt-2 ${statusColors[tournament.status] || statusColors.setup}`}>
                  {tournament.status || 'setup'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500 font-medium">Date</p>
                <p className="font-semibold text-slate-700 mt-1">
                  {tournament.date ? format(new Date(tournament.date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500 font-medium">Location</p>
                <p className="font-semibold text-slate-700 mt-1">{tournament.location || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500 font-medium">Confirmed</p>
                <p className="font-semibold text-slate-700 mt-1">
                  {confirmedCount}
                  {tournament.player_cap ? ` / ${tournament.player_cap}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Rounds</Label>
                  <p className="font-semibold text-slate-800 mt-1">{tournament.num_rounds || 4}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Flights</Label>
                  <div className="flex gap-2 mt-1">
                    {(tournament.flights || []).map(f => (
                      <Badge key={f} variant="outline">{f}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              {tournament.description && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Description</Label>
                  <p className="text-slate-700 mt-1">{tournament.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Player Cap</Label>
                  <p className="font-semibold text-slate-800 mt-1">{tournament.player_cap || 'No limit'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Waitlist</Label>
                  <p className="font-semibold text-slate-800 mt-1">{tournament.waitlist_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
              <PlayerSharingToggle
                enabled={tournament.player_sharing_enabled !== false}
                onChange={(val) => statusChangeCreateScores.mutate({ player_sharing_enabled: val })}
                saving={statusChangeCreateScores.isPending}
              />
              <ShareInviteStats contextType="tournament" contextId={id} />
              {tournament.registration_close_date && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Registration Closes</Label>
                  <p className="font-semibold text-slate-800 mt-1">
                    {format(new Date(tournament.registration_close_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
              {tournament.reminder_send_at && (
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Reminder Email</Label>
                  <p className="font-semibold text-slate-800 mt-1">
                    {format(new Date(tournament.reminder_send_at), 'MMM d, yyyy h:mm a')}
                    {tournament.reminder_sent && <span className="ml-2 text-xs text-emerald-600 font-normal">✓ Sent</span>}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500 uppercase">Payment Model</Label>
                <p className="font-semibold text-slate-800 mt-1 capitalize">{tournament.payment_model || 'none'}</p>
              </div>
              {(tournament.entry_fee || tournament.app_fee) && (
                <div className="grid grid-cols-2 gap-4">
                  {tournament.entry_fee && (
                    <div>
                      <Label className="text-xs text-slate-500 uppercase">Entry Fee</Label>
                      <p className="font-semibold text-slate-800 mt-1">${(tournament.entry_fee / 100).toFixed(2)}</p>
                    </div>
                  )}
                  {tournament.app_fee && (
                    <div>
                      <Label className="text-xs text-slate-500 uppercase">App Fee</Label>
                      <p className="font-semibold text-slate-800 mt-1">${(tournament.app_fee / 100).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>Milestone 4 — East submission & player approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">East-Only Submission</p>
                  <p className="text-xs text-slate-500">Only the East player can submit match results; the other three players approve.</p>
                </div>
                <Switch
                  checked={tournament.approval_workflow_enabled === true}
                  onCheckedChange={(val) => statusChangeCreateScores.mutate({ approval_workflow_enabled: val })}
                  disabled={statusChangeCreateScores.isPending}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">Trusted Organizer</p>
                  <p className="text-xs text-slate-500">Allow an organizer to finalize results without player approval.</p>
                </div>
                <Switch
                  checked={tournament.trusted_organizer_enabled === true}
                  onCheckedChange={(val) => statusChangeCreateScores.mutate({ trusted_organizer_enabled: val })}
                  disabled={statusChangeCreateScores.isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Auto-Approve After (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={tournament.approval_timeout_hours ?? 24}
                    onChange={(e) => statusChangeCreateScores.mutate({ approval_timeout_hours: Number(e.target.value) || 24 })}
                    disabled={statusChangeCreateScores.isPending}
                    className="mt-1"
                  />
                </div>
                <Link to={`/admin/match-results?tournament=${id}`} className="w-full">
                  <Button variant="outline" className="gap-2 w-full">
                    <Gavel className="h-4 w-4" /> Manage Match Results
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>Registration Summary</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <div className="flex justify-between items-center">
                 <span className="text-slate-600">Confirmed</span>
                 <Badge className="bg-emerald-100 text-emerald-700">{confirmedCount}</Badge>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-600">Waitlisted</span>
                 <Badge className="bg-orange-100 text-orange-700">{waitlistedCount}</Badge>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-600">Pending</span>
                 <Badge className="bg-slate-100 text-slate-600">
                   {registrations.filter(r => r.status === 'pending').length}
                 </Badge>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-600">Declined</span>
                 <Badge variant="outline">{registrations.filter(r => r.status === 'declined').length}</Badge>
               </div>
             </CardContent>
           </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/registrations?tournament=${id}`)}
              >
                Manage Registrations
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/tournament/${id}/registrations`)}
              >
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/tables?tournament=${id}`)}
              >
                Manage Tables
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/scores?tournament=${id}`)}
              >
                View Scores
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/leaderboard?tournament=${id}`)}
              >
                View Leaderboard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowBroadcast(true)}
              >
                Broadcast Info
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/tournament/${id}/communications`)}
              >
                Communications
              </Button>
              {tournament.sets_needed_enabled && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/admin/tournament/${id}/sets`)}
                >
                  Manage Sets
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => { setActiveTab('checkin'); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
              >
                <UserCheck className="h-4 w-4" /> Player Check-In
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/tournament/${id}/timing`)}
              >
                Timing & Log
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/admin/tournament/${id}/prizes`)}
              >
                <Trophy className="h-4 w-4 text-amber-500" /> Prize Structure
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/room-map?tournament=${id}`)}
              >
                <Map className="h-4 w-4" /> Room Map (Full Screen)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/admin/tournament/${id}/card-special-hands`)}
              >
                <Sparkles className="h-4 w-4" /> Special Hands
              </Button>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* Broadcast modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Broadcast Info</h2>
              <button onClick={() => setShowBroadcast(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5">
              <TournamentBroadcast tournament={tournament} />
            </div>
          </div>
        </div>
      )}

      <Card className="border-slate-200 mb-6">
        <CardHeader className="pb-0">
          <div className="flex gap-1 border-b border-slate-100 -mx-6 px-6 pb-0 overflow-x-auto scrollbar-none">
            {[
              { key: 'assignments', label: 'Table Assignments' },
              { key: 'checkin', label: 'Check-In', icon: <UserCheck className="h-4 w-4" /> },
              { key: 'scores', label: 'Score Cards' },
              { key: 'leaderboard', label: 'Leaderboard' },
              ...(tournament.sets_needed_enabled ? [{ key: 'sets', label: 'Game Sets' }] : []),
              { key: 'timing', label: 'Timing & Log' },
              { key: 'room_map', label: 'Room Map' },
              { key: 'community', label: 'Community' },
              { key: 'website', label: 'Website' },
              { key: 'print', label: 'Print', icon: <Printer className="h-4 w-4" /> },
              { key: 'raffles', label: '🎟 Raffles' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setActiveTab(key); }}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === key
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {activeTab === 'assignments' ? (
            confirmedCount >= 4 ? (
              <Tabs value={activeRound} onValueChange={setActiveRound}>
                <TabsList className="mb-4">
                  {Array.from({ length: tournament.num_rounds || 4 }, (_, i) => (
                    <TabsTrigger key={i + 1} value={String(i + 1)}>
                      Round {i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Array.from({ length: tournament.num_rounds || 4 }, (_, i) => (
                  <TabsContent key={i + 1} value={String(i + 1)}>
                    <RoundAssignments
                      tournamentId={id}
                      roundNumber={i + 1}
                      assignments={assignments}
                      registrations={registrations}
                      players={players}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">At least 4 confirmed players needed to create table assignments.</p>
            )
          ) : activeTab === 'checkin' ? (
            <div className="space-y-6">
              <QRCodeDisplay sessionId={id} tournamentId={id} sessionName={tournament.name} />
              <TournamentCheckIn tournamentId={id} />
            </div>
          ) : activeTab === 'scores' ? (
            <TournamentScoreCards tournamentId={id} />
          ) : activeTab === 'sets' ? (
            <TournamentSets tournamentId={id} tournament={tournament} />
          ) : activeTab === 'timing' ? (
            <div className="space-y-8">
              <RoundTimerControl tournamentId={id} numRounds={tournament.num_rounds || 4} />
              <ScoreVerificationLog tournamentId={id} />
            </div>
          ) : activeTab === 'room_map' ? (
            <RoomMapEditor
              tournamentId={id}
              numTables={Math.ceil(confirmedCount / 4)}
            />
          ) : activeTab === 'community' ? (
            <div className="space-y-6">
              <CommunityRulesAdmin contextType="tournament" contextId={id} />
              <hr className="border-slate-100" />
              <CommunityFeed contextType="tournament" contextId={id} isEnrolled={true} isAdmin={true} />
            </div>
          ) : activeTab === 'print' ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Player Half-Sheets</h3>
                <p className="text-sm text-muted-foreground mb-4">Prints two players per letter-size page (half-sheet each). Toggle what info to include below.</p>
                <PlayerPrintSheet tournamentId={id} tournament={tournament} />
              </div>
              <hr className="border-slate-200" />
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Name Tags</h3>
                <p className="text-sm text-muted-foreground mb-4">Avery 5160 format — 30 name tags per sheet.</p>
                <NameTagsPrint tournamentId={id} tournament={tournament} />
              </div>
              <hr className="border-slate-200" />
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Brother Label (62mm)</h3>
                <p className="text-sm text-muted-foreground mb-4">Brother QL-820NWB — one name tag per label, continuous tape.</p>
                <BrotherLabelPrint tournamentId={id} tournament={tournament} />
              </div>
            </div>
          ) : activeTab === 'website' ? (
            <TournamentWebsiteTab tournament={tournament} updateTournament={statusChangeCreateScores} />
          ) : activeTab === 'raffles' ? (
            <RaffleAdmin tournamentId={id} />
          ) : (
            <TournamentLeaderboard tournamentId={id} tournament={tournament} />
          )}
        </CardContent>
      </Card>


    </div>
  );
}