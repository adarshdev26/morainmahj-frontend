import { isPlayerCheckedIn } from '@/lib/tournament-registration';

/**
 * Single source of truth for player-facing tournament event status.
 * Priority: Cancelled/Declined > Live > Upcoming > Completed
 */

export const EVENT_STATUS = {
  CANCELLED: 'cancelled',
  DECLINED: 'declined',
  LIVE: 'live',
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
};

const INACTIVE_REG_STATUSES = ['cancelled', 'declined'];
const UPCOMING_TOURNAMENT_STATUSES = ['registration_open', 'registration_closed', 'setup'];

/** Primary event status used for section placement and badge precedence. */
export function getEventDisplayStatus(tournament, registration) {
  const regStatus = registration?.status;

  if (regStatus === 'cancelled') return EVENT_STATUS.CANCELLED;
  if (regStatus === 'declined') return EVENT_STATUS.DECLINED;

  const tStatus = tournament?.status;

  if (tStatus === 'active') return EVENT_STATUS.LIVE;
  if (tStatus === 'completed') return EVENT_STATUS.COMPLETED;
  if (UPCOMING_TOURNAMENT_STATUSES.includes(tStatus)) return EVENT_STATUS.UPCOMING;

  return EVENT_STATUS.UPCOMING;
}

/** Home screen section for a tournament registration pair. */
export function getHomeSection(eventStatus) {
  switch (eventStatus) {
    case EVENT_STATUS.LIVE:
      return 'live';
    case EVENT_STATUS.UPCOMING:
      return 'upcoming';
    case EVENT_STATUS.COMPLETED:
      return 'past';
    case EVENT_STATUS.CANCELLED:
    case EVENT_STATUS.DECLINED:
      return 'inactive';
    default:
      return 'upcoming';
  }
}

/** Whether the registration is cancelled or declined (inactive for the player). */
export function isInactiveRegistration(registration) {
  return INACTIVE_REG_STATUSES.includes(registration?.status);
}

/**
 * Single badge key for display. Live/completed/cancelled/declined use fixed labels;
 * upcoming events use the registration status (confirmed, pending, etc.).
 * Checked-in confirmed players show attendance status instead of RSVP/live on cards.
 */
export function getEventBadgeKey(tournament, registration) {
  if (
    registration?.status === 'confirmed' &&
    isPlayerCheckedIn(registration)
  ) {
    return 'checked_in';
  }

  const primary = getEventDisplayStatus(tournament, registration);

  if (primary === EVENT_STATUS.LIVE) return 'live';
  if (primary === EVENT_STATUS.COMPLETED) return 'completed';
  if (primary === EVENT_STATUS.CANCELLED) return 'cancelled';
  if (primary === EVENT_STATUS.DECLINED) return 'declined';

  return registration?.status || 'pending';
}

/** Whether the event should show a LIVE / LIVE NOW indicator. */
export function isEventLive(tournament, registration) {
  return getEventDisplayStatus(tournament, registration) === EVENT_STATUS.LIVE;
}

/** Check-in UI and actions are only valid while the tournament is active. */
export function isTournamentCheckInAllowed(tournament) {
  return tournament?.status === 'active';
}