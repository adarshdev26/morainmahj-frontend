import React from 'react';

const WIND_STYLE = {
  East:  { bg: 'bg-red-500',    text: 'text-white', border: 'border-red-500',   label: 'text-red-400',   dot: '#ef4444' },
  South: { bg: 'bg-blue-500',   text: 'text-white', border: 'border-blue-500',  label: 'text-blue-400',  dot: '#3b82f6' },
  West:  { bg: 'bg-green-500',  text: 'text-white', border: 'border-green-500', label: 'text-green-400', dot: '#22c55e' },
  North: { bg: 'bg-amber-500',  text: 'text-white', border: 'border-amber-500', label: 'text-amber-400', dot: '#f59e0b' },
};

const WINDS = ['East', 'South', 'West', 'North'];

// tablePlayerData: { [tableNumber]: [ { wind, name } ] }  — for fullscreen player display
// highlightTable / highlightWind: for player self-view
export default function RoomMapDisplay({
  mapData,
  highlightTable = null,
  highlightWind = null,
  tablePlayerData = null,
  fullscreen = false,
}) {
  if (!mapData || !mapData.tables || mapData.tables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No room map configured yet.
      </div>
    );
  }

  const tables = mapData.tables;
  const maxCol = Math.max(...tables.map(t => t.col));
  const maxRow = Math.max(...tables.map(t => t.row));
  const gridCols = maxCol + 1;
  const gridRows = maxRow + 1;

  const getTableAt = (col, row) => tables.find(t => t.col === col && t.row === row);

  const directionSize = fullscreen ? 'text-base' : 'text-xs';
  const windStyle = highlightWind ? WIND_STYLE[highlightWind] : null;

  // Direction label colors (wind-coded walls)
  const wallColors = {
    north: 'text-amber-400',  // North = amber
    south: 'text-blue-400',   // South = blue
    east:  'text-red-400',    // East = red
    west:  'text-green-400',  // West = green
  };

  return (
    <div className={`w-full ${fullscreen ? 'p-6' : 'p-2'}`}>
      {/* North wall */}
      <div className={`text-center font-bold mb-3 tracking-widest uppercase ${directionSize} ${fullscreen ? wallColors.north : 'text-muted-foreground'}`}>
        ↑ {mapData.north_label || 'North'}
      </div>

      <div className="flex items-stretch gap-3">
        {/* West wall */}
        <div
          className={`font-bold tracking-widest uppercase flex items-center ${directionSize} ${fullscreen ? wallColors.west : 'text-muted-foreground'}`}
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          ← {mapData.west_label || 'West'}
        </div>

        {/* Grid */}
        <div
          className="flex-1 border-2 border-border rounded-xl p-3 bg-muted/10"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, minmax(${fullscreen ? '100px' : '52px'}, 1fr))`,
            gap: fullscreen ? '12px' : '8px',
          }}
        >
          {Array.from({ length: gridRows }).map((_, row) =>
            Array.from({ length: gridCols }).map((_, col) => {
              const table = getTableAt(col, row);
              const isHighlighted = table && table.table_number === highlightTable;
              const players = tablePlayerData && table ? (tablePlayerData[table.table_number] || []) : [];
              const hasPlayers = players.length > 0;

              return (
                <div
                  key={`${col}-${row}`}
                  className={`rounded-xl border-2 flex flex-col items-center justify-start transition-all overflow-hidden
                    ${table
                      ? isHighlighted
                        ? `shadow-xl scale-105 ${WIND_STYLE[highlightWind]?.border || 'border-amber-500'} ring-2 ring-white/40`
                        : 'border-primary/30 bg-primary/5'
                      : 'border-transparent bg-transparent'
                    }
                    ${fullscreen && table ? 'min-h-[120px]' : 'h-16'}
                  `}
                >
                  {table ? (
                    hasPlayers ? (
                      // Fullscreen: show table number + 4 colored player rows
                      <div className="w-full h-full flex flex-col">
                        {/* Table number header */}
                        <div className={`text-center font-bold text-sm py-0.5 border-b border-primary/10 ${isHighlighted ? 'text-amber-400' : 'text-foreground'}`}>
                          T{table.table_number}
                        </div>
                        {/* Seats */}
                        <div className="flex flex-col flex-1">
                          {WINDS.map(wind => {
                            const seat = players.find(p => p.wind === wind);
                            const ws = WIND_STYLE[wind];
                            const isMySpot = isHighlighted && highlightWind === wind;
                            if (!seat) return null;
                            return (
                              <div
                                key={wind}
                                className={`flex items-center gap-1 px-1.5 py-1 ${ws.bg} ${isMySpot ? 'ring-2 ring-inset ring-white' : ''}`}
                                style={{ opacity: isMySpot ? 1 : 0.85 }}
                              >
                                <span className="text-[9px] font-bold text-white/80 w-3 shrink-0 text-center leading-tight">
                                  {wind[0]}
                                </span>
                                <span className={`text-[10px] font-semibold text-white truncate leading-tight ${isMySpot ? 'underline' : ''}`}>
                                  {seat.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Simple view (no player data)
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <div className={`font-bold leading-none ${fullscreen ? 'text-3xl' : 'text-lg'} ${isHighlighted ? 'text-amber-600' : 'text-primary'}`}>
                          {table.table_number}
                        </div>
                        {isHighlighted && highlightWind ? (
                          <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${windStyle.bg} ${windStyle.text}`}>
                            {highlightWind[0]}
                          </div>
                        ) : (
                          <div className={`text-muted-foreground ${fullscreen ? 'text-sm' : 'text-[10px]'}`}>Table</div>
                        )}
                      </div>
                    )
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* East wall */}
        <div
          className={`font-bold tracking-widest uppercase flex items-center ${directionSize} ${fullscreen ? wallColors.east : 'text-muted-foreground'}`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {mapData.east_label || 'East'} →
        </div>
      </div>

      {/* South wall */}
      <div className={`text-center font-bold mt-3 tracking-widest uppercase ${directionSize} ${fullscreen ? wallColors.south : 'text-muted-foreground'}`}>
        ↓ {mapData.south_label || 'South'}
      </div>

      {/* Wind legend (fullscreen only) */}
      {fullscreen && (
        <div className="flex justify-center gap-4 mt-5">
          {WINDS.map(wind => {
            const ws = WIND_STYLE[wind];
            return (
              <div key={wind} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded ${ws.bg} flex items-center justify-center text-white text-[10px] font-bold`}>{wind[0]}</span>
                <span className={`text-sm font-medium ${ws.label}`}>{wind}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Player self-highlight badge */}
      {!fullscreen && highlightTable && (
        <div className="mt-4 flex justify-center">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border
            ${highlightWind
              ? `${windStyle.bg} ${windStyle.text} border-transparent`
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
            }`}>
            {highlightWind && <span className="font-bold">{highlightWind}</span>}
            <span>— You are at Table {highlightTable}</span>
          </div>
        </div>
      )}
    </div>
  );
}