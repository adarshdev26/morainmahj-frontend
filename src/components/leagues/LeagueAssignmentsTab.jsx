import React, { useState, useMemo } from 'react';
import { callAction } from '@/services/actions';
import { leagueRsvps as leagueRsvpsApi, leagueScoreCards as leagueScoreCardsApi, leagueSessions as leagueSessionsApi, leagueTableAssignments as leagueTableAssignmentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Wand2, RefreshCw, Eye, EyeOff, Grid3X3, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FlightByRecord from '@/components/leagues/FlightByRecord';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East: 'bg-red-100 text-red-700',
  South: 'bg-green-100 text-green-700',
  West: 'bg-blue-100 text-blue-700',
  North: 'bg-slate-100 text-slate-600',
};

export default function LeagueAssignmentsTab({ session, league }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeRound, setActiveRound] = useState(1);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [moveFrom, setMoveFrom] = useState(null);
  const [showFlightDialog, setShowFlightDialog] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ['league-assignments', session.id],
    queryFn: () => leagueTableAssignmentsApi.filter({ session_id: session.id }),
    enabled: !!session.id,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['league-rsvps', session.id],
    queryFn: () => leagueRsvpsApi.filter({ session_id: session.id }),
    enabled: !!session.id,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['session-scorecards', session.id],
    queryFn: () => leagueScoreCardsApi.filter({ session_id: session.id }),
    enabled: !!session.id && !!league.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['league-assignments', session.id] });
    queryClient.invalidateQueries({ queryKey: ['league-session', session.id] });
  };

  const getErrorMessage = (err) =>
    err?.response?.data?.error || err?.response?.data?.message || err?.data?.error || err?.message || 'Something went wrong';

  const generateMutation = useMutation({
    mutationFn: (publish) => callAction('generateLeagueAssignments', { sessionId: session.id, publish }),
    onSuccess: () => { invalidate(); toast({ title: 'Assignments generated!' }); },
    onError: (err) => toast({ title: 'Cannot generate assignments', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const togglePublish = useMutation({
    mutationFn: (published) => leagueSessionsApi.update(session.id, { assignments_published: published }),
    onSuccess: (_, published) => {
      invalidate();
      toast({ title: published ? 'Assignments visible to players' : 'Assignments hidden from players' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: (data) => leagueTableAssignmentsApi.update(data.id, data),
    onSuccess: () => { invalidate(); setSelectedSeat(null); toast({ title: 'Player moved!' }); },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  // Build player record (W-L) from league scorecards (keyed by player email)
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
        if (!records[email]) records[email] = { wins: 0, losses: 0 };
        const others = seats.filter(s => s.email !== email);
        if (others.length === 0) return;
        if (others.every(s => (score ?? 0) > (s.score ?? 0))) records[email].wins++;
        else if (others.every(s => (score ?? 0) < (s.score ?? 0))) records[email].losses++;
      });
    });
    return records;
  }, [scorecards]);

  const handleSeatSwap = (table, seatKey, otherEmail) => {
    if (!moveFrom) {
      setMoveFrom({ table, seatKey });
    } else {
      const update = { ...moveFrom.table, [moveFrom.seatKey]: otherEmail, [seatKey]: moveFrom.table[moveFrom.seatKey] };
      updateAssignmentMutation.mutate(update);
      setMoveFrom(null);
    }
  };

  const numRounds = league.num_rounds || 4;
  const roundNumbers = Array.from({ length: numRounds }, (_, i) => i + 1);
  const roundAssignments = assignments.filter(a => a.round_number === activeRound);
  const tables = [...roundAssignments].sort((a, b) => a.table_number - b.table_number);

  if (!league.table_assignments_enabled) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Grid3X3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Table assignments are not enabled for this league.</p>
        <p className="text-xs mt-1">Enable them in League Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {session.assignments_generated ? (
            <Badge className="bg-green-100 text-green-700 gap-1">
              <Grid3X3 className="h-3 w-3" /> Generated
            </Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-500">Not yet generated</Badge>
          )}
          {session.assignments_generated && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {session.assignments_published ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
              <span>{session.assignments_published ? 'Visible to players' : 'Hidden from players'}</span>
              <Switch
                checked={!!session.assignments_published}
                onCheckedChange={(v) => togglePublish.mutate(v)}
              />
            </div>
          )}
        </div>
        {session?.status === 'completed' && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Session finalized — table assignments are locked.
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {session.assignments_generated && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => generateMutation.mutate(session.assignments_published)} disabled={generateMutation.isPending || session?.status === 'completed'}>
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={() => generateMutation.mutate(false)} disabled={generateMutation.isPending || session?.status === 'completed'}>
            <Wand2 className="h-3.5 w-3.5" />
            {session.assignments_generated ? 'Re-randomize' : 'Generate Assignments'}
          </Button>
          {assignments.length > 0 && scorecards.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowFlightDialog(true)}>
              <Copy className="h-3.5 w-3.5" /> Flight by Record
            </Button>
          )}
        </div>
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-xl">
          <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No assignments yet. Click "Generate Assignments" to create seating.</p>
          <p className="text-xs mt-1 text-slate-400">Mode: <span className="font-medium">{league.east_rotation === 'stays' ? 'East stays at table' : 'All players rotate'}</span> · {numRounds} rounds</p>
          <p className="text-xs mt-1 text-slate-400">Full 4-player tables are created. Extra players are moved to the session waitlist.</p>
        </div>
      )}

      {assignments.length > 0 && (
        <>
          {/* Round tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {roundNumbers.map(r => (
              <button
                key={r}
                onClick={() => setActiveRound(r)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeRound === r ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Round {r}
              </button>
            ))}
          </div>

          {/* Table breakdown summary */}
          {(() => {
            const numTables = tables.length;
            const waitlisted = rsvps.filter(r => r.status === 'waitlist');
            return (
              <p className="text-xs text-slate-400">
                {numTables} table{numTables !== 1 ? 's' : ''} of 4
                {waitlisted.length > 0 && ` · ${waitlisted.length} on waitlist`}
              </p>
            );
          })()}

          {moveFrom && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium">
                {moveFrom.table[`${moveFrom.seatKey.replace('_id', '_name')}`]} selected — click another seat to swap
              </p>
            </div>
          )}

          {/* Tables */}
          <div className="grid gap-4 md:grid-cols-2">
            {tables.map(table => {
              const isThreePlayer = !table.north_player_email;
              const seats = [
                { wind: 'East', email: table.east_player_email, name: table.east_player_name, key: 'east_player_email' },
                { wind: 'South', email: table.south_player_email, name: table.south_player_name, key: 'south_player_email' },
                { wind: 'West', email: table.west_player_email, name: table.west_player_name, key: 'west_player_email' },
                ...(!isThreePlayer ? [{ wind: 'North', email: table.north_player_email, name: table.north_player_name, key: 'north_player_email' }] : []),
              ];
              return (
                <div key={`${table.round_number}-${table.table_number}`} className="bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">Table {table.table_number}</p>
                      {isThreePlayer && <Badge variant="outline" className="text-xs">3 players</Badge>}
                    </div>
                    {table.set_at_table && (
                      <Badge variant="outline" className="text-xs gap-1">🎲 Set: {table.set_provider_name}</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {seats.map(({ wind, name, email, key }) => {
                      const isSelected = moveFrom?.table.id === table.id && moveFrom?.seatKey === key;
                      return (
                        <button
                          key={wind}
                          onClick={() => handleSeatSwap(table, key, email)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-blue-100 border border-blue-400 ring-2 ring-blue-300'
                              : moveFrom
                                ? 'bg-slate-50 border border-slate-200 hover:bg-blue-50 cursor-pointer'
                                : 'bg-slate-50 border border-transparent hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-14 text-center ${WIND_COLORS[wind]}`}>{wind}</span>
                            <span className="text-sm text-slate-700 truncate">{name || <span className="text-slate-300 italic">—</span>}</span>
                          </div>
                          {email && (
                            <Badge variant="outline" className="text-xs ml-2 shrink-0">
                              {(playerRecords[email]?.wins || 0)}-{(playerRecords[email]?.losses || 0)}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}

        <FlightByRecord
        open={showFlightDialog}
        onOpenChange={setShowFlightDialog}
        session={session}
        league={league}
        assignments={assignments}
        scorecards={scorecards}
        rsvps={rsvps}
        />
        </div>
        );
        }