import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { leagueMembers as leagueMembersApi, leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi, leagues as leaguesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Users, Send, CheckCircle2, Clock, X, Briefcase, Grid3X3, Timer, Mail, ClipboardList, UserPlus, BellRing, Trophy, Play, Map as MapIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import LeagueAssignmentsTab from '@/components/leagues/LeagueAssignmentsTab';
import LeagueScoresTab from '@/components/leagues/LeagueScoresTab';
import LeagueTimerTab from '@/components/leagues/LeagueTimerTab';
import LeagueBulkComms from '@/components/leagues/LeagueBulkComms';
import LeagueSessionLeaderboard from '@/components/leagues/LeagueSessionLeaderboard';
import QRCodeDisplay from '@/components/checkin/QRCodeDisplay';
import AssignSubstituteDialog from '@/components/leagues/AssignSubstituteDialog';
import LeagueBulkCheckIn from '@/components/leagues/LeagueBulkCheckIn';
import LeagueSessionRoomMap from '@/components/leagues/LeagueSessionRoomMap';
import WalkInDialog from '@/components/leagues/WalkInDialog';

const statusColors = {
  yes: 'bg-green-100 text-green-700',
  no: 'bg-red-100 text-red-600',
  waitlist: 'bg-amber-100 text-amber-700',
};

const TABS = ['RSVPs', 'Assignments', 'Map', 'Timer', 'Communications'];

export default function LeagueSessionDetail() {
  const { id: leagueId, sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('RSVPs');
  const [assignSubFor, setAssignSubFor] = useState(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['league-session', sessionId],
    queryFn: () => leagueSessionsApi.list().then(r => r.find(s => s.id === sessionId)),
    enabled: !!sessionId,
  });

  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => leaguesApi.list().then(r => r.find(l => l.id === leagueId)),
    enabled: !!leagueId,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['session-rsvps', sessionId],
    queryFn: () => leagueRsvpsApi.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['league-members', leagueId],
    queryFn: () => leagueMembersApi.filter({ league_id: leagueId }),
    enabled: !!leagueId,
  });
  const memberEmails = new Set(members.map(m => (m.player_email || '').toLowerCase()));

  const updateSession = useMutation({
    mutationFn: (data) => leagueSessionsApi.update(sessionId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['league-session', sessionId] }),
  });

  const sendInvites = useMutation({
    mutationFn: () => callAction('sendLeagueInvites', { sessionId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['league-session', sessionId] }); toast({ title: 'Invites sent!' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => callAction('finalizeLeagueSession', { sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['league-sessions'] });
      toast({ title: 'Session finalized', description: 'Scores locked and members notified.' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleCheckIn = useMutation({
    mutationFn: async ({ rsvpId, checkedIn }) => leagueRsvpsApi.update(rsvpId, {
      checked_in: !checkedIn,
      checked_in_at: !checkedIn ? new Date().toISOString() : null,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session-rsvps', sessionId] }),
  });

  const deleteRsvp = useMutation({
    mutationFn: (id) => leagueRsvpsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session-rsvps', sessionId] }),
  });

  const makeMember = useMutation({
    mutationFn: async (rsvp) => {
      const existing = members.find(m => (m.player_email || '').toLowerCase() === (rsvp.player_email || '').toLowerCase());
      if (existing) {
        return leagueMembersApi.update(existing.id, {
          is_substitute: false,
          active: league.payment_model === 'none' ? true : existing.active,
          payment_status: league.payment_model === 'none' ? 'not_required' : (existing.payment_status === 'paid' ? 'paid' : 'pending'),
        });
      }
      return leagueMembersApi.create({
        organization_id: league.organization_id || '',
        league_id: leagueId,
        player_email: rsvp.player_email,
        player_name: rsvp.player_name,
        player_phone: rsvp.player_phone || '',
        player_id: rsvp.player_id || '',
        active: league.payment_model === 'none',
        is_substitute: false,
        payment_status: league.payment_model === 'none' ? 'not_required' : 'pending',
        payment_amount: league.membership_fee || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-members', leagueId] });
      toast({ title: 'Converted to league member' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (!session || !league) return <div className="p-8 text-slate-400">Loading…</div>;

  const yes = rsvps.filter(r => r.status === 'yes');
  const waitlist = rsvps.filter(r => r.status === 'waitlist');
  const no = rsvps.filter(r => r.status === 'no');
  const volunteers = rsvps.filter(r => r.volunteering_set);
  const subRequests = rsvps.filter(r => r.sub_requested);

  let visibleTabs = league.table_assignments_enabled ? [...TABS] : ['RSVPs', 'Timer', 'Communications'];
  if (league.scoring_enabled) {
    const idx = visibleTabs.indexOf('Assignments');
    visibleTabs.splice(idx >= 0 ? idx + 1 : 1, 0, 'Scores');
    const scoresIdx = visibleTabs.indexOf('Scores');
    visibleTabs.splice(scoresIdx >= 0 ? scoresIdx + 1 : visibleTabs.length, 0, 'Leaderboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/admin/leagues/${leagueId}`)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent transition-colors">
            <ChevronLeft className="h-4 w-4" /> {league.name}
          </button>
        </div>

        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold">
              {format(new Date(session.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {session.start_time && `${session.start_time}`}{session.end_time && `–${session.end_time}`}
              {session.location && ` · ${session.location}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={session.hands_per_round ?? ''}
              onChange={e => updateSession.mutate({ hands_per_round: e.target.value ? Number(e.target.value) : null })}
              placeholder={league.hands_per_round ? `${league.hands_per_round} (league)` : 'Hands/round'}
              title="Hands per round (overrides league setting for this session)"
              className="w-28 text-sm border rounded-lg px-2 py-2 bg-white"
            />
            <select
              value={session.status}
              onChange={e => updateSession.mutate({ status: e.target.value })}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {['upcoming', 'active', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {!session.invite_sent && (
              <Button className="gap-2" onClick={() => sendInvites.mutate()} disabled={sendInvites.isPending}>
                <Send className="h-4 w-4" /> Send Invites
              </Button>
            )}
            {session.invite_sent && (
              <Badge variant="outline" className="gap-1 py-1.5"><Send className="h-3 w-3" /> Invites Sent</Badge>
            )}
            {session.status === 'upcoming' && (
              <Button className="gap-2" onClick={() => { updateSession.mutate({ status: 'active' }); toast({ title: 'Session started' }); }}>
                <Play className="h-4 w-4" /> Start Session
              </Button>
            )}
            {session.status !== 'completed' && (
              <Button variant="destructive" className="gap-2" onClick={() => { if (confirm('Finalize this session? Scores will be locked and members notified.')) finalizeMutation.mutate(); }} disabled={finalizeMutation.isPending}>
                <CheckCircle2 className="h-4 w-4" /> {finalizeMutation.isPending ? 'Finalizing…' : 'End Session'}
              </Button>
            )}
            {session.status === 'completed' && (
              <Badge className="bg-green-100 text-green-700 gap-1 py-1.5"><CheckCircle2 className="h-3 w-3" /> Finalized{session.finalized_at ? ` · ${format(new Date(session.finalized_at), 'MMM d')}` : ''}</Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Attending', value: yes.length, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Checked In', value: yes.filter(r => r.checked_in).length, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Waitlist', value: waitlist.length, icon: Clock, color: 'text-amber-600' },
            { label: 'Declined', value: no.length, icon: X, color: 'text-red-500' },
            { label: 'Sub Requests', value: subRequests.length, icon: BellRing, color: 'text-orange-600' },
            { label: 'Set Volunteers', value: volunteers.length, icon: Briefcase, color: 'text-blue-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                  <p className="text-2xl font-bold font-heading">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        {visibleTabs.length > 1 && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-5">
            {visibleTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab === 'Assignments' && <Grid3X3 className="h-3.5 w-3.5" />}
                {tab === 'Scores' && <ClipboardList className="h-3.5 w-3.5" />}
                {tab === 'Timer' && <Timer className="h-3.5 w-3.5" />}
                {tab === 'Leaderboard' && <Trophy className="h-3.5 w-3.5" />}
                {tab === 'Map' && <MapIcon className="h-3.5 w-3.5" />}
                {tab === 'Communications' && <Mail className="h-3.5 w-3.5" />}
                {tab}
                {tab === 'Assignments' && session.assignments_generated && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'RSVPs' && (
          <>
            <QRCodeDisplay sessionId={sessionId} leagueId={leagueId} sessionName={`${league.name} - ${format(new Date(session.date + 'T12:00:00'), 'MMM d')}`} />
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setWalkInOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Walk In
              </Button>
            </div>
            <LeagueBulkCheckIn session={session} rsvps={rsvps} />
            {[{ label: 'Attending', list: yes }, { label: 'Waitlist', list: waitlist }, { label: 'Declined', list: no }].map(({ label, list }) => list.length > 0 && (
              <Card key={label} className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> {label} ({list.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {list.map(r => (
                      <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                          {r.player_name?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{r.player_name}</p>
                            {r.sub_requested && <Badge className="bg-amber-100 text-amber-700 text-xs gap-1"><BellRing className="h-3 w-3" /> Sub Requested</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{r.player_email}</span>
                            {r.volunteering_set && <Badge variant="outline" className="text-xs">🎲 Bringing a set</Badge>}
                          </div>
                          {r.comment && <p className="text-xs text-slate-500 italic mt-0.5">"{r.comment}"</p>}
                        </div>
                        {r.sub_requested && (
                          <Button size="sm" variant="outline" className="gap-1 mr-1" onClick={() => setAssignSubFor(r)}>
                            <UserPlus className="h-3.5 w-3.5" /> Assign Sub
                          </Button>
                        )}
                        {r.status === 'yes' && (
                          <button
                            onClick={() => toggleCheckIn.mutate({ rsvpId: r.id, checkedIn: r.checked_in })}
                            title={r.checked_in ? 'Checked in — click to undo' : 'Check in player'}
                            className={`p-1.5 rounded-md transition-colors ${r.checked_in ? 'text-green-600' : 'text-slate-300 hover:text-green-600'}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {r.status === 'yes' && !memberEmails.has((r.player_email || '').toLowerCase()) && (
                          <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs px-2" onClick={() => makeMember.mutate(r)} disabled={makeMember.isPending}>
                            <UserPlus className="h-3 w-3" /> Member
                          </Button>
                        )}
                        <button onClick={() => deleteRsvp.mutate(r.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {activeTab === 'Map' && (
          <LeagueSessionRoomMap session={session} league={league} />
        )}

        {activeTab === 'Assignments' && (
          <LeagueAssignmentsTab session={session} league={league} />
        )}

        {activeTab === 'Scores' && (
          <LeagueScoresTab session={session} league={league} />
        )}

        {activeTab === 'Timer' && (
          <LeagueTimerTab session={session} league={league} />
        )}

        {activeTab === 'Leaderboard' && (
          <LeagueSessionLeaderboard session={session} league={league} />
        )}

        {activeTab === 'Communications' && (
          <LeagueBulkComms session={session} league={league} rsvps={rsvps} />
        )}
      </div>

      <WalkInDialog session={session} league={league} open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      <AssignSubstituteDialog
        open={!!assignSubFor}
        onClose={() => setAssignSubFor(null)}
        session={session}
        league={league}
        originalRsvp={assignSubFor}
      />
    </div>
  );
}