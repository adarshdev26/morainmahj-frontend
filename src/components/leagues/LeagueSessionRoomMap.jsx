import React, { useMemo, useState } from 'react';
import { leagueTableAssignments as leagueTableAssignmentsApi, roomMaps as roomMapsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Map as MapIcon } from 'lucide-react';
import RoomMapDisplay from '@/components/roommap/RoomMapDisplay';

const WINDS = ['East', 'South', 'West', 'North'];
const SEAT_KEYS = { East: 'east', South: 'south', West: 'west', North: 'north' };

export default function LeagueSessionRoomMap({ session, league }) {
  const [activeRound, setActiveRound] = useState(1);

  const numRounds = league.num_rounds || 4;

  const { data: assignments = [] } = useQuery({
    queryKey: ['league-assignments', session.id, activeRound],
    queryFn: () => leagueTableAssignmentsApi.filter({ session_id: session.id, round_number: activeRound }),
    enabled: !!session.id,
  });

  const { data: roomMap } = useQuery({
    queryKey: ['room_map', league.id],
    queryFn: () => roomMapsApi.filter({ league_id: league.id }).then(r => r[0] || null),
    enabled: !!league.id,
  });

  // Build tablePlayerData from assignments: { [tableNumber]: [{ wind, name }] }
  const tablePlayerData = useMemo(() => {
    const data = {};
    assignments.forEach(a => {
      const players = [];
      WINDS.forEach(wind => {
        const key = SEAT_KEYS[wind];
        const name = a[`${key}_player_name`];
        if (name) players.push({ wind, name });
      });
      if (players.length > 0) data[a.table_number] = players;
    });
    return data;
  }, [assignments]);

  // If a saved room map exists, use its layout. Otherwise auto-generate a simple grid.
  const mapData = useMemo(() => {
    if (roomMap && roomMap.tables && roomMap.tables.length > 0) return roomMap;
    const numTables = assignments.length;
    if (numTables === 0) return null;
    const cols = Math.min(numTables, 4);
    return {
      tables: assignments.map((a, i) => ({
        table_number: a.table_number,
        col: i % cols,
        row: Math.floor(i / cols),
      })),
      north_label: 'North Wall',
      south_label: 'South Wall',
      east_label: 'East Wall',
      west_label: 'West Wall',
    };
  }, [roomMap, assignments]);

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <MapIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No table assignments yet.</p>
        <p className="text-xs mt-1">Generate table assignments first — the map will auto-populate with seating.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Round:</span>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {Array.from({ length: numRounds }, (_, i) => i + 1).map(r => (
            <button
              key={r}
              onClick={() => setActiveRound(r)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeRound === r ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">{assignments.length} table{assignments.length === 1 ? '' : 's'}</span>
      </div>

      {mapData && (
        <RoomMapDisplay mapData={mapData} tablePlayerData={tablePlayerData} />
      )}

      <p className="text-xs text-slate-400 text-center">
        Map auto-populates from table assignments. To customize the room layout, use the Room Map tab on the league page.
      </p>
    </div>
  );
}