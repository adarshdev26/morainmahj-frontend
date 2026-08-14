import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { me as authMe, checkAuthenticated } from '@/services/authApi';
import { registrations as registrationsApi, shareInvites as shareInvitesApi } from '@/services/resources';
import { redirectToLogin } from '@/lib/capacitor-utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, MapPin, Users, Trophy, DollarSign,
  Check, Instagram, Facebook, Twitter, ChevronLeft, Ticket, Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import NativeShareButton from '@/components/shared/NativeShareButton';
import GetDirectionsButton from '@/components/shared/GetDirectionsButton';
import CheckInButton from '@/components/tournament/CheckInButton';
import { fetchTournamentById } from '@/lib/tournament-registration';
import { navigateBackFromDetail } from '@/lib/discover-navigation';

export default function TournamentLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefetchedTournament =
    location.state?.tournament?.id === id ? location.state.tournament : undefined;
  const [copied, setCopied] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuthenticated().then(async (authed) => {
      setIsAuthenticated(authed);
      if (authed) {
        const user = await authMe();
        setCurrentUser(user);
      }
    });
  }, []);

  // Track share token usage
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) return;
    shareInvitesApi.filter({ token: ref })
      .then(invites => {
        if (invites[0]) shareInvitesApi.update(invites[0].id, { times_used: (invites[0].times_used || 0) + 1 });
      })
      .catch(() => {});
  }, []);

  const handleRegister = () => {
    if (myRegistration?.status === 'pending') {
      navigate('/app/my-tournaments');
      return;
    }
    const signupUrl = `/player-signup?tournament_id=${id}&from=app`;
    if (isAuthenticated) {
      navigate(signupUrl);
    } else {
      redirectToLogin(signupUrl);
    }
  };

  const handleBack = () => {
    const isInAppRoute = location.pathname.startsWith('/app/tournament-register/');
    if (isInAppRoute) {
      navigateBackFromDetail(navigate, location, '/app');
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament-landing', id],
    queryFn: () => fetchTournamentById(id),
    enabled: !!id,
    initialData: prefetchedTournament,
  });

  const isRegistrationOpen = tournament && tournament.status !== 'completed';

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations-tournament', id],
    queryFn: () => registrationsApi.filter({ tournament_id: id }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 px-6 text-center">
        <p className="text-muted-foreground">Tournament not found</p>
        <Button onClick={handleBack} variant="outline">Back</Button>
      </div>
    );
  }

  const confirmed = registrations.filter(r => r.status === 'confirmed').length;
  const waitlisted = registrations.filter(r => r.status === 'waitlisted').length;
  const pending = registrations.filter(r => r.status === 'pending').length;
  const totalRegistered = confirmed + pending;
  const spotsRemaining = tournament.player_cap ? tournament.player_cap - confirmed : null;
  const isAtCap = tournament.player_cap && confirmed >= tournament.player_cap;
  const hasWaitlist = tournament.waitlist_enabled && (isAtCap || waitlisted > 0);

  const myRegistration = currentUser
    ? registrations.find(r => r.player_id === currentUser.id || r.player_email === currentUser.email)
    : null;
  const isAlreadyRegistered = !!myRegistration;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform) => {
    const hashtagText = tournament.hashtag ? ` ${tournament.hashtag}` : '';
    const text = `Join the ${tournament.name}! ${tournament.location} on ${tournament.date}${hashtagText}`;
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      instagram: `https://www.instagram.com/`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };
    if (platform === 'instagram') {
      if (tournament.instagram_handle) {
        window.open(`https://www.instagram.com/${tournament.instagram_handle}/`, '_blank');
      }
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const statusLabel = {
    registration_open: 'Registration Open',
    registration_closed: 'Registration Closed',
    active: 'Live',
    completed: 'Completed',
    setup: 'Coming Soon',
  }[tournament.status] || tournament.status;

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* Native-style top header */}
      <div
        className="bg-primary text-primary-foreground px-4 pb-4 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-primary-foreground/60 text-xs">Tournament</p>
            <h1 className="font-heading font-bold text-lg leading-tight truncate">{tournament.name}</h1>
          </div>
          {tournament.status === 'active' && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-green-500 text-white px-2 py-1 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>

        {/* Quick info pills */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 text-xs bg-primary-foreground/15 text-primary-foreground px-2.5 py-1 rounded-full">
            <Calendar className="w-3 h-3" />
            {tournament.date ? new Date(tournament.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
          {tournament.location && (
            <span className="flex items-center gap-1 text-xs bg-primary-foreground/15 text-primary-foreground px-2.5 py-1 rounded-full max-w-[180px] truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{tournament.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-xs bg-primary-foreground/15 text-primary-foreground px-2.5 py-1 rounded-full">
            <Trophy className="w-3 h-3" />
            {tournament.num_rounds} Rounds
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-36">

        {/* Status + description */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={
              tournament.status === 'registration_open' ? 'bg-green-100 text-green-700 border-green-200' :
              tournament.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              tournament.status === 'completed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
              'bg-amber-100 text-amber-700 border-amber-200'
            }>
              {statusLabel}
            </Badge>
            {tournament.hashtag && (
              <span className="text-xs text-primary font-semibold">{tournament.hashtag}</span>
            )}
          </div>
          {tournament.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
          )}
        </div>

        {/* Registration stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Confirmed</span>
            </div>
            {tournament.rsvp_list_public !== false ? (
              <p className="text-3xl font-heading font-bold text-foreground">{confirmed}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic mt-1">Private</p>
            )}
            {tournament.rsvp_list_public !== false && tournament.player_cap && (
              <p className="text-xs text-muted-foreground mt-0.5">of {tournament.player_cap} spots</p>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">
                {isAtCap ? 'Waitlisted' : 'Spots Left'}
              </span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">
              {isAtCap
                ? (hasWaitlist ? waitlisted : '0')
                : (spotsRemaining !== null ? Math.max(0, spotsRemaining) : '∞')}
            </p>
            {isAtCap && hasWaitlist && (
              <p className="text-xs text-amber-600 mt-0.5">waitlist open</p>
            )}
          </div>
        </div>

        {/* Tournament Details */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground mb-1">Details</p>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium text-foreground">{formatDate(tournament.date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium text-foreground">{tournament.location}</p>
              {tournament.location && (
                <GetDirectionsButton address={tournament.location} className="mt-1.5 h-7 text-xs" />
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Trophy className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Format</p>
              <p className="text-sm font-medium text-foreground">{tournament.num_rounds} Rounds</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-sm mt-0.5">🎲</span>
            <div>
              <p className="text-xs text-muted-foreground">Tiles</p>
              <p className="text-sm font-medium text-foreground">
                {tournament.boutique_tiles_allowed ? 'Boutique & traditional' : 'Traditional only'}
              </p>
            </div>
          </div>

          {tournament.flights && tournament.flights.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Flights</p>
                <p className="text-sm font-medium text-foreground">{tournament.flights.join(', ')}</p>
              </div>
            </div>
          )}

          {tournament.payment_model !== 'none' && (
            <div className="flex items-start gap-3 pt-3 border-t border-border">
              <DollarSign className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Entry Cost</p>
                <p className="text-sm font-medium text-foreground">
                  {tournament.payment_model === 'all_in' && tournament.entry_fee
                    ? `$${(tournament.entry_fee / 100).toFixed(2)}`
                    : tournament.payment_model === 'app_fee_only' && tournament.app_fee
                    ? `$${(tournament.app_fee / 100).toFixed(2)} app fee`
                    : 'Contact organizer'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Registration Window */}
        {(tournament.registration_open_date || tournament.registration_close_date) && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground mb-1">Registration Window</p>
            {tournament.registration_open_date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opens</span>
                <span className="font-medium text-foreground">{formatDate(tournament.registration_open_date)}</span>
              </div>
            )}
            {tournament.registration_close_date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Closes</span>
                <span className="font-medium text-foreground">{formatDate(tournament.registration_close_date)}</span>
              </div>
            )}
          </div>
        )}

        {/* Share Section */}
        {tournament.sharing_enabled && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Share Tournament</p>
            <NativeShareButton
              title={tournament.name}
              text={`Join the ${tournament.name}! ${tournament.location} on ${tournament.date}${tournament.hashtag ? ' ' + tournament.hashtag : ''}`}
              url={shareUrl}
              label="Share with friends"
              className="w-full"
            />
            {(tournament.instagram_handle || tournament.facebook_handle || tournament.twitter_handle) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tournament.instagram_handle && (
                  <Button size="sm" variant="outline" onClick={() => handleShare('instagram')} className="gap-1 text-xs">
                    <Instagram className="h-3 w-3" /> Instagram
                  </Button>
                )}
                {tournament.facebook_handle && (
                  <Button size="sm" variant="outline" onClick={() => handleShare('facebook')} className="gap-1 text-xs">
                    <Facebook className="h-3 w-3" /> Facebook
                  </Button>
                )}
                {tournament.twitter_handle && (
                  <Button size="sm" variant="outline" onClick={() => handleShare('twitter')} className="gap-1 text-xs">
                    <Twitter className="h-3 w-3" /> X
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 space-y-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        {isAlreadyRegistered ? (
          <>
            {myRegistration.status === 'pending' && (
              <Button
                onClick={() => navigate('/app/my-tournaments')}
                className="w-full gap-2 bg-primary text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                Complete Registration
              </Button>
            )}
            {myRegistration.status === 'confirmed' && (
              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/app/invites')}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4" />
                  You're Registered ✓
                </Button>
                <CheckInButton tournament={tournament} registration={myRegistration} />
              </div>
            )}
            {myRegistration.status === 'waitlisted' && (
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-sm font-medium text-foreground">You're on the waitlist</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Position #{myRegistration.waitlist_position || '—'} · We'll notify you if a spot opens.
                </p>
              </div>
            )}
            {myRegistration.status === 'declined' && (
              <Button
                onClick={() => navigate(`/player-signup?tournament_id=${id}&from=app`)}
                className="w-full gap-2"
              >
                <Users className="h-4 w-4" /> Re-register
              </Button>
            )}
          </>
        ) : isRegistrationOpen ? (
          isAtCap && hasWaitlist ? (
            <Button
              onClick={() => navigate(`/player-signup?tournament_id=${id}&from=app`)}
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Ticket className="h-4 w-4" /> Join Waitlist
            </Button>
          ) : (
            <Button onClick={handleRegister} className="w-full gap-2">
              <Users className="h-4 w-4" /> Register for This Tournament
            </Button>
          )
        ) : (
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-sm text-muted-foreground">Registration is closed for this tournament.</p>
          </div>
        )}
      </div>
    </div>
  );
}