import React, { useEffect, useState } from 'react';
import { me as authMe } from '@/services/authApi';
import { callAction } from '@/services/actions';
import { leagueMembers as leagueMembersApi, leagueRoundTimers as leagueRoundTimersApi, leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi, leagueTableAssignments as leagueTableAssignmentsApi, leagues as leaguesApi } from '@/services/resources';
import { haptics } from '@/lib/haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Calendar, MapPin, Clock, CheckCircle2, XCircle, Briefcase, Users,
  ChevronDown, ChevronUp, ChevronLeft, Grid3X3, Play, Square, RotateCcw,
  Timer, Trophy, ChevronRight, Share2, CreditCard, AlertCircle, UserPlus, ClipboardList
} from 'lucide-react';
import EventShareSheet from '@/components/shared/EventShareSheet';
import { leagueRequiresPayment, formatLeagueMembershipFee, startLeagueCheckout, invalidateLeagueMemberQueries } from '@/lib/league-checkout';
import { handleLeaguePaymentSuccess } from '@/lib/league-payment-success';
import { LeagueTimerBanner } from '@/components/timer/LiveTimerBanner';
import RoomMapPlayerView from '@/components/roommap/RoomMapPlayerView';
import AddToCalendarButton from '@/components/leagues/AddToCalendarButton';
import LeagueLeaderboard from '@/components/leagues/LeagueLeaderboard';
import LeagueAttendanceHistory from '@/components/player/LeagueAttendanceHistory';
import LeaguePlayerScoreEntry from '@/components/leagues/LeaguePlayerScoreEntry';
import LeagueLogo from '@/components/leagues/LeagueLogo';
import { useNavigate } from 'react-router-dom';
import { differenceInSeconds, format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useLeagueAlerts } from '@/hooks/usePlayerAlerts';
import { useLeagueTimers } from '@/hooks/useLeagueTimers';
import { RELATED_ROW_LIMIT } from '@/lib/query-limits';

// ─── Countdown component (defined outside to avoid hooks-in-loop) ─────────────
function TimerCountdown({ startedAt, durationMinutes }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () => setElapsed(differenceInSeconds(new Date(), new Date(startedAt)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const remaining = durationMinutes * 60 - elapsed;
  const isOvertime = remaining < 0;
  const abs = Math.abs(remaining);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const s = (abs % 60).toString().padStart(2, '0');
  return (
    <span className={`font-mono font-bold text-lg ${isOvertime ? 'text-red-600' : 'text-emerald-600'}`}>
      {isOvertime ? '+' : ''}{m}:{s}
    </span>
  );
}

// ─── League list card ─────────────────────────────────────────────────────────
function LeagueCard({ league, membership, nextSession, myRsvp, onSelect, paymentPending, onCompletePayment, payingMemberId }) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const statusBadge = myRsvp
    ? myRsvp.status === 'yes' ? { label: 'Going', cls: 'bg-green-100 text-green-700' }
    : myRsvp.status === 'waitlist' ? { label: myRsvp.waitlist_position ? `Waitlist #${myRsvp.waitlist_position}` : 'Waitlisted', cls: 'bg-amber-100 text-amber-700' }
    : { label: "Can't go", cls: 'bg-red-100 text-red-600' }
    : { label: 'No response', cls: 'bg-slate-100 text-slate-500' };

  const feeLabel = formatLeagueMembershipFee(league.membership_fee);
  const isPaying = payingMemberId === membership?.id;

  return (
    <Card className={paymentPending ? "border-amber-200" : "active:scale-[0.99] transition-transform cursor-pointer"} onClick={paymentPending ? undefined : onSelect}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <LeagueLogo logoUrl={league.logo_url} name={league.name} size={48} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-base">{league.name}</p>
              {league.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />{league.location}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {league.day_of_week != null && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    Every {DAY_NAMES[league.day_of_week]}s · {league.start_time}
                  </span>
                )}
                {membership?.is_regular && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Regular</span>
                )}
              </div>
            </div>
          </div>
          {paymentPending ? (
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1 shrink-0 mt-1">
              <AlertCircle className="h-3.5 w-3.5" /> Payment Pending
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
          )}
        </div>

        {paymentPending ? (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3 space-y-3">
              {league.membership_label && (
                <p className="text-xs text-muted-foreground text-center">{league.membership_label}</p>
              )}
              <p className="text-sm text-amber-700 font-medium text-center">
                {feeLabel} due to activate your membership
              </p>
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onCompletePayment?.(league.id, membership?.id); }}
                disabled={isPaying}
              >
                <CreditCard className="h-4 w-4" />
                {isPaying ? 'Processing…' : `Complete Payment — ${feeLabel}`}
              </Button>
            </div>
          </div>
        ) : nextSession ? (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Next session</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(nextSession.date + 'T12:00:00'), 'EEE, MMM d')}
              </p>
            </div>
            <Badge className={statusBadge.cls}>{statusBadge.label}</Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Session card (inside league detail) ─────────────────────────────────────
function SessionCard({ session, league, user, myRsvp, allRsvps, myAssignments, leagueTimers, timerDurations, setTimerDurations, onRsvp, onSubRequest, timerMutation, volunteering, setVolunteering, comments, setComments, onVolunteerToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const yesRsvps = allRsvps.filter(r => r.session_id === session.id && r.status === 'yes');
  const league_show_assignments = league.table_assignments_enabled && session.assignments_published;

  const WINDS = ['east', 'south', 'west', 'north'];
  const sessionAssignments = myAssignments.filter(a => a.session_id === session.id);
  const mySeats = sessionAssignments.map(a => {
    const wind = WINDS.find(w => a[`${w}_player_email`] === user.email);
    if (!wind) return null;
    return { round: a.round_number, table: a.table_number, wind: wind.charAt(0).toUpperCase() + wind.slice(1), setAtTable: a.set_at_table, setProvider: a.set_provider_email === user.email };
  }).filter(Boolean).sort((a, b) => a.round - b.round);

  const statusBadge = myRsvp
    ? myRsvp.status === 'yes' ? { label: 'Going ✓', cls: 'bg-green-100 text-green-700' }
    : myRsvp.status === 'waitlist' ? { label: myRsvp.waitlist_position ? `Waitlist #${myRsvp.waitlist_position}` : 'Waitlisted', cls: 'bg-amber-100 text-amber-700' }
    : { label: "Can't go", cls: 'bg-red-100 text-red-600' }
    : { label: 'No response', cls: 'bg-slate-100 text-slate-500' };

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="session-card-top flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground leading-snug">
              {format(new Date(session.date + 'T12:00:00'), 'EEEE, MMMM d')}
            </p>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
              {(session.start_time || session.end_time) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />{session.start_time}{session.end_time ? `–${session.end_time}` : ''}
                </span>
              )}
              {(session.location || league.location) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{session.location || league.location}
                </span>
              )}
            </div>
          </div>
          <div className="session-card-actions flex items-center gap-2 shrink-0">
            <Badge className={statusBadge.cls}>{statusBadge.label}</Badge>
            <AddToCalendarButton league={league} firstSession={session} />
          </div>
        </div>

        <LeagueTimerBanner sessionId={session.id} leagueId={session.league_id} />

        {/* RSVP buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { haptics.light(); onRsvp(session.id, league.id, 'yes'); }}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5
              ${myRsvp?.status === 'yes' || myRsvp?.status === 'waitlist'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            <CheckCircle2 className="h-4 w-4" /> Going
          </button>
          <button
            onClick={() => { haptics.light(); onRsvp(session.id, league.id, 'no'); }}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5
              ${myRsvp?.status === 'no'
                ? 'border-red-400 bg-red-50 text-red-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            <XCircle className="h-4 w-4" /> Can't go
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-400 hover:border-slate-300 transition-all"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Table assignments */}
        {league.table_assignments_enabled && !league_show_assignments && (
          <div className="bg-muted/30 rounded-xl p-3 border border-dashed border-border text-center">
            <Grid3X3 className="h-5 w-5 mx-auto mb-1 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Table assignments will be published by your organizer before the session starts.
            </p>
          </div>
        )}
        {league_show_assignments && mySeats.length > 0 && (
          <div className="bg-muted/40 rounded-xl p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5" /> Your Table Assignments
            </p>
            <div className="space-y-2">
              {mySeats.map(seat => (
                <div key={seat.round} className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-medium text-muted-foreground w-14">Round {seat.round}</span>
                  <span className="font-bold text-foreground">Table {seat.table}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    seat.wind === 'East' ? 'bg-red-100 text-red-700' :
                    seat.wind === 'South' ? 'bg-green-100 text-green-700' :
                    seat.wind === 'West' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{seat.wind}</span>
                  {seat.setProvider && <span className="text-xs text-blue-600 font-medium">🎲 Bring your set</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <RoomMapPlayerView
                leagueId={session.league_id}
                roundAssignments={mySeats.map(s => ({ round: s.round, table: s.table, wind: s.wind }))}
              />
            </div>
          </div>
        )}

        {league_show_assignments && mySeats.length > 0 && league.scoring_enabled && (
          <div>
            {!showScores ? (
              <button
                onClick={() => setShowScores(true)}
                className="w-full py-2.5 rounded-xl border-2 border-primary/30 text-primary text-sm font-medium hover:border-primary/50 transition-all flex items-center justify-center gap-2"
              >
                <ClipboardList className="h-4 w-4" /> Enter table scores
              </button>
            ) : (
              <LeaguePlayerScoreEntry
                league={league}
                session={session}
                user={user}
                mySeats={mySeats}
                onClose={() => setShowScores(false)}
              />
            )}
          </div>
        )}

        {/* Admin timer controls */}
        {user?.role === 'admin' && (
          <div className="border border-border rounded-xl p-3 bg-muted/40 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" /> Round Timers
            </p>
            {Array.from({ length: league.num_rounds || 4 }, (_, i) => i + 1).map(roundNum => {
              const key = `${session.id}-${roundNum}`;
              const t = leagueTimers.find(t => t.session_id === session.id && t.round_number === roundNum);
              const status = t?.status || 'idle';
              const dur = timerDurations[key] ?? t?.duration_minutes ?? 60;
              return (
                <div key={roundNum} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">Round {roundNum}</span>
                  <Input
                    type="number" min={1} value={dur}
                    onChange={e => setTimerDurations(d => ({ ...d, [key]: e.target.value }))}
                    className="h-7 w-16 text-center text-xs"
                    disabled={status === 'running'}
                  />
                  <span className="text-xs text-slate-400">min</span>
                  {status === 'running' && t?.started_at && (
                    <TimerCountdown startedAt={t.started_at} durationMinutes={Number(dur)} />
                  )}
                  <div className="flex gap-1 ml-auto">
                    {status !== 'running' ? (
                      <Button size="sm" className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1"
                        onClick={() => timerMutation.mutate({ action: 'start', sessionId: session.id, leagueId: league.id, roundNum })}>
                        <Play className="h-3 w-3" /> {status === 'stopped' ? 'Restart' : 'Start'}
                      </Button>
                    ) : (
                      <Button size="sm" className="h-7 px-2 bg-red-500 hover:bg-red-600 text-xs gap-1"
                        onClick={() => timerMutation.mutate({ action: 'stop', sessionId: session.id, leagueId: league.id, roundNum })}>
                        <Square className="h-3 w-3" /> Stop
                      </Button>
                    )}
                    {status !== 'idle' && (
                      <Button size="sm" variant="outline" className="h-7 px-2"
                        onClick={() => timerMutation.mutate({ action: 'reset', sessionId: session.id, leagueId: league.id, roundNum })}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expanded options */}
        {expanded && (
          <div className="space-y-3 pt-1">
            {league.table_assignments_enabled && (
              <button
                onClick={() => { haptics.light(); onSubRequest(session.id, league.id); }}
                disabled={myRsvp?.sub_requested}
                className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${myRsvp?.sub_requested
                    ? 'border-amber-400 bg-amber-50 text-amber-700 opacity-70'
                    : 'border-amber-300 text-amber-700 hover:border-amber-400 bg-amber-50/50'}`}
              >
                <UserPlus className="h-4 w-4" />
                {myRsvp?.sub_requested ? 'Sub requested — finding coverage' : "I can't make it — Request a Substitute"}
              </button>
            )}
            {league.set_volunteers_needed > 0 && (
              <>
                <button
                  onClick={() => setVolunteering(v => {
                    const next = !v[session.id];
                    if (next && onVolunteerToggle) onVolunteerToggle();
                    return { ...v, [session.id]: next };
                  })}
                  className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2
                    ${volunteering[session.id] || myRsvp?.volunteering_set
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <Briefcase className="h-4 w-4" />
                  {volunteering[session.id] || myRsvp?.volunteering_set ? '✓ Volunteering a set' : 'Volunteer a game set'}
                </button>
                {(volunteering[session.id] || myRsvp?.volunteering_set) && (
                  <p className="text-xs text-blue-600 text-center font-medium">
                    Thank you! Your set will be tracked for this session.
                  </p>
                )}
              </>
            )}
            {league.rsvp_comments_enabled && (
              <Textarea
                placeholder="Add a comment (optional)…"
                rows={2}
                className="resize-none text-sm"
                value={comments[session.id] ?? (myRsvp?.comment || '')}
                onChange={e => setComments(c => ({ ...c, [session.id]: e.target.value }))}
              />
            )}
            {league.show_attendee_list && yesRsvps.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Who's going ({yesRsvps.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {yesRsvps.map(r => (
                    <span key={r.id} className="bg-muted rounded-full px-2.5 py-1 text-xs text-foreground">
                      {r.player_name}{r.volunteering_set ? ' 🎲' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── League detail view ───────────────────────────────────────────────────────
function LeagueDetail({ league, membership, user, onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sessions');
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState({});
  const [volunteering, setVolunteering] = useState({});
  const [timerDurations, setTimerDurations] = useState({});

  const { data: sessions = [] } = useQuery({
    queryKey: ['league-sessions-detail', league.id],
    queryFn: () => leagueSessionsApi.filter({ league_id: league.id, status: 'upcoming' }),
  });

  const sessionIds = sessions.map(s => s.id);

  const { data: myRsvps = [] } = useQuery({
    queryKey: ['my-rsvps-detail', user?.email, sessionIds.join(',')],
    queryFn: () =>
      leagueRsvpsApi.filter(
        { session_id: sessionIds, player_email: user.email },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    enabled: !!user?.email && sessionIds.length > 0,
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['all-rsvps-detail', sessionIds.join(',')],
    queryFn: () =>
      leagueRsvpsApi.filter({ session_id: sessionIds }, undefined, RELATED_ROW_LIMIT),
    enabled: sessionIds.length > 0,
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['my-assignments-detail', user?.email, sessionIds.join(',')],
    queryFn: () =>
      leagueTableAssignmentsApi.filter(
        { session_id: sessionIds },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    enabled: !!user?.email && sessionIds.length > 0,
  });

  const { data: leagueTimers = [], refetch: refetchTimers } = useLeagueTimers(
    sessionIds,
    user?.role === 'admin'
  );

  const { data: members = [] } = useQuery({
    queryKey: ['league-roster', league.id],
    queryFn: () => callAction('getLeagueRoster', { league_id: league.id }).then((r) => r?.roster || []),
    enabled: activeTab === 'members' && !!league.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-rsvps-detail'] });
    queryClient.invalidateQueries({ queryKey: ['all-rsvps-detail'] });
    queryClient.invalidateQueries({ queryKey: ['my-league-memberships'] });
  };

  const rsvpMutation = useMutation({
    mutationFn: async ({ sessionId, leagueId, newStatus }) => {
      const existing = myRsvps.find(r => r.session_id === sessionId);
      const session = sessions.find(s => s.id === sessionId);
      const cap = session?.player_cap || league?.player_cap;
      const yesCount = allRsvps.filter(r => r.session_id === sessionId && r.status === 'yes' && r.player_email !== user.email).length;
      const actualStatus = newStatus === 'yes' && cap && yesCount >= cap && league?.waitlist_enabled ? 'waitlist' : newStatus;
      const data = {
        session_id: sessionId,
        league_id: leagueId,
        player_email: user.email,
        player_name: user.full_name,
        status: actualStatus,
        volunteering_set: newStatus === 'yes' ? (volunteering[sessionId] || false) : false,
        comment: (comments[sessionId] || '').trim() || null,
        responded_at: new Date().toISOString(),
      };
      if (existing) return leagueRsvpsApi.update(existing.id, data);
      return leagueRsvpsApi.create(data);
    },
    onSuccess: async (_data, variables) => {
      try {
        await callAction('recalculateLeagueWaitlist', { session_id: variables.sessionId });
      } catch {}
      haptics.success();
      invalidate();
      toast({ title: 'RSVP saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const subMutation = useMutation({
    mutationFn: async ({ sessionId, leagueId }) => callAction('requestLeagueSubstitute', { session_id: sessionId, league_id: leagueId }),
    onSuccess: () => { haptics.success(); invalidate(); toast({ title: 'Substitute requested', description: 'Your organizer and available substitutes have been notified.' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const timerMutation = useMutation({
    mutationFn: async ({ action, sessionId, leagueId, roundNum }) => {
      const existing = leagueTimers.find(t => t.session_id === sessionId && t.round_number === roundNum);
      const duration = timerDurations[`${sessionId}-${roundNum}`] ?? existing?.duration_minutes ?? 60;
      if (action === 'start') {
        const data = { status: 'running', started_at: new Date().toISOString(), stopped_at: null, duration_minutes: Number(duration) };
        if (existing) return leagueRoundTimersApi.update(existing.id, data);
        return leagueRoundTimersApi.create({ session_id: sessionId, league_id: leagueId, round_number: roundNum, ...data });
      } else if (action === 'stop') {
        return leagueRoundTimersApi.update(existing.id, { status: 'stopped', stopped_at: new Date().toISOString() });
      } else if (action === 'reset') {
        return leagueRoundTimersApi.update(existing.id, { status: 'idle', started_at: null, stopped_at: null });
      }
    },
    onSuccess: () => refetchTimers(),
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  useLeagueAlerts({ sessionIds, userEmail: user?.email ?? null });

  const upcoming = [...sessions].sort((a, b) => a.date > b.date ? 1 : -1);
  const tabs = [
    { id: 'sessions', label: 'Sessions' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'attendance', label: 'Attendance' },
    { id: 'members', label: 'Members' },
  ];

  return (
    <div className="flex flex-col min-h-screen native-app-shell">
      {/* Header */}
      {showShare && (
        <EventShareSheet
          contextType="league"
          contextId={league.id}
          contextName={league.name}
          onClose={() => setShowShare(false)}
        />
      )}
      <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {league.logo_url && (
              <img src={league.logo_url} alt={`${league.name} logo`} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-xl leading-tight truncate">{league.name}</h1>
              {league.location && <p className="text-primary-foreground/60 text-xs mt-0.5 truncate">{league.location}</p>}
            </div>
          </div>
          {league.player_sharing_enabled !== false && (
            <button
              onClick={() => setShowShare(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform shrink-0"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-primary-foreground/10 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-foreground text-primary shadow-sm'
                  : 'text-primary-foreground/70 hover:text-primary-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 space-y-4 overflow-y-auto native-app-scroll native-bottom-scroll-pad web-bottom-scroll-pad-lg">
        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <>
            {upcoming.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming sessions right now.</p>
              </div>
            ) : (
              upcoming.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  league={league}
                  user={user}
                  myRsvp={myRsvps.find(r => r.session_id === session.id)}
                  allRsvps={allRsvps}
                  myAssignments={myAssignments}
                  leagueTimers={leagueTimers}
                  timerDurations={timerDurations}
                  setTimerDurations={setTimerDurations}
                  onRsvp={(sessionId, leagueId, newStatus) => rsvpMutation.mutate({ sessionId, leagueId, newStatus })}
                  onSubRequest={(sessionId, leagueId) => subMutation.mutate({ sessionId, leagueId })}
                  timerMutation={timerMutation}
                  volunteering={volunteering}
                  setVolunteering={setVolunteering}
                  comments={comments}
                  setComments={setComments}
                  onVolunteerToggle={() => toast({ title: '🎲 Thank you for volunteering!', description: 'Your generosity helps make this session possible.' })}
                />
              ))
            )}
          </>
        )}

        {/* Leaderboard tab */}
        {activeTab === 'leaderboard' && (
          <LeagueLeaderboard leagueId={league.id} userEmail={user?.email} />
        )}

        {activeTab === 'attendance' && (
          <LeagueAttendanceHistory userEmail={user?.email} />
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1 mb-3">{members.length} active members</p>
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{m.player_name?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{m.player_name}</p>
                  {m.player_city_state && <p className="text-xs text-muted-foreground">{m.player_city_state}</p>}
                </div>
                {m.is_regular && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">Regular</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MyLeagues() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [payingMemberId, setPayingMemberId] = useState(null);

  // When a league detail is open (internal state, not a route), we need both:
  //  - Web: push a history entry so the browser back button returns to the list
  //    instead of navigating away from /app/leagues entirely.
  //  - Native: set a body flag so the hardware back button delegates to this
  //    component via the 'app:backFromDetail' custom event.
  useEffect(() => {
    if (!selectedLeague) return;

    window.history.pushState({ leagueDetailOpen: true }, '');
    document.body.dataset.leagueDetailOpen = 'true';

    const handlePopState = () => setSelectedLeague(null);
    const handleNativeBack = () => window.history.back();

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app:backFromDetail', handleNativeBack);

    return () => {
      delete document.body.dataset.leagueDetailOpen;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app:backFromDetail', handleNativeBack);
    };
  }, [selectedLeague]);

  // Handle payment return URL params — same pattern as tournament payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus === 'success') {
      const memberId = params.get('member_id') || params.get('memberId');
      const sessionId = params.get('session_id') || params.get('sessionId');
      navigate('/app/leagues', { replace: true });
      handleLeaguePaymentSuccess({ memberId, sessionId, queryClient, toast });
    } else if (paymentStatus === 'cancelled') {
      toast({ title: 'Payment cancelled', description: 'Your membership is pending until payment is completed.', variant: 'destructive' });
      navigate('/app/leagues', { replace: true });
    }
  }, []);

  useEffect(() => {
    authMe().then(setUser).catch(() => {});
  }, []);

  const { data: memberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['my-league-memberships', user?.email],
    queryFn: () => leagueMembersApi.filter({ player_email: user.email }),
    enabled: !!user?.email,
  });

  // Auto-verify pending members with a Stripe session — recovers from missed webhooks
  useEffect(() => {
    if (!memberships.length) return;
    const pending = memberships.filter(m => m.payment_status === 'pending' && m.stripe_session_id);
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const m of pending) {
        if (cancelled) return;
        try {
          await callAction('confirmLeaguePayment', {
            session_id: m.stripe_session_id,
            member_id: m.id,
          });
        } catch {}
      }
      if (!cancelled) invalidateLeagueMemberQueries(queryClient);
    })();
    return () => { cancelled = true; };
  }, [memberships, queryClient]);

  // Unified list: show active memberships first, then payment-pending ones (like MyCourses)
  const displayMemberships = [...memberships]
    .sort((a, b) => {
      const aPending = a.payment_status === 'pending' ? 1 : 0;
      const bPending = b.payment_status === 'pending' ? 1 : 0;
      return aPending - bPending;
    });

  const allLeagueIds = [...new Set(displayMemberships.map(m => m.league_id))];

  const { data: allLeagues = [], isLoading: loadingLeagues } = useQuery({
    queryKey: ['my-leagues-detail', allLeagueIds.join(',')],
    queryFn: () =>
      leaguesApi.filter({ id: allLeagueIds }, undefined, allLeagueIds.length),
    enabled: allLeagueIds.length > 0,
  });

  // Only fetch sessions for non-pending leagues
  const activeLeagueIds = [...new Set(
    displayMemberships.filter(m => m.payment_status !== 'pending').map(m => m.league_id)
  )];

  const { data: allSessions = [] } = useQuery({
    queryKey: ['my-league-sessions-list', activeLeagueIds.join(',')],
    queryFn: () =>
      leagueSessionsApi.filter(
        { league_id: activeLeagueIds, status: 'upcoming' },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    enabled: activeLeagueIds.length > 0,
  });

  const sessionIds = allSessions.map(s => s.id);

  const { data: myRsvps = [] } = useQuery({
    queryKey: ['my-rsvps-list', user?.email, sessionIds.join(',')],
    queryFn: () =>
      leagueRsvpsApi.filter(
        { session_id: sessionIds, player_email: user.email },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    enabled: !!user?.email && sessionIds.length > 0,
  });

  const handleCompletePayment = async (leagueId, memberId) => {
    setPayingMemberId(memberId);
    try {
      await startLeagueCheckout({ leagueId, memberId, navigate });
    } catch (err) {
      toast({ title: 'Payment Error', description: err.message, variant: 'destructive' });
      setPayingMemberId(null);
    }
  };

  const isLoading = !user || loadingMemberships || (allLeagueIds.length > 0 && loadingLeagues);

  const header = (
    <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app')} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading font-bold text-xl leading-tight">My Leagues</h1>
          <p className="text-primary-foreground/60 text-xs mt-0.5">Your league memberships</p>
        </div>
      </div>
    </div>
  );

  // If a league is selected, show detail view
  if (selectedLeague) {
    const membership = memberships.find(m => m.league_id === selectedLeague.id);
    return (
      <LeagueDetail
        league={selectedLeague}
        membership={membership}
        user={user}
        onBack={() => window.history.back()}
      />
    );
  }

  if (isLoading) return (
    <div className="flex flex-col min-h-screen native-app-shell">
      {header}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen native-app-shell">
      {header}
      <div className="flex-1 px-4 pt-4 space-y-3 overflow-y-auto native-app-scroll native-bottom-scroll-pad web-bottom-scroll-pad-md">
        {allLeagues.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">You're not in any leagues yet</p>
            <p className="text-sm mt-1">Contact your league organizer to be added to the roster.</p>
          </div>
        ) : (
          <>
            {allLeagues.map(league => {
              const membership = displayMemberships.find(m => m.league_id === league.id);
              const isPaymentPending = membership?.payment_status === 'pending';
              const leagueSessions = allSessions.filter(s => s.league_id === league.id).sort((a, b) => a.date > b.date ? 1 : -1);
              const nextSession = leagueSessions[0];
              const myRsvp = nextSession ? myRsvps.find(r => r.session_id === nextSession.id) : null;
              return (
                <LeagueCard
                  key={league.id}
                  league={league}
                  membership={membership}
                  nextSession={isPaymentPending ? null : nextSession}
                  myRsvp={isPaymentPending ? null : myRsvp}
                  onSelect={isPaymentPending ? undefined : () => setSelectedLeague(league)}
                  paymentPending={isPaymentPending}
                  onCompletePayment={isPaymentPending ? handleCompletePayment : undefined}
                  payingMemberId={payingMemberId}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}