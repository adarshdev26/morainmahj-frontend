import React, { useMemo, useState } from 'react';
import { leagueTableAssignments as leagueTableAssignmentsApi } from '@/services/resources';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Wand2 } from 'lucide-react';

const WIND_COLORS = {
  East: 'bg-red-100 text-red-700',
  South: 'bg-green-100 text-green-700',
  West: 'bg-blue-100 text-blue-700',
  North: 'bg-slate-100 text-slate-600',
};

export default function FlightByRecord({ open, onOpenChange, session, league, assignments, scorecards, rsvps }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null);

  // Calculate W-L records from league scorecards (keyed by player email)
  const playerRecords = useMemo(() => {
    const records = {};
    scorecards.forEach(card => {
      const seats = [
        { email: card.east_player_email, score: card.east_score },
        { email: card.south_player_email, score: card.south_score },
        { email: card.west_player_email, score: card.west_score },
        { email: card.north_player_email, score: card.north_score },
      ].filter(s => s.email);
      seats.forEach(({ email, score }) => {
        if (!records[email]) records[email] = { wins: 0, losses: 0, email };
        const others = seats.filter(s => s.email !== email);
        if (others.length === 0) return;
        if (others.every(s => (score ?? 0) > (s.score ?? 0))) records[email].wins++;
        else if (others.every(s => (score ?? 0) < (s.score ?? 0))) records[email].losses++;
      });
    });
    return records;
  }, [scorecards]);

  // Get RSVP map: player_id -> { email, name }
  const rsvpMap = useMemo(() => {
    const map = {};
    rsvps.forEach(r => {
      map[r.player_email] = { name: r.player_name, email: r.player_email };
    });
    return map;
  }, [rsvps]);

  // Get current assignments
  const currentRound = Math.max(...assignments.map(a => a.round_number || 1));
  const currentAssignments = assignments.filter(a => a.round_number === currentRound);

  // Generate flights by record
  const generateFlights = () => {
    const players = Object.entries(playerRecords).map(([id, rec]) => ({
      id,
      ...rec,
      name: rsvpMap[id]?.name || (id.includes('@') ? id.split('@')[0] : id.substring(0, 8)),
    }));

    // Sort by wins desc, then losses asc
    players.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses));

    // Divide into flights: top half vs bottom half
    const mid = Math.ceil(players.length / 2);
    const flight1 = players.slice(0, mid);
    const flight2 = players.slice(mid);

    const seatingLayout = (group) => {
      const tables = [];
      let tableNum = 1;
      for (let i = 0; i < group.length; i += 4) {
        const table = {
          players: group.slice(i, Math.min(i + 4, group.length)),
          table_number: tableNum++,
        };
        tables.push(table);
      }
      return tables;
    };

    return { flight1: seatingLayout(flight1), flight2: seatingLayout(flight2) };
  };

  const flights = useMemo(() => generateFlights(), [playerRecords, rsvpMap]);

  const applyFlightsMutation = useMutation({
    mutationFn: async () => {
      if (!preview) return;

      // Delete current round assignments
      if (currentAssignments.length > 0) {
        await Promise.allSettled(currentAssignments.map(a => leagueTableAssignmentsApi.remove(a.id)));
      }

      // Build new assignments from preview
      const newAssignments = [];
      let globalTableNum = 1;

      [preview.flight1, preview.flight2].forEach(flight => {
        flight.forEach(table => {
          const seats = ['East', 'South', 'West', 'North'];
          const assignment = {
            session_id: session.id,
            league_id: league.id,
            round_number: currentRound,
            table_number: globalTableNum++,
          };

          table.players.forEach((player, idx) => {
            const seatKey = `${seats[idx].toLowerCase()}_player_email`;
            const nameKey = `${seats[idx].toLowerCase()}_player_name`;
            assignment[seatKey] = player.id;
            assignment[nameKey] = player.name;
          });

          newAssignments.push(assignment);
        });
      });

      await leagueTableAssignmentsApi.bulkCreate(newAssignments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-assignments', session.id] });
      toast({ title: 'Flights created!' });
      onOpenChange(false);
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Flight by Record</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Divide players into two flights based on win/loss records. Winners flight (top) vs. Losers flight (bottom).
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Flight 1 Preview */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3 text-sm">Winners Flight</h3>
                <div className="space-y-2">
                  {flights.flight1.slice(0, 3).map((t, i) => (
                    <div key={i} className="text-xs bg-slate-50 p-2 rounded">
                      <p className="font-medium text-slate-700">Table {t.table_number}</p>
                      <p className="text-slate-600">
                        {t.players.slice(0, 2).map(p => `${p.name} (${p.wins}W)`).join(', ')}
                        {t.players.length > 2 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                  {flights.flight1.length > 3 && (
                    <p className="text-xs text-slate-500 italic">+{flights.flight1.length - 3} more tables</p>
                  )}
                </div>
              </div>

              {/* Flight 2 Preview */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3 text-sm">Losers Flight</h3>
                <div className="space-y-2">
                  {flights.flight2.slice(0, 3).map((t, i) => (
                    <div key={i} className="text-xs bg-slate-50 p-2 rounded">
                      <p className="font-medium text-slate-700">Table {t.table_number}</p>
                      <p className="text-slate-600">
                        {t.players.slice(0, 2).map(p => `${p.name} (${p.wins}W)`).join(', ')}
                        {t.players.length > 2 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                  {flights.flight2.length > 3 && (
                    <p className="text-xs text-slate-500 italic">+{flights.flight2.length - 3} more tables</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setPreview(flights)} className="gap-2">
                <Wand2 className="h-4 w-4" /> Preview Full Layout
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {[preview.flight1, preview.flight2].map((flight, flightIdx) => (
                <div key={flightIdx}>
                  <h3 className="font-semibold text-slate-800 mb-2 text-sm">
                    {flightIdx === 0 ? 'Winners Flight' : 'Losers Flight'}
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {flight.map(table => (
                      <Card key={`${flightIdx}-${table.table_number}`} className="bg-slate-50">
                        <CardContent className="pt-3">
                          <p className="font-semibold text-xs text-slate-700 mb-2">Table {table.table_number}</p>
                          <div className="space-y-1">
                            {table.players.map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className={`px-2 py-0.5 rounded-full font-semibold text-center w-12 ${WIND_COLORS[['East', 'South', 'West', 'North'][i]]}`}>
                                  {['E', 'S', 'W', 'N'][i]}
                                </span>
                                <span className="text-slate-700 flex-1 px-2">{p.name}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {p.wins}W-{p.losses}L
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setPreview(null)}>Back</Button>
              <Button onClick={() => applyFlightsMutation.mutate()} disabled={applyFlightsMutation.isPending} className="gap-2">
                {applyFlightsMutation.isPending ? 'Applying...' : 'Apply Flights'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}