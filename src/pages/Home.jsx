import React, { useEffect, useState, useMemo } from 'react';
import { callAction } from '@/services/actions';
import { registrations as registrationsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, ChevronRight, Trophy, Clock, CheckCircle, CheckCircle2, Trophy as TrophyIcon,
  AlertCircle, LogOut, BarChart2, Home as HomeIcon, Users, Search, BookOpen, ClipboardList
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import Logo from '@/components/Logo';
import DiscoverSheet from '@/components/discover/DiscoverSheet';
import { useDiscoverReopen } from '@/lib/discover-navigation';
import CheckInButton from '@/components/tournament/CheckInButton';
import { asArray } from '@/lib/ensure-array';
import { useAuth } from '@/lib/AuthContext';
import {
  EVENT_STATUS,
  getEventBadgeKey,
  getEventDisplayStatus,
  getHomeSection,
  isEventLive,
} from '@/lib/tournament-status';
import {
  navigateToTournamentCard,
  fetchTournamentsByIds,
  mergePlayerRegistrations,
  PLAYER_LIST_STALE_MS,
} from '@/lib/tournament-registration';
import { useHomeUpcomingEvents } from '@/hooks/useHomeUpcomingEvents';
import UpcomingEventCard from '@/components/home/UpcomingEventCard';

const STATUS_CONFIG = {
  live:       { label: 'Live',       color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  checked_in: { label: 'Checked In', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  pending:    { label: 'Invited',    color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: AlertCircle },
  confirmed:  { label: 'Confirmed',  color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  completed:  { label: 'Completed',  color: 'bg-slate-100 text-slate-600 border-slate-200',  icon: TrophyIcon },
  waitlisted: { label: 'Waitlisted', color: 'bg-slate-100 text-slate-600 border-slate-200',  icon: Clock },
  declined:   { label: 'Declined',   color: 'bg-red-100 text-red-600 border-red-200',        icon: AlertCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-600 border-red-200',        icon: AlertCircle },
};

const DOT_COLOR_BY_STATUS = {
  [EVENT_STATUS.LIVE]: 'bg-green-500',
  [EVENT_STATUS.UPCOMING]: 'bg-blue-500',
  [EVENT_STATUS.COMPLETED]: 'bg-slate-400',
  [EVENT_STATUS.CANCELLED]: 'bg-red-400',
  [EVENT_STATUS.DECLINED]: 'bg-red-400',
};

// Matches Checked In card styling — green bg, text, and border
const LIVE_BADGE_CLASS =
  'flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full';
const LIVE_PULSE_DOT_CLASS = 'w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block';

function ProfileAvatar({ user, onClick }) {
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (user?.photo_url) {
    return (
      <button onClick={onClick} className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary-foreground/30 shrink-0">
        <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
      </button>
    );
  }
  if (user?.profile_emoji) {
    return (
      <button onClick={onClick} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl shrink-0">
        {user.profile_emoji}
      </button>
    );
  }
  return (
    <button onClick={onClick} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold shrink-0">
      {initials}
    </button>
  );
}

function TournamentCard({ reg, tournament: t, onClick, isFeatured = false, isLiveNowSection = false }) {
  const eventStatus = getEventDisplayStatus(t, reg);
  const badgeKey = getEventBadgeKey(t, reg);
  const statusCfg = STATUS_CONFIG[badgeKey] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const dotColor = DOT_COLOR_BY_STATUS[eventStatus] || 'bg-slate-400';
  const showLiveBadge = isLiveNowSection
    ? t?.status === 'active'
    : isEventLive(t, reg) && badgeKey !== 'checked_in';
  const showStatusBadge = isLiveNowSection
    ? badgeKey === 'checked_in' || !showLiveBadge
    : !showLiveBadge;

  // Card is a clickable div (not <button>) so the inner Check-In <button>
  // is valid HTML. Enter / Space still activate the card for a11y.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  if (isFeatured) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="w-full text-left bg-primary text-primary-foreground rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-all shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-foreground/40"
      >
        <div className="w-1.5 self-stretch rounded-full bg-primary-foreground/30" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {showLiveBadge && (
              <span className={LIVE_BADGE_CLASS}>
                <span className={LIVE_PULSE_DOT_CLASS} />
                LIVE NOW
              </span>
            )}
            {showStatusBadge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color} flex items-center gap-1`}>
                <StatusIcon className="w-3 h-3" />{statusCfg.label}
              </span>
            )}
          </div>
          <p className="font-heading font-bold text-xl leading-tight truncate">{t.name}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-sm text-primary-foreground/80 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {t.date ? format(new Date(t.date), 'MMM d, yyyy') : '—'}
            </span>
            {t.location && (
              <span className="text-sm text-primary-foreground/80 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{t.location}
              </span>
            )}
          </div>
          <div className="mt-3">
            <CheckInButton tournament={t} registration={reg} variant="card" />
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-primary-foreground/70 shrink-0" />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className={`w-1 self-stretch rounded-full ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {showLiveBadge && (
            <span className={LIVE_BADGE_CLASS}>
              <span className={LIVE_PULSE_DOT_CLASS} />
              LIVE
            </span>
          )}
          {showStatusBadge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />{statusCfg.label}
            </span>
          )}
        </div>
        <p className="font-semibold text-foreground text-base leading-tight truncate">{t.name}</p>
        <div className="flex flex-wrap gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {t.date ? format(new Date(t.date), 'MMM d, yyyy') : '—'}
          </span>
          {t.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />{t.location}
            </span>
          )}
        </div>
        <div className="mt-2">
          <CheckInButton tournament={t} registration={reg} variant="card" />
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
    </div>
  );
}

function SectionHeader({ title }) {
  return <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2 mt-6">{title}</p>;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showDiscover, setShowDiscover] = useState(false);

  useDiscoverReopen(setShowDiscover);

  const { data: regsByEmail = [] } = useQuery({
    queryKey: ['regs-by-email', user?.email],
    queryFn: () => registrationsApi.filter({ player_email: user.email }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.email,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const { data: regsByPlayerId = [] } = useQuery({
    queryKey: ['regs-by-pid', user?.id],
    queryFn: () => registrationsApi.filter({ player_id: user.id }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.id,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const registrations = useMemo(
    () => mergePlayerRegistrations(regsByEmail, regsByPlayerId),
    [regsByEmail, regsByPlayerId],
  );

  const tournamentIdsKey = useMemo(
    () => [...new Set(registrations.map((r) => r.tournament_id).filter(Boolean))].sort().join(','),
    [registrations],
  );

  const { data: tournaments = [] } = useQuery({
    queryKey: ['my-tournaments-by-id', tournamentIdsKey],
    queryFn: () => fetchTournamentsByIds(tournamentIdsKey.split(',').filter(Boolean)),
    enabled: tournamentIdsKey.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const myTournaments = useMemo(() => {
    // Deduplicate by tournament ID (keep first registration per tournament)
    const seenTournaments = new Map();
    registrations.forEach(reg => {
      if (!seenTournaments.has(reg.tournament_id)) {
        const t = tournaments.find(tournament => tournament.id === reg.tournament_id);
        if (t) {
          seenTournaments.set(reg.tournament_id, { reg, tournament: t });
        }
      }
    });
    return Array.from(seenTournaments.values());
  }, [registrations, tournaments]);

  const tournamentSections = useMemo(() => {
    const sections = { live: [], upcoming: [], past: [], inactive: [] };
    myTournaments.forEach((item) => {
      const section = getHomeSection(getEventDisplayStatus(item.tournament, item.reg));
      sections[section].push(item);
    });
    const byDateAsc = (a, b) => new Date(a.tournament.date) - new Date(b.tournament.date);
    const byDateDesc = (a, b) => new Date(b.tournament.date) - new Date(a.tournament.date);
    sections.live.sort(byDateAsc);
    sections.upcoming.sort(byDateAsc);
    sections.past.sort(byDateDesc);
    sections.inactive.sort(byDateDesc);
    return sections;
  }, [myTournaments]);

  const { live: activeTournaments, upcoming: upcomingTournaments, past: pastTournaments, inactive: inactiveTournaments } = tournamentSections;

  // Next upcoming event for hero card (exclude inactive registrations)
  const nextEvent = useMemo(() => {
    if (activeTournaments.length > 0) return activeTournaments[0];
    const future = upcomingTournaments.filter(({ tournament: t }) => {
      try { return isAfter(new Date(t.date), new Date()); } catch { return true; }
    });
    return future.length > 0 ? future[future.length - 1] : upcomingTournaments[0] || null;
  }, [activeTournaments, upcomingTournaments]);

  const goToTournament = (tournament, reg) => {
    // Invited/pending tournaments should open the Tournaments tab list so
    // players continue the "Pay & Confirm" flow from there.
    if (reg?.status === 'pending') {
      navigate('/app/my-tournaments');
      return;
    }
    navigateToTournamentCard(navigate, tournament, reg, '/app');
  };

  const { upcomingLeagues, enrolledClasses, upcomingClasses, invitedClasses, upcomingOther } = useHomeUpcomingEvents(user);

  const goToLeagueEvent = () => {
    navigate('/app/leagues');
  };

  const goToClassEvent = () => {
    navigate('/app/courses');
  };

  // Local fallback in case backend is unreachable
  const DEMO_FALLBACK = {
    id: '6a16c452011ad529c4e829ee',
    name: 'Welcome to Morain Mahj — Demo Tournament',
    date: '2026-08-15',
    location: 'Morain Community Center, Keller TX',
    status: 'registration_open',
    num_rounds: 4,
    is_demo: true,
  };

  const { data: demoData, isError: demoError } = useQuery({
    queryKey: ['demo-tournament', user?.id],
    queryFn: async () => {
      const res = await callAction('getDemoTournamentForUser', {});
      return res?.tournament || null;
    },
    enabled: !!user?.id,
    staleTime: PLAYER_LIST_STALE_MS,
    retry: 1,
  });

  // Show demo tournament from backend; if backend errors and user has no registrations, show fallback
  const hasRealRegistrations = registrations.filter(r => !r.is_demo && r.status === 'confirmed').length > 0;
  const demoTournament = demoData || (demoError && !hasRealRegistrations ? DEMO_FALLBACK : null);

  return (
    <div className="flex flex-col h-full bg-background native-app-shell">
      {showDiscover && <DiscoverSheet onClose={() => setShowDiscover(false)} />}

      {/* Top Header */}
      <div className="bg-primary text-primary-foreground px-5 pb-5 pt-3 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
        <div className="flex items-center justify-between mb-4">
          <Logo size="sm" variant="icon" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/stats')}
              className="p-2.5 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              title="My Stats"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/app/hand-log')}
              className="p-2.5 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              title="Hand Tracker"
            >
              <ClipboardList className="w-5 h-5" />
            </button>
            <ProfileAvatar user={user} onClick={() => navigate('/app/profile')} />
            <button
              onClick={() => logout()}
              className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-primary-foreground/70 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-heading font-bold">{user?.full_name?.split(' ')[0] || 'Player'}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 native-app-scroll">

        {/* Next Up hero card - only show if not already in a section below */}
        {nextEvent && !activeTournaments.find(t => t.tournament.id === nextEvent.tournament.id) && !upcomingTournaments.find(t => t.tournament.id === nextEvent.tournament.id) && (
          <div className="mt-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2">
              📅 Next Up
            </p>
            <button
              onClick={() => goToTournament(nextEvent.tournament, nextEvent.reg)}
              className="w-full text-left bg-card border border-border rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-xl leading-tight truncate">{nextEvent.tournament.name}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-muted-foreground">
                    <span className="text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {nextEvent.tournament.date ? format(new Date(nextEvent.tournament.date), 'MMM d, yyyy') : '—'}
                    </span>
                    {nextEvent.tournament.location && (
                      <span className="text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />{nextEvent.tournament.location}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground/50 shrink-0 mt-1" />
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground">Tap to open tournament dashboard →</span>
              </div>
            </button>
          </div>
        )}

        {myTournaments.length === 0 ? (
          demoTournament ? (
            <div className="mt-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2">🎉 Get Started</p>
              <TournamentCard
                reg={{ id: 'demo-reg', status: 'pending', tournament_id: demoTournament.id, is_demo: true }}
                tournament={demoTournament}
                onClick={() => goToTournament(demoTournament, { id: 'demo-reg', status: 'pending', tournament_id: demoTournament.id, is_demo: true })}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Trophy className="w-14 h-14 text-muted-foreground/20 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">No Tournaments Yet</h2>
              <p className="text-sm text-muted-foreground">You'll see your tournaments here once you're registered.</p>
              <button
                onClick={() => setShowDiscover(true)}
                className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold"
              >
                Discover Events
              </button>
            </div>
          )
        ) : (
          <>
            {activeTournaments.length > 0 && (
              <>
                <SectionHeader title="Live Tournaments" />
                <div className="space-y-3">
                  {activeTournaments.map(({ reg, tournament }, idx) => (
                    <TournamentCard key={reg.id} reg={reg} tournament={tournament} onClick={() => goToTournament(tournament, reg)} isFeatured={idx === 0} isLiveNowSection />
                  ))}
                </div>
              </>
            )}
            {upcomingTournaments.length > 0 && (
              <>
                <SectionHeader title="Upcoming Tournaments" />
                <div className="space-y-3">
                  {upcomingTournaments.map(({ reg, tournament }) => (
                    <TournamentCard key={reg.id} reg={reg} tournament={tournament} onClick={() => goToTournament(tournament, reg)} />
                  ))}
                </div>
              </>
            )}
            {pastTournaments.length > 0 && (
              <>
                <SectionHeader title="Past Tournaments" />
                <div className="space-y-3">
                  {pastTournaments.map(({ reg, tournament }) => (
                    <TournamentCard key={reg.id} reg={reg} tournament={tournament} onClick={() => goToTournament(tournament, reg)} />
                  ))}
                </div>
              </>
            )}
            {inactiveTournaments.length > 0 && (
              <>
                <SectionHeader title="Inactive" />
                <div className="space-y-3">
                  {inactiveTournaments.map(({ reg, tournament }) => (
                    <TournamentCard key={reg.id} reg={reg} tournament={tournament} onClick={() => goToTournament(tournament, reg)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {upcomingLeagues.length > 0 && (
          <>
            <SectionHeader title="Upcoming Leagues" />
            <div className="space-y-3">
              {upcomingLeagues.map((event) => (
                <UpcomingEventCard
                  key={event.id}
                  event={event}
                  onClick={() => goToLeagueEvent(event)}
                />
              ))}
            </div>
          </>
        )}

        {enrolledClasses.length > 0 && (
          <>
            <SectionHeader title="Enrolled Classes" />
            <div className="space-y-3">
              {enrolledClasses.map((event) => (
                <UpcomingEventCard
                  key={event.id}
                  event={event}
                  onClick={() => goToClassEvent(event)}
                />
              ))}
            </div>
          </>
        )}

        {upcomingClasses.length > 0 && (
          <>
            <SectionHeader title="Upcoming Classes" />
            <div className="space-y-3">
              {upcomingClasses.map((event) => (
                <UpcomingEventCard
                  key={event.id}
                  event={event}
                  onClick={() => goToClassEvent(event)}
                />
              ))}
            </div>
          </>
        )}

        {invitedClasses.length > 0 && (
          <>
            <SectionHeader title="Invited Classes" />
            <div className="space-y-3">
              {invitedClasses.map((event) => (
                <UpcomingEventCard
                  key={event.id}
                  event={event}
                  onClick={() => goToClassEvent(event)}
                />
              ))}
            </div>
          </>
        )}

        {upcomingOther.length > 0 && (
          <>
            <SectionHeader title="Other Upcoming Activities" />
            <div className="space-y-3">
              {upcomingOther.map((event) => (
                <UpcomingEventCard
                  key={event.id}
                  event={event}
                  onClick={() => goToClassEvent(event)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Bar */}
      {!showDiscover && (
      <div
        className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        {/* Extra height so the raised FAB has room above the bar */}
        <div className="flex items-center h-16 relative">
          {/* Home */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-amber-300 relative"
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-amber-300 rounded-full" />
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Tournaments */}
          <button
            onClick={() => navigate('/app/my-tournaments')}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-medium">Tournaments</span>
          </button>

          {/* Discover (center raised) */}
          <button
            onClick={() => setShowDiscover(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full"
          >
            <div className="flex flex-col items-center justify-center gap-1 bg-amber-400 rounded-xl px-3 py-1.5 shadow-md">
              <Search className="w-5 h-5 text-amber-900" />
              <span className="text-[10px] font-bold text-amber-900">Discover</span>
            </div>
          </button>

          {/* Leagues */}
          <button
            onClick={() => navigate('/app/leagues')}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Leagues</span>
          </button>

          {/* Classes */}
          <button
            onClick={() => navigate('/app/courses')}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Classes</span>
          </button>
        </div>
      </div>
      )}


    </div>
  );
}