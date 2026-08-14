import React, { useState } from 'react';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { isShareCanceled, sanitizeFilename } from '@/lib/capacitor-utils';

const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const isNativeApp = () =>
  typeof window.Capacitor?.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform();

// Convert "YYYY-MM-DD" + "HH:MM" (local) → UTC ICS datetime "YYYYMMDDTHHMMSSZ"
function toICSUTC(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0);
  const utc = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

// Convert "YYYY-MM-DD" → end-of-day UTC ICS datetime for RRULE UNTIL
function toICSUntilUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59);
  const utc = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}${pad(utc.getUTCSeconds())}Z`;
}

// Generate ICS content for a recurring weekly league event
function buildLeagueICS(league, firstSession) {
  const startDate = firstSession?.date || new Date().toISOString().slice(0, 10);
  const startTime = firstSession?.start_time || league.start_time || '12:00';
  const endTime = firstSession?.end_time || league.end_time || '14:00';
  const location = firstSession?.location || league.location || '';
  const dayAbbr = league.day_of_week != null ? DAY_MAP[league.day_of_week] : null;

  const dtStart = toICSUTC(startDate, startTime);
  const dtEnd = toICSUTC(startDate, endTime);

  const rrule = dayAbbr
    ? `RRULE:FREQ=WEEKLY;BYDAY=${dayAbbr}${league.season_end ? `;UNTIL=${toICSUntilUTC(league.season_end)}` : ''}`
    : null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MahjongApp//League//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:league-${league.id}@mahjongapp`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    rrule,
    `SUMMARY:${league.name}`,
    location ? `LOCATION:${location}` : null,
    league.description ? `DESCRIPTION:${league.description}` : null,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/** Web fallback: trigger a browser download via a temporary <a> element. */
function downloadIcsOnWeb(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Native: write .ics to Cache, open the system share sheet (Calendar, etc.), then delete the temp file.
 */
async function shareIcsOnNative(content, filename, title) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  const cachePath = `calendar/${Date.now()}_${filename}`;

  await Filesystem.writeFile({
    path: cachePath,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    directory: Directory.Cache,
    path: cachePath,
  });

  try {
    const canShare = await Share.canShare();
    if (!canShare.value) {
      throw new Error('Sharing is not available on this device');
    }

    await Share.share({
      title,
      files: [uri],
      dialogTitle: title || 'Add to Calendar',
    });
  } finally {
    try {
      await Filesystem.deleteFile({
        path: cachePath,
        directory: Directory.Cache,
      });
    } catch {
      // Cache may evict the file independently; safe to ignore.
    }
  }
}

export default function AddToCalendarButton({ league, firstSession, className }) {
  const [isPreparing, setIsPreparing] = useState(false);

  const handleClick = async () => {
    if (isPreparing) return;

    setIsPreparing(true);
    try {
      const ics = buildLeagueICS(league, firstSession);
      const filename = `${sanitizeFilename(league.name, 'league')}_${league.id}.ics`;
      const title = league.name;

      if (isNativeApp()) {
        await shareIcsOnNative(ics, filename, title);
      } else {
        downloadIcsOnWeb(ics, filename);
      }
    } catch (error) {
      if (!isShareCanceled(error)) {
        console.error('Add to calendar failed:', error);
        toast.error('Could not prepare calendar file. Please try again.');
      }
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-1.5 text-xs ${className || ''}`}
      onClick={handleClick}
      disabled={isPreparing}
      aria-busy={isPreparing}
    >
      {isPreparing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
      )}
      {isPreparing ? 'Preparing…' : 'Add to Calendar'}
    </Button>
  );
}