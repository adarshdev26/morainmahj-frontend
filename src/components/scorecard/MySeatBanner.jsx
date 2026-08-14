import React from 'react';
import { MapPin } from 'lucide-react';

const WIND_SOLID = {
  East:  { bg: 'bg-red-500',   text: 'text-white', light: 'bg-red-50 border-red-200' },
  South: { bg: 'bg-blue-500',  text: 'text-white', light: 'bg-blue-50 border-blue-200' },
  West:  { bg: 'bg-green-500', text: 'text-white', light: 'bg-green-50 border-green-200' },
  North: { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50 border-amber-200' },
};

export default function MySeatBanner({ playerName, tableNumber, wind, round, bringingSet, setTableNumber, tournamentId }) {
  if (!tableNumber || !wind) return null;

  const ws = WIND_SOLID[wind] || WIND_SOLID.East;

  const mapUrl = `/room-map?tournament=${tournamentId}&highlight=${tableNumber}&wind=${wind}`;

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-2xl border-2 px-4 py-3.5 mb-5 transition-all hover:shadow-md active:scale-[0.99] ${ws.light}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Wind badge + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${ws.bg}`}>
            <span className="text-xl font-bold text-white">{wind[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">
              {playerName ? `${playerName} · Round ${round}` : `Round ${round}`}
            </p>
            <p className="text-lg font-bold text-foreground leading-tight">
              Table {tableNumber} &mdash; <span className={`${ws.bg.replace('bg-', 'text-').replace('-500', '-600')}`}>{wind}</span>
            </p>
            {bringingSet && (
              <p className="text-xs font-semibold text-blue-600 mt-0.5">
                🎲 Bring your set — assigned to Table {setTableNumber || tableNumber}
              </p>
            )}
          </div>
        </div>

        {/* Map link hint */}
        <div className="flex flex-col items-center gap-1 shrink-0 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <span className="text-[10px] font-medium">See map</span>
        </div>
      </div>
    </a>
  );
}