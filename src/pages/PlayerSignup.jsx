import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { me as authMe, updateMe, checkAuthenticated, logout } from '@/services/authApi';
import { callAction } from '@/services/actions';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { redirectToLogin } from '@/lib/capacitor-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, MapPin, Trophy, LogOut, CheckCircle, User, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function PlayerSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tournamentId = searchParams.get('tournament_id');

  // Determine where "back" should go — prefer in-app if coming from there
  const fromApp = document.referrer.includes('/app/') || searchParams.get('from') === 'app';
  const backUrl = tournamentId
    ? (fromApp ? `/app/tournament-home/${tournamentId}` : `/tournament/${tournamentId}`)
    : '/app';

  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [existingReg, setExistingReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [doneStatus, setDoneStatus] = useState(null);
  const [bringingSet, setBringingSet] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city_state: '',
    opt_in_text_messaging: false,
  });

  // A profile is "complete" if the user has a name and phone on file
  const profileIsComplete = user && user.full_name && (user.phone || user.city_state);

  useEffect(() => {
    const init = async () => {
      try {
        const authed = await checkAuthenticated();
        setIsAuthenticated(authed);

        if (authed) {
          const currentUser = await authMe();
          if (currentUser) {
            setUser(currentUser);
            setFormData({
              full_name: currentUser.full_name || '',
              phone: currentUser.phone || '',
              city_state: currentUser.city_state || '',
              opt_in_text_messaging: currentUser.opt_in_text_messaging || false,
            });
          }

          if (tournamentId && currentUser) {
            const regs = await registrationsApi.filter({ tournament_id: tournamentId });
            const myReg = regs.find(r => r.player_id === currentUser.id || r.player_email === currentUser.email);
            setExistingReg(myReg || null);
          }
        }

        if (tournamentId) {
          const tournaments = await tournamentsApi.filter({ id: tournamentId });
          setTournament(tournaments[0] || null);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [tournamentId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Called when user submits profile form (new/incomplete profile path)
  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) {
      alert('Please enter your full name');
      return;
    }
    setSaving(true);
    try {
      await updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        city_state: formData.city_state,
        opt_in_text_messaging: formData.opt_in_text_messaging,
      });
      // Refresh user so profileIsComplete re-evaluates
      const updated = await authMe();
      setUser(updated);

      if (tournamentId) {
        await doRegister(updated);
      } else {
        navigate('/app/invites');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Called when user confirms registration (complete profile path)
  const handleConfirmRegistration = async () => {
    setSaving(true);
    try {
      await doRegister(user);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const doRegister = async (currentUser) => {
    // Link player_id to any email-based registrations
    const emailRegs = await registrationsApi.filter({ player_email: currentUser.email });
    for (const r of emailRegs) {
      if (!r.player_id || r.player_id !== currentUser.id) {
        await registrationsApi.update(r.id, {
          player_id: currentUser.id,
          player_name: formData.full_name || currentUser.full_name || currentUser.email,
        });
      }
    }

    const existing = emailRegs.find(r => r.tournament_id === tournamentId);
    if (existing) {
      setDoneStatus(existing.status === 'waitlisted' ? 'waitlisted' : existing.status === 'confirmed' ? 'confirmed' : 'already_registered');
    } else {
      const res = await callAction('selfRegister', { tournament_id: tournamentId, bringing_set: bringingSet });
      setDoneStatus(res?.already_registered ? 'already_registered' : res?.status);
    }
    setDone(true);
    setTimeout(() => navigate('/app/my-tournaments'), 3000);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading">
              {tournament ? `Join ${tournament.name}` : 'Join a Tournament'}
            </CardTitle>
            <CardDescription>Sign in to register for this tournament</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament && (
              <div className="bg-muted rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{tournament.date ? format(new Date(tournament.date), 'MMMM d, yyyy') : '—'}</span>
                </div>
                {tournament.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.location}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Sign in or create a free account to complete your registration.
            </p>
            <Button onClick={() => redirectToLogin(window.location.pathname + window.location.search)} className="w-full">
              Sign In or Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Trophy className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-heading font-bold">
              {doneStatus === 'confirmed' ? "You're Confirmed!" :
               doneStatus === 'already_registered' ? 'Already Registered!' :
               doneStatus === 'waitlisted' ? 'You\'re on the Waitlist!' :
               'Registration Submitted!'}
            </h2>
            {doneStatus === 'waitlisted' ? (
              <p className="text-muted-foreground">You've been added to the <strong>waitlist</strong> for <strong>{tournament?.name}</strong>. We'll notify you if a spot opens up.</p>
            ) : doneStatus === 'confirmed' ? (
              <p className="text-muted-foreground">Your spot is confirmed for <strong>{tournament?.name}</strong>. See you there!</p>
            ) : doneStatus === 'already_registered' ? (
              <p className="text-muted-foreground">You're already registered for <strong>{tournament?.name}</strong>.</p>
            ) : (
              <p className="text-muted-foreground">Your registration for <strong>{tournament?.name}</strong> has been submitted. The director will confirm your spot soon.</p>
            )}
            <Button onClick={() => navigate('/app/invites')} className="w-full mt-2">
              View My Invites
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Signed in + complete profile → Confirm Registration ───────────────────
  if (profileIsComplete && tournamentId) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-md mx-auto">

          {/* Back button */}
          {tournamentId && (
            <button
              onClick={() => navigate(backUrl)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Tournament
            </button>
          )}

          {/* Signed-in-as banner */}
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-muted border border-border text-sm">
            <span className="text-muted-foreground truncate">Signed in as <strong className="text-foreground">{user.email}</strong></span>
            <button
              onClick={() => logout(window.location.href)}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" /> Not you?
            </button>
          </div>

          {/* Tournament info */}
          {tournament && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Registering for</span>
              </div>
              <h2 className="font-heading font-bold text-lg">{tournament.name}</h2>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                {tournament.date && (
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(tournament.date), 'MMM d, yyyy')}</span>
                )}
                {tournament.location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tournament.location}</span>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-3xl font-heading font-bold">Confirm Registration</h1>
            <p className="text-muted-foreground mt-1">Your profile is on file. Just confirm to register.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Profile summary */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user.full_name}</p>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                  {user.city_state && <p className="text-xs text-muted-foreground">{user.city_state}</p>}
                </div>
                <button
                  onClick={() => setUser(prev => ({ ...prev, full_name: '' }))} // force profile form
                  className="ml-auto text-xs text-primary hover:underline shrink-0"
                >
                  Edit
                </button>
              </div>

              {tournament?.borrowed_sets_enabled && (
                <div className="flex items-start gap-2 pt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Checkbox
                    id="bringing_set"
                    checked={bringingSet}
                    onCheckedChange={setBringingSet}
                    className="mt-0.5"
                  />
                  <Label htmlFor="bringing_set" className="text-sm font-normal cursor-pointer leading-snug">
                    I can bring a game set to this tournament
                    {tournament.borrowed_sets_needed ? (
                      <span className="block text-xs text-amber-700 mt-0.5">{tournament.borrowed_sets_needed} set{tournament.borrowed_sets_needed !== 1 ? 's' : ''} needed for this event</span>
                    ) : null}
                  </Label>
                </div>
              )}

              <Button onClick={handleConfirmRegistration} disabled={saving} className="w-full mt-2 gap-2">
                <CheckCircle className="h-4 w-4" />
                {saving ? 'Registering...' : 'Confirm Registration'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Signed in + incomplete profile → Profile form ─────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-md mx-auto">

        {/* Back button */}
        {tournamentId && (
          <button
            onClick={() => navigate(backUrl)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Tournament
          </button>
        )}

        {/* Signed-in-as banner */}
        {user && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-muted border border-border text-sm">
            <span className="text-muted-foreground truncate">Signed in as <strong className="text-foreground">{user.email}</strong></span>
            <button
              onClick={() => logout(window.location.href)}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" /> Not you?
            </button>
          </div>
        )}

        {tournament && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Signing up for</span>
            </div>
            <h2 className="font-heading font-bold text-lg">{tournament.name}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {tournament.date && (
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(tournament.date), 'MMM d, yyyy')}</span>
              )}
              {tournament.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tournament.location}</span>
              )}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold">
            {tournament ? 'Complete Your Profile' : 'Create Your Profile'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {tournament ? 'Fill in your details to register for this tournament.' : 'Set up your player profile to receive tournament invitations.'}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name" name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Your full name"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone" name="phone" type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="city_state">City &amp; State</Label>
              <Input
                id="city_state" name="city_state"
                value={formData.city_state}
                onChange={handleInputChange}
                placeholder="Chicago, IL"
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="opt_in_text_messaging"
                checked={formData.opt_in_text_messaging}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, opt_in_text_messaging: checked }))}
              />
              <Label htmlFor="opt_in_text_messaging" className="text-sm font-normal cursor-pointer">
                I'd like to receive text message updates about tournaments
              </Label>
            </div>

            {tournament?.borrowed_sets_enabled && (
              <div className="flex items-start gap-2 pt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="bringing_set"
                  checked={bringingSet}
                  onCheckedChange={setBringingSet}
                  className="mt-0.5"
                />
                <Label htmlFor="bringing_set" className="text-sm font-normal cursor-pointer leading-snug">
                  I can bring a game set to this tournament
                  {tournament.borrowed_sets_needed ? (
                    <span className="block text-xs text-amber-700 mt-0.5">{tournament.borrowed_sets_needed} set{tournament.borrowed_sets_needed !== 1 ? 's' : ''} needed for this event</span>
                  ) : null}
                </Label>
              </div>
            )}

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full mt-6">
              {saving ? 'Registering...' : tournament ? 'Save & Register' : 'Create Profile'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}