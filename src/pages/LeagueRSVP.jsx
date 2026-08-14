import React, { useState, useEffect, useRef } from 'react';
import { me as authMe } from '@/services/authApi';
import { callAction } from '@/services/actions';
import { leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi, leagues as leaguesApi } from '@/services/resources';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Calendar, MapPin, Clock, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import BackButton from '@/components/shared/BackButton';
import { useToast } from '@/components/ui/use-toast';

export default function LeagueRSVP() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  const urlEmail = params.get('email');
  const urlName = params.get('name');
  const { toast } = useToast();

  // Resolve email/name from auth when missing from URL (e.g., push notification clicks)
  const [authEmail, setAuthEmail] = useState(urlEmail || null);
  const [authName, setAuthName] = useState(urlName || null);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!urlEmail);
  useEffect(() => {
    // Always try to resolve auth user (for player_id), even when URL email is present
    authMe()
      .then(u => {
        if (u?.email) {
          setAuthEmail(prev => prev || u.email);
          setAuthName(prev => prev || (u.full_name || ''));
          setAuthUser(u);
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, [urlEmail]);

  const email = urlEmail || authEmail;
  const name = urlName || authName;

  const [status, setStatus] = useState(null); // 'yes' | 'no'
  const [volunteeringSet, setVolunteeringSet] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [existingRsvp, setExistingRsvp] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  const [savingComment, setSavingComment] = useState(false);
  const initializedRef = useRef(false);
  const lastSavedCommentRef = useRef('');

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => leagueSessionsApi.filter({ id: sessionId }).then(r => r[0]),
    enabled: !!sessionId,
  });

  const { data: league } = useQuery({
    queryKey: ['league', session?.league_id],
    queryFn: () => leaguesApi.filter({ id: session.league_id }).then(r => r[0]),
    enabled: !!session?.league_id,
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['session-rsvps-public', sessionId],
    queryFn: () => leagueRsvpsApi.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (initializedRef.current || !allRsvps.length || !email) return;
    const existing = allRsvps.find(r => r.player_email === email);
    if (existing) {
      initializedRef.current = true;
      setExistingRsvp(existing);
      setStatus(existing.status === 'waitlist' ? 'yes' : existing.status);
      setVolunteeringSet(existing.volunteering_set || false);
      setComment(existing.comment || '');
      lastSavedCommentRef.current = existing.comment || '';
      if (existing.status === 'waitlist' && existing.waitlist_position) {
        setMyPosition(existing.waitlist_position);
      }
    }
  }, [allRsvps, email]);

  // Debounced auto-save: persists comment to DB as user types, preventing loss on navigation/refresh
  useEffect(() => {
    if (!existingRsvp?.id) return;
    if (comment === lastSavedCommentRef.current) return;
    const timer = setTimeout(async () => {
      try {
        await leagueRsvpsApi.update(existingRsvp.id, {
          comment: comment.trim() || null,
        });
        lastSavedCommentRef.current = comment;
      } catch (err) {
        console.error('Comment auto-save failed:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [comment, existingRsvp]);

  const saveMutation = useMutation({
    mutationFn: async ({ finalStatus }) => {
      const cap = session?.player_cap || league?.player_cap;
      const yesCount = allRsvps.filter(r => r.status === 'yes' && r.player_email !== email).length;
      const actualStatus = finalStatus === 'yes' && cap && yesCount >= cap && league?.waitlist_enabled ? 'waitlist' : finalStatus;

      const data = {
        organization_id: league?.organization_id || authUser?.data?.organization_id || '',
        session_id: sessionId,
        league_id: session.league_id,
        player_email: email,
        player_name: name,
        player_id: authUser?.id || null,
        status: actualStatus,
        volunteering_set: finalStatus === 'yes' ? volunteeringSet : false,
        comment: comment.trim() || null,
        responded_at: new Date().toISOString(),
      };

      const result = existingRsvp
        ? await leagueRsvpsApi.update(existingRsvp.id, data)
        : await leagueRsvpsApi.create(data);

      // If waitlisted, recalculate positions and fetch the user's position
      if (actualStatus === 'waitlist') {
        try {
          await callAction('recalculateLeagueWaitlist', {
            session_id: sessionId,
            league_id: session.league_id,
          });
          const updated = await leagueRsvpsApi.filter({
            session_id: sessionId,
            player_email: email,
          });
          const myRsvp = updated.find(r => r.player_email === email);
          if (myRsvp?.waitlist_position) {
            setMyPosition(myRsvp.waitlist_position);
          }
        } catch (err) {
          console.error('Waitlist recalc failed:', err);
        }
      }

      return result;
    },
    onSuccess: () => setSubmitted(true),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!sessionId || !email) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-lg w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton fallbackPath="/app" />
            <div className="flex-1" />
          </div>
          <p className="text-slate-400 text-center py-8">Invalid RSVP link.</p>
        </div>
      </div>
    );
  }

  if (!session || !league) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-lg w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton fallbackPath="/app" />
            <div className="flex-1" />
          </div>
          <p className="text-slate-400 text-center py-8">Loading…</p>
        </div>
      </div>
    );
  }

  const yesRsvps = allRsvps.filter(r => r.status === 'yes');
  // Names only — never expose email/phone on public RSVP page
  const showAttendees = league.show_attendee_list && league.rsvp_list_public !== false;

  if (submitted) {
    const isYes = status === 'yes';
    const cap = session.player_cap || league.player_cap;
    const yesCount = allRsvps.filter(r => r.status === 'yes' && r.player_email !== email).length;
    const waitlisted = isYes && cap && yesCount >= cap && league.waitlist_enabled;

    return (
      <div className="min-h-screen bg-slate-50 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-lg w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton fallbackPath="/app" />
            <div className="flex-1" />
          </div>
        <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
          {isYes ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                {waitlisted
                  ? (myPosition ? `You're #${myPosition} on the waitlist!` : "You're on the waitlist!")
                  : "You're in!"}
              </h1>
              <p className="text-slate-500">
                {waitlisted
                  ? "The session is full, but you've been added to the waitlist. We'll let you know if a spot opens."
                  : `See you ${format(new Date(session.date + 'T12:00:00'), 'EEEE, MMMM d')}!`}
              </p>
              {volunteeringSet && <p className="text-sm text-blue-600 mt-2 font-medium">Thanks for volunteering to bring a set!</p>}
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">You're marked as not attending</h1>
              <p className="text-slate-500">Thanks for letting us know. See you next time!</p>
            </>
          )}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallbackPath="/app" />
          <div className="flex-1" />
        </div>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-heading font-bold text-slate-900 mb-1">{league.name}</h1>
          <div className="space-y-1.5 text-sm text-slate-600 mt-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              {format(new Date(session.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            </div>
            {(session.start_time || session.end_time) && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                {session.start_time}{session.end_time ? `–${session.end_time}` : ''}
              </div>
            )}
            {(session.location || league.location) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {session.location || league.location}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t text-sm text-slate-500">
            Hi <strong>{name}</strong>! Will you be joining us?
          </div>
        </div>

        {/* RSVP Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStatus('yes')}
              className={`py-4 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-2 ${status === 'yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <CheckCircle2 className="h-6 w-6" />
              Yes, I'll be there!
            </button>
            <button
              onClick={() => setStatus('no')}
              className={`py-4 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-2 ${status === 'no' ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <XCircle className="h-6 w-6" />
              Can't make it
            </button>
          </div>

          {status === 'yes' && league.set_volunteers_needed > 0 && (
            <>
              <button
                onClick={() => setVolunteeringSet(v => {
                  const next = !v;
                  if (next) {
                    toast({ title: '🎲 Thank you for volunteering!', description: 'Your generosity helps make this session possible.' });
                  }
                  return next;
                })}
                className={`w-full py-3 rounded-xl border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${volunteeringSet ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <Briefcase className="h-4 w-4" />
                {volunteeringSet ? '✓ Volunteering to bring a set' : 'I can volunteer a game set'}
              </button>
              {volunteeringSet && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm text-blue-700 font-semibold">Volunteer Confirmed</p>
                    <p className="text-xs text-blue-600">Thank you! Your set will be tracked for this session.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {status === 'yes' && league.rsvp_comments_enabled && (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Add a comment (optional)</label>
              <Textarea
                placeholder="Running 5 minutes late, bringing snacks, etc."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
              {existingRsvp?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={comment.trim() === lastSavedCommentRef.current?.trim() || savingComment}
                  onClick={async () => {
                    setSavingComment(true);
                    try {
                      await leagueRsvpsApi.update(existingRsvp.id, {
                        comment: comment.trim() || null,
                      });
                      lastSavedCommentRef.current = comment;
                      toast({ title: 'Comment saved!' });
                    } catch (err) {
                      toast({ title: 'Failed to save comment', variant: 'destructive' });
                    } finally {
                      setSavingComment(false);
                    }
                  }}
                >
                  {savingComment ? 'Saving…' : 'Save Comment'}
                </Button>
              )}
            </div>
          )}

          {status && (
            <Button
              className="w-full"
              onClick={() => saveMutation.mutate({ finalStatus: status })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Processing…' : (existingRsvp ? 'Update RSVP' : 'Submit RSVP')}
            </Button>
          )}
        </div>

        {/* Attendee list */}
        {showAttendees && yesRsvps.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Who's coming ({yesRsvps.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {yesRsvps.map(r => (
                <span key={r.id} className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold">{r.player_name?.[0]}</span>
                  {r.player_name}
                  {r.volunteering_set && <span className="text-xs">🎲</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}