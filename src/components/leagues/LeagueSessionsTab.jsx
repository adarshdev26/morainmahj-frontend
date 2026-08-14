import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Calendar, Users, ChevronRight, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, addDays, addMonths, nextDay } from 'date-fns';

const STATUS_COLORS = {
  upcoming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-700',
};

const DAY_MAP = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

export default function LeagueSessionsTab({ league }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newHands, setNewHands] = useState(league.hands_per_round || '');
  const [genWeeks, setGenWeeks] = useState(4);

  const { data: sessions = [] } = useQuery({
    queryKey: ['league-sessions', league.id],
    queryFn: () => leagueSessionsApi.filter({ league_id: league.id }),
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['league-rsvps-all', league.id],
    queryFn: () => leagueRsvpsApi.filter({ league_id: league.id }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['league-sessions', league.id] });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const session = await leagueSessionsApi.create({ league_id: league.id, status: 'upcoming', ...data });
      // Attendance is determined by RSVP responses — no auto-RSVP on session creation.
      return session;
    },
    onSuccess: () => { invalidate(); setShowCreate(false); setNewDate(''); toast({ title: 'Session created.' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const sendInviteMutation = useMutation({
    mutationFn: (sessionId) => callAction('sendLeagueInvites', { sessionId }),
    onSuccess: () => { invalidate(); toast({ title: 'Invites sent!' }); },
    onError: (err) => toast({ title: 'Error sending invites', description: err.message, variant: 'destructive' }),
  });

  const generateSessions = async () => {
    if (league.day_of_week == null) { toast({ title: 'Set a day of week in league settings first', variant: 'destructive' }); return; }
    const today = new Date();
    // Find next occurrence of day_of_week
    let date = new Date(today);
    while (date.getDay() !== league.day_of_week) date = addDays(date, 1);

    const existing = sessions.map(s => s.date);
    let created = 0;

    for (let i = 0; i < genWeeks; i++) {
      const dateStr = format(date, 'yyyy-MM-dd');
      // Stop generating past the season end date (if set)
      if (league.season_end && dateStr > league.season_end) break;
      if (!existing.includes(dateStr)) {
        await leagueSessionsApi.create({
          league_id: league.id,
          date: dateStr,
          start_time: league.start_time,
          end_time: league.end_time,
          location: league.location,
          player_cap: league.player_cap,
          hands_per_round: league.hands_per_round || null,
          status: 'upcoming',
        });
        // Attendance is determined by RSVP responses — no auto-RSVP on session creation.
        created++;
      }
      if (league.cadence === 'biweekly') date = addDays(date, 14);
      else if (league.cadence === 'monthly') date = addMonths(date, 1);
      else if (league.cadence === 'first_weekday') {
        let d = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        while (d.getDay() !== league.day_of_week) d = addDays(d, 1);
        date = d;
      } else date = addDays(date, 7);
    }
    invalidate();
    toast({ title: `${created} sessions generated.` });
  };

  const sorted = [...sessions].sort((a, b) => a.date < b.date ? 1 : -1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{sessions.length} sessions total</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input type="number" min={1} max={52} value={genWeeks} onChange={e => setGenWeeks(Number(e.target.value))} className="w-16 text-center" />
            <Button size="sm" variant="outline" className="gap-1" onClick={generateSessions}>
              <Wand2 className="h-3.5 w-3.5" /> Generate {genWeeks} Sessions
            </Button>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowCreate(b => !b)}>
            <Plus className="h-3.5 w-3.5" /> Add Session
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white border rounded-xl p-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hands / round (optional)</label>
            <Input type="number" min={1} value={newHands} onChange={e => setNewHands(e.target.value)} placeholder={league.hands_per_round || 'e.g. 8'} className="w-36" />
          </div>
          <Button size="sm" onClick={() => { if (!newDate) return; createMutation.mutate({ date: newDate, start_time: league.start_time, end_time: league.end_time, location: league.location, player_cap: league.player_cap, hands_per_round: newHands ? Number(newHands) : null }); }} disabled={createMutation.isPending}>
            Create
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(session => {
          const sessionRsvps = rsvps.filter(r => r.session_id === session.id);
          const yesCount = sessionRsvps.filter(r => r.status === 'yes').length;
          const waitCount = sessionRsvps.filter(r => r.status === 'waitlist').length;
          const volunteers = sessionRsvps.filter(r => r.volunteering_set).length;

          return (
            <div key={session.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="text-center w-14 shrink-0">
                <p className="text-xs text-slate-400">{format(new Date(session.date + 'T12:00:00'), 'MMM')}</p>
                <p className="text-2xl font-bold font-heading text-slate-800 leading-none">{format(new Date(session.date + 'T12:00:00'), 'd')}</p>
                <p className="text-xs text-slate-400">{format(new Date(session.date + 'T12:00:00'), 'EEE')}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[session.status]}>{session.status}</Badge>
                  {session.invite_sent && <Badge variant="outline" className="text-xs gap-1"><Send className="h-3 w-3" /> Invited</Badge>}
                  {session.hands_per_round ? <Badge variant="outline" className="text-xs">{session.hands_per_round} hands/round</Badge> : null}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {yesCount} attending{waitCount > 0 ? ` · ${waitCount} waitlist` : ''}</span>
                  {volunteers > 0 && <span>· {volunteers} set volunteer{volunteers !== 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!session.invite_sent && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => sendInviteMutation.mutate(session.id)} disabled={sendInviteMutation.isPending}>
                    <Send className="h-3.5 w-3.5" /> Send Invites
                  </Button>
                )}
                <button onClick={() => navigate(`/admin/leagues/${league.id}/session/${session.id}`)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sessions yet. Generate them or add one manually.</p>
          </div>
        )}
      </div>
    </div>
  );
}