import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isWithinInterval, subHours, parseISO, format, differenceInHours } from 'date-fns';
import { QrCode, CheckCircle2 } from 'lucide-react';
import { isPlayerCheckedIn } from '@/lib/tournament-registration';

/**
 * Shared Check-In CTA used by the tournament home screen and every tournament
 * card across the app. Visual style of `variant="full"` matches the original
 * TournamentHome block for the not-yet-checked-in state.
 *
 * Render rules:
 *   - hidden unless tournament.status === 'active'
 *   - hidden if there's no `tournament.date`
 *   - hidden if the user has no registration or it isn't `confirmed`
 *   - hidden if the tournament is `completed`
 *   - if already checked in -> read-only "Checked In" on full variant; hidden on card (badge handles it)
 *   - if check-in is currently open  -> green "Check In Now"
 *   - if check-in is not yet open    -> blue "Opens <date|in N hours>"
 */
export default function CheckInButton({ tournament, registration, variant = 'full' }) {
  const navigate = useNavigate();

  if (!tournament?.date) return null;
  if (!registration || registration.status !== 'confirmed') return null;
  if (tournament.status === 'completed') return null;

  const checkedIn = isPlayerCheckedIn(registration);

  if (checkedIn) {
    // Card lists show "Checked In" via getEventBadgeKey — avoid duplicate chip here.
    if (variant === 'card') return null;

    return (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center text-center mb-3 shadow-sm w-full">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
        <span className="font-bold text-base text-emerald-800">Checked In</span>
        <span className="text-xs text-emerald-700 mt-0.5">
          You have successfully checked in to this tournament.
        </span>
      </div>
    );
  }

  let start;
  try {
    start = parseISO(tournament.date);
    if (Number.isNaN(start.getTime())) return null;
  } catch {
    return null;
  }

  const now = new Date();
  const oneHourBefore = subHours(start, 1);
  const isToday = now.toDateString() === start.toDateString();
  const canCheckIn =
    isToday ||
    isWithinInterval(now, { start: oneHourBefore, end: start }) ||
    now > start;

  const handleClick = (e) => {
    e?.stopPropagation?.();
    navigate(`/checkin?tournamentId=${tournament.id}`);
  };

  if (variant === 'card') {
    if (canCheckIn) {
      return (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1.5 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform"
        >
          <QrCode className="w-3.5 h-3.5" />
          Check In
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
        title={`Check-in opens ${format(start, 'MMM d, yyyy')}`}
      >
        <QrCode className="w-3.5 h-3.5" />
        Opens {format(start, 'MMM d')}
      </button>
    );
  }

  if (!canCheckIn) {
    const hoursUntil = differenceInHours(oneHourBefore, now);
    return (
      <button
        type="button"
        onClick={handleClick}
        className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 flex flex-col items-center text-center mb-3 shadow-sm active:scale-[0.98] transition-all w-full"
      >
        <QrCode className="w-8 h-8 text-blue-500 mb-2" />
        <span className="font-bold text-base text-blue-800">Check-In Opens Soon</span>
        <span className="text-xs text-blue-600 mt-1">
          {hoursUntil > 24
            ? `Opens ${format(start, 'EEE, MMM d')}`
            : 'Available 1 hour before start time'}
        </span>
        {hoursUntil > 0 && hoursUntil <= 24 && (
          <span className="text-xs text-blue-500 mt-1 font-medium">
            Opens in ~{hoursUntil} hour{hoursUntil !== 1 ? 's' : ''}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-4 flex flex-col items-center active:scale-[0.98] transition-all shadow-md mb-3 w-full"
    >
      <QrCode className="w-8 h-8 mb-2" />
      <span className="font-bold text-base">Check In Now</span>
      <span className="text-xs opacity-90 mt-0.5">Scan QR code at venue</span>
    </button>
  );
}