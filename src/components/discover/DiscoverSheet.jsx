import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi, leagues as leaguesApi, registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { navigateToTournamentCard, buildRegistrationsByTournamentId, isTournamentRegistrationOpen } from '@/lib/tournament-registration';
import { navigateFromDiscover, saveDiscoverState, loadDiscoverState, clearDiscoverState, setDiscoverReturn } from '@/lib/discover-navigation';
import { asArray } from '@/lib/ensure-array';
import { ChevronLeft, Search, MapPin, Calendar, Trophy, Users, ChevronRight, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { isCapacitorNative } from '@/lib/capacitor-utils';

const TYPE_OPTIONS = [
  { value: 'tournament', label: 'Tournament', icon: Trophy },
  { value: 'league', label: 'League', icon: Users },
  { value: 'course', label: 'Class', icon: Calendar },
];

const VIBE_OPTIONS = [
  { value: 'casual', label: '😊 Casual' },
  { value: 'social', label: '🎉 Social' },
  { value: 'competitive', label: '🏆 Competitive' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'next_3_months', label: 'Next 3 Months' },
  { value: 'any', label: 'Any Time' },
];

const RADIUS_OPTIONS = [10, 25, 50, 100, 250];

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function getItemDateStrings(item) {
  return [item.date, item.season_start, item.start_date, item.end_date].filter(Boolean);
}

function getPrimaryDateStr(item) {
  return item.date || item.season_start || item.start_date || item.end_date || null;
}

function matchesDateRange(item, range) {
  if (range === 'any') return true;

  // Active leagues are ongoing seasons — a league that started in the past but
  // is still active is still joinable, so always show it for date-bounded ranges.
  if (item._type === 'league' && item.status === 'active') return true;

  const dateStrs = getItemDateStrings(item);
  if (dateStrs.length === 0) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dateStrs.some((dateStr) => {
    const d = parseEventDate(dateStr);
    if (!d) return false;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);

    if (range === 'upcoming') return day >= today;
    if (range === 'this_week') return day >= today && day <= addDays(today, 7);
    if (range === 'this_month') return day >= today && day <= addDays(today, 30);
    if (range === 'next_3_months') return day >= today && day <= addDays(today, 90);
    return true;
  });
}

function isDiscoverable(item) {
  // Explicit opt-in to MM discovery always shows (unless cancelled/completed)
  if (item.discoverable === true) {
    if (['completed', 'cancelled'].includes(item.status)) return false;
    if (item._type === 'course' && ['draft', 'cancelled', 'completed'].includes(item.status)) return false;
    return true;
  }
  // Fall back to status-based discovery for legacy events
  switch (item._type) {
    case 'tournament':
      if (['completed', 'cancelled'].includes(item.status)) return false;
      return (
        isTournamentRegistrationOpen(item) ||
        ['registration_open', 'setup', 'registration_closed'].includes(item.status)
      );
    case 'league':
      if (item.invite_only) return false;
      return !item.status || item.status === 'active';
    case 'course':
      if (['draft', 'cancelled', 'completed'].includes(item.status)) return false;
      return true;
    default:
      return false;
  }
}

function ResultCard({ item, registration, enrollment, discoverState, onNavigate }) {
  const navigate = useNavigate();
  const isTournament = item._type === 'tournament';
  const isLeague = item._type === 'league';
  const isCourse = item._type === 'course';

  const handleTap = () => {
    saveDiscoverState(discoverState);
    setDiscoverReturn();

    if (isTournament) {
      navigateToTournamentCard(navigate, item, registration, {
        returnTo: window.location.pathname + window.location.search,
        fromDiscover: true,
      });
    } else if (isLeague) {
      navigateFromDiscover(navigate, `/league-join?league=${item.id}`);
    } else if (isCourse) {
      const hasEnrollment = enrollment && enrollment.status !== 'cancelled';
      const path = hasEnrollment ? `/app/courses/${item.id}` : `/course-register?courseId=${item.id}`;
      navigateFromDiscover(navigate, path);
    }

    onNavigate?.();
  };

  const typeColor = isTournament
    ? 'bg-amber-100 text-amber-700'
    : isLeague
    ? 'bg-blue-100 text-blue-700'
    : 'bg-purple-100 text-purple-700';

  const typeLabel = isTournament ? 'Tournament' : isLeague ? 'League' : 'Class';

  const dateStr = getPrimaryDateStr(item);

  return (
    <button
      onClick={handleTap}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
          {item.status && (
            <span className="text-[10px] text-muted-foreground capitalize">{item.status.replace(/_/g, ' ')}</span>
          )}
        </div>
        <p className="font-semibold text-foreground text-sm leading-tight truncate">{item.name}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          {dateStr && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(dateStr), 'MMM d, yyyy')}
            </span>
          )}
          {item.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />{item.location}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
    </button>
  );
}

export default function DiscoverSheet({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const savedState = loadDiscoverState();
  const [query, setQuery] = useState(savedState?.query ?? '');
  const [location, setLocation] = useState(savedState?.location ?? '');
  const [radius, setRadius] = useState(savedState?.radius ?? 50);
  const [types, setTypes] = useState(savedState?.types ?? ['tournament', 'league', 'course']);
  const [vibes, setVibes] = useState(savedState?.vibes ?? []);
  const [dateRange, setDateRange] = useState(savedState?.dateRange ?? 'upcoming');
  const [showFilters, setShowFilters] = useState(savedState?.showFilters ?? true);

  const discoverState = { query, location, radius, types, vibes, dateRange, showFilters };
  const isNative = isCapacitorNative();

  const handleDismiss = () => onClose();

  const handleClose = () => {
    clearDiscoverState();
    onClose();
    navigate('/app');
  };

  const { data: regsByEmail = [] } = useQuery({
    queryKey: ['regs-by-email', user?.email],
    queryFn: () => registrationsApi.filter({ player_email: user.email }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.email,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: regsByPlayerId = [] } = useQuery({
    queryKey: ['regs-by-pid', user?.id],
    queryFn: () => registrationsApi.filter({ player_id: user.id }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 2,
  });

  const regByTournamentId = useMemo(() => {
    const seen = new Set();
    const merged = [...regsByEmail, ...regsByPlayerId].filter((reg) => {
      if (seen.has(reg.id)) return false;
      seen.add(reg.id);
      return true;
    });
    return buildRegistrationsByTournamentId(merged);
  }, [regsByEmail, regsByPlayerId]);

  const { data: enrollmentsByPlayerId = [] } = useQuery({
    queryKey: ['discover-course-enrollments-pid', user?.id],
    queryFn: () => courseEnrollmentsApi.filter({ player_id: user.id }),
    select: asArray,
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: enrollmentsByEmail = [] } = useQuery({
    queryKey: ['discover-course-enrollments-email', user?.email],
    queryFn: () => courseEnrollmentsApi.filter({ player_email: user.email }),
    select: asArray,
    enabled: !!user?.email,
    staleTime: 30_000,
    retry: 2,
  });

  const enrollmentByCourseId = useMemo(() => {
    const seen = new Set();
    const map = {};
    for (const e of [...enrollmentsByPlayerId, ...enrollmentsByEmail]) {
      if (!e?.course_id || seen.has(e.id)) continue;
      seen.add(e.id);
      map[e.course_id] = e;
    }
    return map;
  }, [enrollmentsByPlayerId, enrollmentsByEmail]);

  const {
    data: tournaments = [],
    isPending: tournamentsPending,
    isFetching: tournamentsFetching,
    isError: tournamentsError,
    refetch: refetchTournaments,
  } = useQuery({
    queryKey: ['discover-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date', limit: 200 }),
    select: asArray,
    staleTime: 30_000,
    retry: 2,
  });

  const {
    data: leagues = [],
    isPending: leaguesPending,
    isFetching: leaguesFetching,
    isError: leaguesError,
    refetch: refetchLeagues,
  } = useQuery({
    queryKey: ['discover-leagues'],
    queryFn: () => leaguesApi.list({}, { sort: '-id', limit: 200 }),
    select: asArray,
    staleTime: 30_000,
    retry: 2,
  });

  const {
    data: courses = [],
    isPending: coursesPending,
    isFetching: coursesFetching,
    isError: coursesError,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ['discover-courses'],
    queryFn: () => coursesApi.list({}, { sort: '-id', limit: 200 }),
    select: asArray,
    staleTime: 30_000,
    retry: 2,
  });

  const isInitialLoad = tournamentsPending || leaguesPending || coursesPending;
  const isRefreshing = tournamentsFetching || leaguesFetching || coursesFetching;
  const hasError = tournamentsError || leaguesError || coursesError;

  const allItems = useMemo(() => {
    const t = tournaments.map(x => ({ ...x, _type: 'tournament' }));
    const l = leagues.map(x => ({ ...x, _type: 'league' }));
    const c = courses.map(x => ({ ...x, _type: 'course' }));
    return [...t, ...l, ...c].filter(isDiscoverable);
  }, [tournaments, leagues, courses]);

  const results = useMemo(() => {
    return allItems.filter(item => {
      if (!types.includes(item._type)) return false;

      if (!matchesDateRange(item, dateRange)) return false;

      const searchStr = `${item.name} ${item.location || ''} ${item.description || ''}`.toLowerCase();

      if (query && !searchStr.includes(query.toLowerCase())) return false;

      if (location) {
        const loc = (item.location || '').toLowerCase();
        if (!loc.includes(location.toLowerCase())) return false;
      }

      if (vibes.length > 0) {
        const hasVibe = vibes.some(v => {
          if (v === 'competitive' && item._type === 'tournament') return true;
          if (v === 'casual' && item._type === 'league') return true;
          if (v === 'social' && (item._type === 'league' || item._type === 'course')) return true;
          const desc = (item.description || '').toLowerCase();
          return desc.includes(v);
        });
        if (!hasVibe) return false;
      }

      return true;
    });
  }, [allItems, query, location, types, vibes, dateRange]);

  const toggleType = (v) =>
    setTypes(prev => prev.includes(v) ? prev.filter(t => t !== v) : [...prev, v]);

  const toggleVibe = (v) =>
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const activeFilterCount = (vibes.length > 0 ? 1 : 0) +
    (location ? 1 : 0) +
    (types.length < 3 ? 1 : 0) +
    (dateRange !== 'upcoming' ? 1 : 0);

  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setTypes(['tournament', 'league', 'course']);
    setVibes([]);
    setDateRange('upcoming');
  };

  const retryLoad = () => {
    refetchTournaments();
    refetchLeagues();
    refetchCourses();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-background${isNative ? ' native-fullscreen-overlay' : ''}`}
      style={isNative
        ? { paddingBottom: 'env(safe-area-inset-bottom)' }
        : { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div
        className={`bg-primary text-primary-foreground px-4 flex items-center gap-3 shrink-0${isNative ? '' : ' py-3'}`}
        style={isNative ? { paddingTop: 'calc(var(--safe-area-top) + 12px)', paddingBottom: '0.75rem' } : undefined}
      >
        <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-heading font-bold text-lg flex-1">Discover</h2>
        <button
          onClick={() => setShowFilters(v => !v)}
          className="relative p-2 rounded-full bg-primary-foreground/10 active:bg-primary-foreground/20"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 text-slate-900 rounded-full text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 bg-background border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tournaments, leagues, classes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-muted/60 border-b border-border px-4 py-4 space-y-4">
          {/* Location */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="City, state, or zip…"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => toggleType(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    types.includes(value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                >
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Vibe */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Vibe</label>
            <div className="flex gap-2 flex-wrap">
              {VIBE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleVibe(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    vibes.includes(value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date Range</label>
            <div className="flex gap-2 flex-wrap">
              {DATE_RANGE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    dateRange === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {isRefreshing && !isInitialLoad && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Refreshing…
          </div>
        )}
        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="font-semibold text-foreground">Loading events…</p>
          </div>
        ) : hasError && allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="font-semibold text-foreground">Couldn&apos;t load events</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Check your connection and try again</p>
            <button
              onClick={retryLoad}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="font-semibold text-foreground">
              {allItems.length === 0 ? 'Nothing to discover right now' : 'No results found'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {allItems.length === 0
                ? 'New tournaments, leagues, and classes will appear here when published'
                : 'Try adjusting your filters'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium px-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map(item => (
              <ResultCard
                key={`${item._type}-${item.id}`}
                item={item}
                registration={item._type === 'tournament' ? regByTournamentId[item.id] : null}
                enrollment={item._type === 'course' ? enrollmentByCourseId[item.id] : null}
                discoverState={discoverState}
                onNavigate={handleDismiss}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}