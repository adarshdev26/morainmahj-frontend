import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { leagueTableAssignments as leagueTableAssignmentsApi, leagues as leaguesApi, registrations as registrationsApi, roomMaps as roomMapsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import RoomMapDisplay from '@/components/roommap/RoomMapDisplay';
import Logo from '@/components/Logo';
import { ChevronLeft } from 'lucide-react';

function getLastName(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1];
}

export default function RoomMapFullscreen() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const tournamentId = params.get('tournament');
  const leagueId = params.get('league');
  const sessionId = params.get('session');
  const highlightTable = params.get('highlight') ? Number(params.get('highlight')) : null;
  const highlightWind = params.get('wind') || null;
  const [activeRound, setActiveRound] = useState(1);

  const filterKey = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['room_map_fs', tournamentId || leagueId],
    queryFn: () => roomMapsApi.filter(filterKey).then(r => r[0] || null),
    refetchInterval: 30000,
  });

  const { data: tournamentData } = useQuery({
    queryKey: ['tournament_fs', tournamentId],
    queryFn: () => tournamentId ? tournamentsApi.filter({ id: tournamentId }).then(r => r[0]) : null,
    enabled: !!tournamentId,
  });

  const { data: leagueData } = useQuery({
    queryKey: ['league_fs', leagueId],
    queryFn: () => leagueId ? leaguesApi.filter({ id: leagueId }).then(r => r[0]) : null,
    enabled: !!leagueId,
  });

  // Tournament assignments
  const { data: tAssignments = [] } = useQuery({
    queryKey: ['fs_t_assignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  // League assignments
  const { data: lAssignments = [] } = useQuery({
    queryKey: ['fs_l_assignments', sessionId],
    queryFn: () => leagueTableAssignmentsApi.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 30000,
  });

  // Player lookup for tournaments (id → name)
  const { data: players = [] } = useQuery({
    queryKey: ['fs_players', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
      </div>
    );
  }

  // Build tablePlayerData for the active round
  // { [tableNumber]: [ { wind, name } ] }
  let tablePlayerData = null;
  let numRounds = 1;

  if (tournamentId && tAssignments.length > 0) {
    const playerMap = Object.fromEntries(players.map(p => [p.player_id, p.player_name]));
    const rounds = [...new Set(tAssignments.map(a => a.round_number))].sort((a, b) => a - b);
    numRounds = rounds.length;
    const roundAssignments = tAssignments.filter(a => a.round_number === activeRound);
    tablePlayerData = {};
    roundAssignments.forEach(a => {
      tablePlayerData[a.table_number] = [
        { wind: 'East',  name: getLastName(playerMap[a.player1_id]) },
        { wind: 'South', name: getLastName(playerMap[a.player2_id]) },
        { wind: 'West',  name: getLastName(playerMap[a.player3_id]) },
        { wind: 'North', name: getLastName(playerMap[a.player4_id]) },
      ].filter(s => s.name && s.name !== '?');
    });
  } else if (sessionId && lAssignments.length > 0) {
    const rounds = [...new Set(lAssignments.map(a => a.round_number))].sort((a, b) => a - b);
    numRounds = rounds.length;
    const roundAssignments = lAssignments.filter(a => a.round_number === activeRound);
    tablePlayerData = {};
    roundAssignments.forEach(a => {
      tablePlayerData[a.table_number] = [
        { wind: 'East',  name: getLastName(a.east_player_name) },
        { wind: 'South', name: getLastName(a.south_player_name) },
        { wind: 'West',  name: getLastName(a.west_player_name) },
        { wind: 'North', name: getLastName(a.north_player_name) },
      ].filter(s => s.name && s.name !== '?');
    });
  }

  const eventName = tournamentData?.name || leagueData?.name || 'Room Map';

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col">
      {tournamentId && (
        <div
          className="px-4 shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
        >
          <button
            onClick={() => navigate(`/app/tournament-home/${tournamentId}`)}
            className="flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Tournament
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 border-b border-primary-foreground/20">
        <Logo size="md" className="text-primary-foreground opacity-90" />
        <div className="flex items-center gap-6">
          {/* Round selector */}
          {numRounds > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: numRounds }, (_, i) => i + 1).map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRound(r)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                    activeRound === r
                      ? 'bg-primary-foreground text-primary border-primary-foreground'
                      : 'border-primary-foreground/30 text-primary-foreground/60 hover:border-primary-foreground/60'
                  }`}
                >
                  Round {r}
                </button>
              ))}
            </div>
          )}
          <div className="text-right">
            <h1 className="text-2xl font-heading font-light">{eventName}</h1>
            <p className="text-primary-foreground/60 text-sm">Find your seat</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl bg-primary-foreground/5 rounded-2xl border border-primary-foreground/20">
          <RoomMapDisplay
            mapData={mapData}
            highlightTable={highlightTable}
            highlightWind={highlightWind}
            tablePlayerData={tablePlayerData}
            fullscreen={true}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-3 text-primary-foreground/40 text-xs">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}