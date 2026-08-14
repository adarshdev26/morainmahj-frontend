/**
 * Single source of truth helpers for player tournament registration and check-in.
 * Used by Home, Tournament Home, and the check-in flow so UI always reflects backend state.
 */

import { tournaments } from '@/services/resources';
import { setDiscoverReturn } from '@/lib/discover-navigation';

/** Confirmed or waitlisted — player is enrolled and should use Tournament Home. */
const ENROLLED_STATUSES = new Set(['confirmed', 'waitlisted']);
const PENDING_STATUS = 'pending';

/**
 * Whether registration is open for a tournament (status field or registration window dates).
 * Matches backend auto-update logic — not tied to any specific tournament.
 */
export function isTournamentRegistrationOpen(tournament) {
  if (!tournament) return false;
  if (['active', 'completed'].includes(tournament.status)) return false;

  const now = new Date();
  const closeDate = tournament.registration_close_date
    ? new Date(tournament.registration_close_date)
    : null;
  if (closeDate && now >= closeDate) return false;

  if (tournament.status === 'registration_open') return true;
  if (tournament.status === 'registration_closed') return false;

  const openDate = tournament.registration_open_date
    ? new Date(tournament.registration_open_date)
    : null;
  if (openDate && now >= openDate) return true;

  return false;
}

/**
 * Whether the player is enrolled (confirmed/waitlisted) and should open Tournament Home.
 * Pending invites and absent/declined/cancelled records → registration page when open.
 */
export function hasTournamentRegistration(registration) {
  return !!registration && ENROLLED_STATUSES.has(registration.status);
}

/** Pending invite with registration row created (needs payment/confirmation action). */
export function hasPendingTournamentRegistration(registration) {
  return !!registration && registration.status === PENDING_STATUS;
}

/** In-app tournament details dashboard. */
export function getTournamentDetailsPath(tournamentId) {
  return `/app/tournament-home/${tournamentId}`;
}

/** In-app registration page for invited / pending players. */
export function getTournamentRegistrationPath(tournamentId) {
  return `/app/tournament-register/${tournamentId}`;
}

/**
 * Resolve where a tournament card should navigate.
 * Confirmed/waitlisted → details. Pending / no registration → registration.
 */
export function getTournamentCardPath(tournament, registration) {
  const id = typeof tournament === 'object' ? tournament?.id : tournament;
  if (!id) return '/app';

  if (hasPendingTournamentRegistration(registration)) {
    // Centralize "Pay & Confirm" flow in My Tournaments instead of bouncing to signup/register pages.
    return '/app/my-tournaments';
  }

  return hasTournamentRegistration(registration)
    ? getTournamentDetailsPath(id)
    : getTournamentRegistrationPath(id);
}

/** Navigate to the correct tournament page and remember where the user came from. */
export function navigateToTournamentCard(navigate, tournament, registration, returnToOrOptions) {
  const options =
    typeof returnToOrOptions === 'string'
      ? { returnTo: returnToOrOptions }
      : returnToOrOptions || {};

  const { returnTo, fromDiscover, ...rest } = options;

  if (fromDiscover) {
    setDiscoverReturn();
  }

  navigate(getTournamentCardPath(tournament, registration), {
    state: {
      ...(returnTo ? { returnTo } : {}),
      ...(fromDiscover ? { fromDiscover: true } : {}),
      ...(typeof tournament === 'object' && tournament?.id ? { tournament } : {}),
      ...rest,
    },
  });
}

/** Cache window for player list pages (Home, My Tournaments, upcoming events). */
export const PLAYER_LIST_STALE_MS = 30_000;

/** Load a tournament by id — GET by id first, then list fallback. */
export async function fetchTournamentById(tournamentId) {
  if (!tournamentId) return null;
  try {
    return await tournaments.get(tournamentId);
  } catch (err) {
    if (err?.status !== 404) throw err;
  }
  const all = await tournaments.list({}, {});
  return all.find((t) => t.id === tournamentId) ?? null;
}

/**
 * Load only the tournaments the player is registered for (not the full directory).
 *
 * One request for the whole set: the API turns an array filter value into
 * `id = ANY(...)`. Ids with no row simply come back absent, which is the normal
 * case rather than an error — registrations outlive deleted tournaments, so the
 * callers already skip registrations whose tournament cannot be resolved.
 */
export async function fetchTournamentsByIds(tournamentIds) {
  const ids = [...new Set((tournamentIds || []).filter(Boolean))];
  if (!ids.length) return [];
  return tournaments.list({ id: ids }, { limit: ids.length });
}

/** Merge registration rows fetched by email and player id, deduped by registration id. */
export function mergePlayerRegistrations(regsByEmail = [], regsByPlayerId = []) {
  const seen = new Set();
  return [...regsByEmail, ...regsByPlayerId].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

/** Best registration row for a tournament when multiple rows exist. */
export function pickRegistrationForTournament(registrations, tournamentId) {
  const matches = registrations.filter((r) => r.tournament_id === tournamentId);
  if (!matches.length) return null;
  return (
    matches.find((r) => r.status === 'confirmed') ??
    matches.find((r) => r.status === 'waitlisted') ??
    matches[0]
  );
}

/** Map tournament id → best registration row for navigation. */
export function buildRegistrationsByTournamentId(registrations) {
  const map = {};
  for (const r of registrations) {
    const existing = map[r.tournament_id];
    map[r.tournament_id] = existing
      ? pickRegistrationForTournament([existing, r], r.tournament_id)
      : r;
  }
  return map;
}

/** Find the current user's registration in a tournament registration list. */
export function findPlayerRegistration(registrations, user) {
  if (!user || !registrations?.length) return null;
  const email = user.email?.toLowerCase();
  return registrations.find(
    (r) => r.player_id === user.id || (email && r.player_email?.toLowerCase() === email),
  ) ?? null;
}

/** Whether the registration is marked checked in on the backend. */
export function isPlayerCheckedIn(registration) {
  return registration?.checked_in === true;
}

/** Invalidate all player-facing caches that depend on registration / check-in state. */
export function invalidateAfterCheckIn(queryClient, tournamentId) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: ['regs-by-email'] }),
    queryClient.invalidateQueries({ queryKey: ['regs-by-pid'] }),
    queryClient.invalidateQueries({ queryKey: ['my-tournaments-by-id'] }),
    queryClient.invalidateQueries({ queryKey: ['my-registrations'] }),
  ];

  if (tournamentId) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: ['t-registrations', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['t-assignments', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['t-scorecards', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['room_map', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['tournament-players', tournamentId] }),
    );
  }

  return Promise.all(tasks);
}

/** Query defaults so tournament pages always fetch fresh registration data. */
export const FRESH_REGISTRATION_QUERY = {
  staleTime: 0,
  refetchOnMount: 'always',
};
