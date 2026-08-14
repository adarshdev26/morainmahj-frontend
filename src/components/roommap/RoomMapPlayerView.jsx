import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { roomMaps as roomMapsApi } from '@/services/resources';
import { FRESH_REGISTRATION_QUERY } from '@/lib/tournament-registration';
import RoomMapDisplay from './RoomMapDisplay';
import { Map, ExternalLink, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// roundAssignments: array of { round: number, table: number, wind: string }
export default function RoomMapPlayerView({ tournamentId, leagueId, roundAssignments = [], onBackToTournament }) {
  const filterKey = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['room_map', tournamentId || leagueId],
    queryFn: () => roomMapsApi.filter(filterKey).then(r => r[0] || null),
    enabled: !!(tournamentId || leagueId),
    ...FRESH_REGISTRATION_QUERY,
  });

  const fullscreenUrl = tournamentId
    ? `/room-map?tournament=${tournamentId}`
    : `/room-map?league=${leagueId}`;

  const [selectedRound, setSelectedRound] = useState(1);

  if (isLoading) return null;
  if (!mapData || !mapData.published) return null;

  const activeAssignment = roundAssignments.find(a => a.round === selectedRound) || null;
  const numRounds = roundAssignments.length > 0
    ? Math.max(...roundAssignments.map(a => a.round))
    : 4;

  return (
    <div className="space-y-3">
      {onBackToTournament && (
        <button
          onClick={onBackToTournament}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tournament
        </button>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Map className="h-4 w-4" /> Room Map
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-xs text-muted-foreground"
          onClick={() => window.open(fullscreenUrl, '_blank')}
        >
          <ExternalLink className="h-3 w-3" /> Full Screen
        </Button>
      </div>

      {/* Round selector */}
      <div className="flex gap-1">
        {Array.from({ length: numRounds }, (_, i) => i + 1).map(r => (
          <button
            key={r}
            onClick={() => setSelectedRound(r)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
              selectedRound === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            R{r}
          </button>
        ))}
      </div>

      <RoomMapDisplay
        mapData={mapData}
        highlightTable={activeAssignment?.table ?? null}
        highlightWind={activeAssignment?.wind ?? null}
        fullscreen={false}
      />
    </div>
  );
}