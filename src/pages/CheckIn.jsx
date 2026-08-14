import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { me as authMe } from '@/services/authApi';
import { callAction } from '@/services/actions';
import { tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader, QrCode, User, ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { invalidateAfterCheckIn } from '@/lib/tournament-registration';
import { isTournamentCheckInAllowed } from '@/lib/tournament-status';
import BackButton from '@/components/shared/BackButton';
import { getPostAuthDefaultPath } from '@/lib/notifications-center';

export default function CheckIn() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);

  const { data: tournament } = useQuery({
    queryKey: ['checkin-page-tournament', params?.tournamentId],
    queryFn: () =>
      tournamentsApi.filter({ id: params.tournamentId }).then(r => r[0]),
    enabled: !!params?.tournamentId,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setParams({
      sessionId: searchParams.get('sessionId'),
      leagueId: searchParams.get('leagueId'),
      tournamentId: searchParams.get('tournamentId'),
    });
    
    // Get current user - auto-fill email if logged in
    authMe().then(u => {
      setUser(u);
      if (u) setEmail(u.email);
    });
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Enter your email', variant: 'destructive' });
      return;
    }

    if (params.tournamentId && tournament && !isTournamentCheckInAllowed(tournament)) {
      const msg = 'Check-in is only available while the tournament is active';
      setStatus('error');
      setResult({ error: msg });
      toast({ title: 'Check-in unavailable', description: msg, variant: 'destructive' });
      return;
    }

    setLoading(true);
    setStatus('loading');
    try {
      const data = await callAction('qrCheckIn', {
        sessionId: params.sessionId,
        leagueId: params.leagueId,
        tournamentId: params.tournamentId,
        playerEmail: email.toLowerCase(),
      });

      setResult(data);
      setStatus('success');
      setEmail('');
      if (params.tournamentId) {
        await invalidateAfterCheckIn(queryClient, params.tournamentId);
      }
      toast({ title: `✓ Checked in: ${data.playerName}` });
    } catch (err) {
      setStatus('error');
      setResult({ error: err.response?.data?.error || err.message });
      toast({ title: 'Check-in failed', description: err.response?.data?.error || err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!params) return <div className="flex items-center justify-center min-h-screen"><Loader className="h-8 w-8 animate-spin text-slate-400" /></div>;

  if (!params.tournamentId && !params.leagueId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="w-full max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton to={getPostAuthDefaultPath()} />
            <div className="flex-1" />
          </div>
        <Card className="w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">No Event Found</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              This check-in link requires a QR code from your event organizer. Please scan the QR code displayed at your tournament or league session.
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  const isLeague = !!params.leagueId;
  const eventType = isLeague ? 'League Session' : 'Tournament';
  const tournamentCheckInBlocked =
    !!params.tournamentId && tournament && !isTournamentCheckInAllowed(tournament);

  const goToHome = () => {
    navigate(getPostAuthDefaultPath(), { replace: true });
  };

  if (status === 'success' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="pt-6 pb-8">
            <Button
              type="button"
              variant="ghost"
              onClick={goToHome}
              className="w-full justify-start gap-1 px-0 h-auto py-2 mb-4 text-slate-600 hover:text-slate-900 hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>

            <div className="p-6 bg-green-50 border-2 border-green-300 rounded-xl text-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-green-900 mb-1">You&apos;re checked in</h1>
              <p className="font-semibold text-green-800">{result.playerName}</p>
              <p className="text-sm text-green-600 mt-2">{eventType}</p>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500 mb-4">Next player can scan now →</p>
              <Button
                onClick={() => {
                  setStatus('idle');
                  setResult(null);
                }}
                variant="outline"
                className="w-full"
              >
                Check In Another Player
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton to={getPostAuthDefaultPath()} />
          <div className="flex-1" />
        </div>
      <Card className="w-full shadow-lg">
        <CardContent className="pt-8 pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Check In</h1>
            <p className="text-sm text-slate-500 mt-1">{eventType} Self Check-In</p>
          </div>

          {/* Error state */}
          {status === 'error' && result && (
            <div className="mb-8 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">{result.error}</p>
                  <p className="text-xs text-red-600 mt-1">Check your email and try again</p>
                </div>
              </div>
            </div>
          )}

          {tournamentCheckInBlocked && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-sm font-medium text-amber-900">Check-in is not open yet</p>
              <p className="text-xs text-amber-700 mt-1 capitalize">
                Tournament status: {tournament.status.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          {/* Form */}
          {(status === 'idle' || status === 'error') && !tournamentCheckInBlocked && (
            <form onSubmit={handleCheckIn} className="space-y-4">
              {/* Authenticated user badge */}
              {user && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Signed in as: {user.email}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                  Your Email
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="text-center text-base"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Check In
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Help text */}
          <div className="mt-8 p-4 bg-slate-100 rounded-lg text-center">
            <p className="text-xs text-slate-600">
              <strong>Having trouble?</strong> Make sure you're using the email address from your registration.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}