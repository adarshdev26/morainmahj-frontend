import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Calendar, MapPin, Users, Trophy, LogIn, UserPlus,
  ChevronRight, LayoutDashboard, ArrowRight, Search, Star, ScrollText, Sparkles
} from 'lucide-react';
import Logo from '@/components/Logo';
import NativeLandingHero from '@/components/landing/NativeLandingHero';
import { asArray } from '@/lib/ensure-array';
import { redirectToLogin, isCapacitorNative } from '@/lib/capacitor-utils';
import {
  getPostAuthDefaultPath,
  hasPendingNotificationOpen,
  notificationCenterPath,
  getPendingNotificationHighlightId,
} from '@/lib/notifications-center';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [search, setSearch] = useState('');

  // All hooks must come before any early returns.
  const { data: tournaments = [] } = useQuery({
    queryKey: ['public-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date' }),
    select: asArray,
    enabled: !isAuthenticated,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['public-players'],
    queryFn: () => registrationsApi.list({}, { sort: '-created_date', limit: 200 }),
    select: asArray,
    enabled: !isAuthenticated && search.trim().length > 1,
  });

  // Primary redirect: fires as soon as auth resolves to authenticated.
  // useEffect covers the case where auth resolves after the component mounts.
  useEffect(() => {
    if (isLoadingAuth) return;
    if (hasPendingNotificationOpen()) {
      navigate(notificationCenterPath(getPendingNotificationHighlightId()), { replace: true });
      return;
    }
    if (isAuthenticated) {
      navigate(getPostAuthDefaultPath(), { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, navigate]);

  // While auth is still resolving, show nothing — prevents any flash of the hero.
  if (isLoadingAuth) return null;

  // If authenticated, render nothing while the useEffect redirect fires.
  if (isAuthenticated) return null;

  // Guaranteed logged-out from this point.
  const showLoggedIn = false;

  const q = search.trim().toLowerCase();

  const filteredTournaments = q
    ? tournaments.filter(t =>
        t.name?.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q)
      )
    : tournaments;

  // Dedupe player names from registrations
  const matchedPlayers = q
    ? [...new Map(
        players
          .filter(r => r.player_name?.toLowerCase().includes(q))
          .map(r => [r.player_name?.toLowerCase(), r])
      ).values()].slice(0, 8)
    : [];

  const activeTournaments = filteredTournaments.filter(t =>
    t.status === 'active' || t.status === 'registration_open'
  );
  const upcomingTournaments = filteredTournaments.filter(t =>
    t.status === 'setup' || t.status === 'registration_closed'
  );

  const handleLogin = () => redirectToLogin('/app');
  const handleSignup = () => {
    if (isCapacitorNative()) {
      navigate('/native-login?mode=signup');
      return;
    }
    redirectToLogin('/player-signup');
  };
  const isNative = isCapacitorNative();

  return (
    <div
      className="min-h-screen bg-background font-body"
      style={{ paddingTop: isNative ? undefined : 'calc(60px + env(safe-area-inset-top))' }}
    >

      {/* ── NAV (web only — native uses full-screen hero CTAs) ── */}
      {!isNative && (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur safe-top">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo variant="icon" size="xs" className="text-foreground" theme="light" />
            <div className="flex flex-col leading-none">
              <span className="font-heading font-light tracking-widest uppercase text-base leading-none text-foreground">
                Morain Mahj
              </span>
              <span className="font-body font-light tracking-[0.1em] uppercase text-[9px] opacity-50 mt-0.5 text-foreground">
                Legacy game for modern players
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-3">

            {showLoggedIn ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user?.full_name}
                </span>
                <Button size="sm" onClick={() => navigate('/app')} className="gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" /> My Dashboard
                </Button>
                {user?.role === 'admin' && (
                  <Button size="sm" variant="outline" onClick={() => navigate('/admin')}>
                    Admin
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={handleLogin} className="gap-1.5">
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </Button>
                <Button size="sm" onClick={handleSignup} className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Sign Up
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      )}

      {/* ── HERO ── */}
      {isNative ? (
        <NativeLandingHero
          showLoggedIn={showLoggedIn}
          onLogin={handleLogin}
          onSignup={handleSignup}
          onDashboard={() => navigate('/app')}
        />
      ) : (
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        {/* decorative diamond grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
        <div className="relative max-w-6xl mx-auto px-5 py-20 text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" className="text-primary-foreground opacity-90" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold mb-4 text-primary-foreground">
            Your Game. Your Scores. Your Community.
          </h1>
          <p className="text-lg font-body font-light tracking-wide text-primary-foreground/70 mb-10 max-w-xl mx-auto">
            Register for tournaments, track your scores in real time, and see where you stand on the leaderboard — all in one place.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {showLoggedIn ? (
              <Button
                size="lg"
                onClick={() => navigate('/app')}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold"
              >
                Go to My Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={handleSignup}
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold"
                >
                  <UserPlus className="h-4 w-4" /> Join Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleLogin}
                  className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 gap-2"
                >
                  <LogIn className="h-4 w-4" /> Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
      )}

      {/* ── SEARCH ── */}
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tournaments or players…"
            className="pl-9 h-11 text-sm"
          />
        </div>
        {matchedPlayers.length > 0 && (
          <div className="mt-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1 font-medium uppercase tracking-wide">Players</p>
            {matchedPlayers.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border first:border-0">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{r.player_name}</span>
                {r.city_state && <span className="text-xs text-muted-foreground">{r.city_state}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── ACTIVE TOURNAMENTS ── */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-semibold text-foreground">
            {activeTournaments.length > 0 ? 'Active Tournaments' : 'Tournaments'}
          </h2>
        </div>

        {activeTournaments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} isAuthenticated={showLoggedIn} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No active tournaments right now</p>
            <p className="text-sm mt-1">Check back soon or sign up to be notified.</p>
          </div>
        )}

        {/* Upcoming */}
        {upcomingTournaments.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-heading font-medium text-foreground mb-4">Coming Up</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map(t => (
                <TournamentCard key={t.id} tournament={t} isAuthenticated={showLoggedIn} dimmed />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      {isNative ? (
        <section className="w-full bg-primary py-10 px-5">
          <h2 className="text-2xl font-heading font-semibold mb-8 text-primary-foreground">Get Playing in 3 Steps</h2>
          <div className="flex flex-col gap-0">
            {[
              { step: '1', title: 'Sign Up & Register', desc: 'Create a free account, find a tournament, and register — with online payment if required.' },
              { step: '2', title: 'Check In & Get Seated', desc: 'Scan your QR code on arrival. Your table and wind are assigned automatically for every round.' },
              { step: '3', title: 'Score & Climb the Board', desc: 'Enter your scores after each set. Watch the live leaderboard update the moment you submit.' },
            ].map(({ step, title, desc }, idx, arr) => (
              <div key={step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full border-2 border-amber-400 text-amber-400 flex items-center justify-center font-heading font-bold text-base shrink-0">
                    {step}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="w-px flex-1 bg-amber-400/30 my-1" style={{ minHeight: 32 }} />
                  )}
                </div>
                <div className="pb-8 flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-lg text-primary-foreground leading-tight">{title}</h3>
                  <p className="text-sm text-primary-foreground/65 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="py-14">
          <div className="max-w-6xl mx-auto px-5 text-center">
            <h2 className="text-2xl font-heading font-semibold mb-10">Get Playing in 3 Steps</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { step: '1', title: 'Sign Up & Register', desc: 'Create a free account, find a tournament, and register — with online payment if required.' },
                { step: '2', title: 'Check In & Get Seated', desc: 'Scan your QR code on arrival. Your table and wind are assigned automatically for every round.' },
                { step: '3', title: 'Score & Climb the Board', desc: 'Enter your scores after each set. Watch the live leaderboard update the moment you submit.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-lg">
                    {step}
                  </div>
                  <h3 className="font-heading font-semibold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES ── */}
      {isNative ? (
        <section className="w-full px-5 py-10 bg-background">
          <h2 className="text-2xl font-heading font-semibold mb-1 text-foreground">Everything You Need to Play</h2>
          <p className="text-muted-foreground text-sm mb-7">From sign-up to final scores — we handle the details so you can focus on your game.</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: UserPlus, title: 'Register & Check In', desc: 'Sign up, pay online, and check in on arrival — right from your phone.', accent: 'bg-primary/8' },
              { icon: MapPin, title: 'Auto Table & Wind', desc: 'Your table number and wind seat are assigned automatically each round.', accent: 'bg-secondary/40' },
              { icon: ScrollText, title: 'Track Every Score', desc: 'Enter set scores as you play. Your running total updates instantly.', accent: 'bg-muted' },
              { icon: Trophy, title: 'Live Leaderboard', desc: 'See the full standings update in real time after every round.', accent: 'bg-accent/30' },
            ].map(({ icon: Icon, title, desc, accent }) => (
              <div key={title} className={`relative rounded-2xl p-4 ${accent} flex flex-col gap-3 overflow-hidden`}>

                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground leading-snug mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-muted/40 border-y border-border py-14 overflow-hidden">
          <div className="max-w-6xl mx-auto px-5">
            <h2 className="text-2xl font-heading font-semibold text-center mb-2">Everything You Need to Play</h2>
            <p className="text-center text-muted-foreground text-sm mb-10">From sign-up to final scores — we handle the details so you can focus on your game.</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: UserPlus, title: 'Register & Check In', desc: 'Sign up, pay online, and check in on arrival — right from your phone.' },
                { icon: MapPin, title: 'Auto Table & Wind', desc: 'Your table number and wind seat are assigned automatically each round.' },
                { icon: ScrollText, title: 'Track Every Score', desc: 'Enter set scores as you play. Your running total updates instantly.' },
                { icon: Trophy, title: 'Live Leaderboard', desc: 'See the full standings update in real time after every round.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center text-center gap-3 p-5 bg-card rounded-xl border border-border">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FOOTER ── */}
      {!showLoggedIn && (
        isNative ? (
          <section className="w-full text-primary-foreground py-14 px-6 text-center" style={{ backgroundColor: '#1a2540' }}>
            <Star className="h-8 w-8 mx-auto mb-4 opacity-40" />
            <h2 className="text-2xl font-heading font-semibold mb-3">Ready to Join the Table?</h2>
            <p className="text-primary-foreground/60 mb-7 text-sm leading-relaxed">
              Create your free player account and start registering for tournaments, leagues, and classes in your area.
            </p>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={handleSignup}
                className="inline-flex items-center justify-center gap-2 bg-primary-foreground text-primary font-semibold text-sm py-2.5 px-8"
              >
                <UserPlus className="h-4 w-4" /> Create My Free Account
              </button>
              <Link
                to="/about"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/40 text-primary-foreground font-semibold text-sm py-2.5 px-8"
              >
                <Sparkles className="h-4 w-4" /> Learn About Morain Mahj
              </Link>
            </div>
            {/* <p className="text-xs text-primary-foreground/40 mt-5">
              By signing up you agree to our{' '}
              <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
            </p> */}
          </section>
        ) : (
          <section className="bg-primary text-primary-foreground py-14">
            <div className="max-w-xl mx-auto px-5 text-center">
              <Star className="h-8 w-8 mx-auto mb-4 opacity-60" />
              <h2 className="text-2xl font-heading font-semibold mb-3">Ready to Join the Table?</h2>
              <p className="text-primary-foreground/70 mb-7">
                Create your free player account and start registering for tournaments, leagues, and classes in your area.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={handleSignup}
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold"
                >
                  <UserPlus className="h-4 w-4" /> Create My Free Account
                </Button>
                <Button
                  size="lg"
                  asChild
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold"
                >
                  <Link to="/about"><Sparkles className="h-4 w-4" /> Learn About Morain Mahj</Link>
                </Button>
              </div>
              <p className="text-xs text-primary-foreground/50 mt-4">
                By signing up you agree to our{' '}
                <Link to="/terms" className="underline underline-offset-2 hover:text-primary-foreground transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-primary-foreground transition-colors">Privacy Policy</Link>.
              </p>
            </div>
          </section>
        )
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Morain Mahj LLC · Competitive Mah Jongg</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link to="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground transition-colors">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}

function TournamentCard({ tournament, isAuthenticated, dimmed = false }) {
  const navigate = useNavigate();

  const statusMap = {
    registration_open: { label: 'Registration Open', cls: 'bg-green-100 text-green-700 border-green-200' },
    active: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    setup: { label: 'Coming Soon', cls: 'bg-muted text-muted-foreground' },
    registration_closed: { label: 'Registration Closed', cls: 'bg-secondary text-secondary-foreground' },
  };
  const s = statusMap[tournament.status] || statusMap.setup;

  const isClickable =
    tournament.status === 'active' ||
    tournament.status === 'registration_open' ||
    tournament.status === 'setup' ||
    (tournament.status === 'registration_closed' && isAuthenticated);

  const handleClick = () => {
    if (!isClickable) return;
    navigate(isCapacitorNative() && isAuthenticated
      ? `/app/tournament-home/${tournament.id}`
      : `/tournament/${tournament.id}`
    );
  };

  return (
    <Card
      className={`transition-all overflow-hidden ${isClickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} ${dimmed && !isClickable ? 'opacity-70' : ''}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardContent className="pt-5 pb-4 px-4">
        {/* Badge on its own line so it never overflows */}
        <div className="mb-2">
          <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
        </div>
        <h3 className="font-heading font-semibold text-base leading-snug mb-3 line-clamp-2">
          {tournament.name}
        </h3>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {tournament.date && (
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{formatDate(tournament.date)}</span>
            </div>
          )}
          {tournament.location && (
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tournament.location}</span>
            </div>
          )}
          {tournament.num_rounds && (
            <div className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span>{tournament.num_rounds} Rounds</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs shrink-0">🎲</span>
            <span>{tournament.boutique_tiles_allowed ? 'Boutique & traditional' : 'Traditional only'}</span>
          </div>
        </div>

        {isClickable && (
          <div className="mt-4 flex items-center text-xs font-medium text-primary gap-1">
            View & Register <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}