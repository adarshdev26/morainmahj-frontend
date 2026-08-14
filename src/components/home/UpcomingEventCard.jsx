import React from 'react';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_STYLES = {
  league: { badge: 'bg-blue-100 text-blue-700', label: 'League', dot: 'bg-blue-500' },
  class: { badge: 'bg-purple-100 text-purple-700', label: 'Class', dot: 'bg-purple-500' },
  other: { badge: 'bg-pink-100 text-pink-700', label: 'Activity', dot: 'bg-pink-500' },
};

const LIVE_BADGE_CLASS =
  'flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full';
const LIVE_PULSE_DOT_CLASS = 'w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block';

export default function UpcomingEventCard({ event, onClick }) {
  const style = TYPE_STYLES[event.type] || TYPE_STYLES.other;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className={`w-1 self-stretch rounded-full ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
            {event.type === 'other' ? event.lessonTypeLabel || style.label : style.label}
          </span>
          {event.isLive && (
            <span className={LIVE_BADGE_CLASS}>
              <span className={LIVE_PULSE_DOT_CLASS} />
              LIVE
            </span>
          )}
          {event.statusLabel && !event.isLive && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
              {event.statusLabel}
            </span>
          )}
        </div>
        <p className="font-semibold text-foreground text-base leading-tight truncate">{event.title}</p>
        {event.detail && event.type !== 'league' && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{event.detail}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-1.5">
          {event.date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(`${event.date}T12:00:00`), 'MMM d, yyyy')}
            </span>
          )}
          {event.startTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.startTime}
            </span>
          )}
          {event.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
    </div>
  );
}
