import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { me as authMe, checkAuthenticated } from '@/services/authApi';
import { callAction } from '@/services/actions';
import { leagueMembers as leagueMembersApi, leagues as leaguesApi, shareInvites as shareInvitesApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, MapPin, Clock, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { leagueRequiresPayment, formatLeagueMembershipFee, startLeagueCheckout } from '@/lib/league-checkout';
import { consumeDiscoverReturn } from '@/lib/discover-navigation';
import { redirectToLogin } from '@/lib/capacitor-utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const discoverBackProps = {
  fallbackPath: '/app',
};

export default function LeagueJoin() {
  const params = new URLSearchParams(window.location.search);
  const leagueId = params.get('league');
  const refToken = params.get('ref');

  const [league, setLeague] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [existingMember, setExistingMember] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ playerName: '', playerEmail: '', playerPhone: '' });
  const navigate = useNavigate();

  // Redirect to My Leagues after successful registration (waitlisted players stay on the confirmation)
  useEffect(() => {
    if (!done) return;
    if (waitlistPosition) return;
    consumeDiscoverReturn();
    const timer = setTimeout(() => {
      navigate('/app/leagues', { replace: true });
      // Fallback: if SPA navigation doesn't trigger a fresh load, force it
      setTimeout(() => { window.location.href = '/app/leagues'; }, 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, [done, waitlistPosition, navigate]);

  // Track share token usage
  useEffect(() => {
    if (!refToken) return;
    shareInvitesApi.filter({ token: refToken })
      .then(invites => {
        if (invites[0]) shareInvitesApi.update(invites[0].id, { times_used: (invites[0].times_used || 0) + 1 });
      })
      .catch(() => {});
  }, [refToken]);

  // Check auth and pre-fill user info
  useEffect(() => {
    checkAuthenticated().then(async (authed) => {
      setAuthChecked(true);
      if (!authed) {
        const returnUrl = window.location.pathname + window.location.search;
        redirectToLogin(returnUrl);
        return;
      }
      try {
        const u = await authMe();
        setUser(u);
        setForm(f => ({
          ...f,
          playerName: u.full_name || '',
          playerEmail: u.email || '',
        }));
      } catch {}
    });
  }, []);

  // Fetch league details
  useEffect(() => {
    if (!leagueId) { setLoading(false); return; }
    leaguesApi.filter({ id: leagueId })
      .then(leagues => setLeague(leagues[0] || null))
      .finally(() => setLoading(false));
  }, [leagueId]);

  // Check if already a member
  useEffect(() => {
    if (!user?.email || !leagueId) return;
    leagueMembersApi.filter({ league_id: leagueId, player_email: user.email })
      .then(members => {
        if (members[0]) setExistingMember(members[0]);
      })
      .catch(() => {});
  }, [user?.email, leagueId]);

  // Auto-redirect existing active (non-pending, non-waitlisted) members to My Leagues
  useEffect(() => {
    if (!existingMember || existingMember.payment_status === 'pending' || existingMember.waitlist_position != null) return;
    const timer = setTimeout(() => {
      navigate('/app/leagues', { replace: true });
      setTimeout(() => { window.location.href = '/app/leagues'; }, 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, [existingMember, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.playerName || !form.playerEmail) { setError('Name and email are required.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const data = await callAction('leagueJoin', {
        leagueId,
        playerName: form.playerName,
        playerEmail: form.playerEmail,
        playerPhone: form.playerPhone,
      });
      if (data.error) throw new Error(data.error);

      // Already a member — handle like the backend says
      if (data.alreadyMember) {
        if (data.waitlisted) {
          setWaitlistPosition(data.position);
          setDone(true);
          return;
        }
        if (data.requiresPayment && data.memberId) {
          consumeDiscoverReturn();
          await startLeagueCheckout({ leagueId: data.leagueId, memberId: data.memberId, navigate });
          return;
        }
        setDone(true);
        return;
      }

      // Waitlisted at registration time (league roster full)
      if (data.waitlisted) {
        setWaitlistPosition(data.position);
        setDone(true);
        return;
      }

      // Gatekeeper: if payment required, redirect to Stripe checkout
      if (data.requiresPayment && data.memberId) {
        consumeDiscoverReturn();
        await startLeagueCheckout({ leagueId: data.leagueId, memberId: data.memberId, navigate });
        return;
      }

      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!existingMember) return;
    setSubmitting(true);
    try {
      await startLeagueCheckout({ leagueId, memberId: existingMember.id, navigate });
    } catch (err) {
      setError(err.message || 'Payment error. Please try again.');
      setSubmitting(false);
    }
  };

  // Loading state
  if (!authChecked || loading) return (
    <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton {...discoverBackProps} />
          <div className="flex-1" />
        </div>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );

  if (!leagueId || !league) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton {...discoverBackProps} />
            <div className="flex-1" />
          </div>
          <Card className="w-full">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-slate-500">League not found. Please check the link you were given.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (league.status !== 'active') return (
    <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton {...discoverBackProps} />
          <div className="flex-1" />
        </div>
      <Card className="w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-slate-500">This league is not currently accepting new members.</p>
        </CardContent>
      </Card>
      </div>
    </div>
  );

  // Already a member — show waitlist, "You're in!", or "Complete Payment"
  if (existingMember && !done) {
    const isPending = existingMember.payment_status === 'pending';
    const isWaitlisted = existingMember.waitlist_position != null;
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton {...discoverBackProps} />
            <div className="flex-1" />
          </div>
          <Card className="w-full">
            <CardContent className="pt-10 pb-10 text-center">
              {isWaitlisted ? (
                <>
                  <Clock className="h-14 w-14 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">
                    You're #{existingMember.waitlist_position} on the waitlist
                  </h2>
                  <p className="text-slate-500 text-sm">
                    <strong>{league.name}</strong> is currently full. You've been added to the waitlist and we'll
                    notify you if a spot opens up.
                  </p>
                </>
              ) : isPending ? (
                <>
                  <AlertCircle className="h-14 w-14 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">Payment Pending</h2>
                  <p className="text-slate-500 text-sm mb-6">
                    You've started joining <strong>{league.name}</strong> but your membership payment is still pending.
                    Complete your payment to activate your membership.
                  </p>
                  {leagueRequiresPayment(league) && (
                    <p className="text-sm font-semibold text-amber-700 mb-4">
                      {formatLeagueMembershipFee(league.membership_fee)} due
                    </p>
                  )}
                  <Button
                    className="w-full gap-2"
                    onClick={handleCompletePayment}
                    disabled={submitting}
                  >
                    <CreditCard className="h-4 w-4" />
                    {submitting ? 'Processing…' : `Complete Payment — ${formatLeagueMembershipFee(league.membership_fee)}`}
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">You're In!</h2>
                  <p className="text-slate-500 text-sm">You're a member of <strong>{league.name}</strong>. Redirecting to your leagues…</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state after registration
  if (done) return (
    <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton {...discoverBackProps} />
          <div className="flex-1" />
        </div>
      <Card className="w-full">
        <CardContent className="pt-10 pb-10 text-center">
          {waitlistPosition ? (
            <>
              <Clock className="h-14 w-14 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">
                You're #{waitlistPosition} on the waitlist
              </h2>
              <p className="text-slate-500 text-sm">
                <strong>{league.name}</strong> is currently full. You've been added to the waitlist and we'll
                notify you if a spot opens up.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">You're In!</h2>
              <p className="text-slate-500 text-sm">You've been added to <strong>{league.name}</strong>. Redirecting to your leagues…</p>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton {...discoverBackProps} />
          <div className="flex-1" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold text-slate-900 mb-1">{league.name}</h1>
          {league.description && <p className="text-slate-500 text-sm mt-2">{league.description}</p>}
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-slate-500">
            {league.day_of_week != null && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {DAY_NAMES[league.day_of_week]}s
              </span>
            )}
            {league.start_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {league.start_time}{league.end_time ? `–${league.end_time}` : ''}
              </span>
            )}
            {league.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {league.location}
              </span>
            )}
          </div>
        </div>

        {leagueRequiresPayment(league) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {league.membership_label || 'Membership fee required'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {formatLeagueMembershipFee(league.membership_fee)} — payment required to complete your registration.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join the League</CardTitle>
            <p className="text-sm text-slate-400">Fill in your details to be added to the roster. You'll get an email before each session to RSVP.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={form.playerName} onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))} placeholder="Your name" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.playerEmail}
                  onChange={e => setForm(f => ({ ...f, playerEmail: e.target.value }))}
                  placeholder="your@email.com"
                  readOnly={!!user?.email}
                  className={user?.email ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''}
                />
                {user?.email && (
                  <p className="text-xs text-slate-400 mt-1">Your account email is used for registration.</p>
                )}
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input type="tel" value={form.playerPhone} onChange={e => setForm(f => ({ ...f, playerPhone: e.target.value }))} placeholder="(555) 000-0000" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Processing…' : (leagueRequiresPayment(league)
                  ? `Continue to Payment — ${formatLeagueMembershipFee(league.membership_fee)}`
                  : 'Join League')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}