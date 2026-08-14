import React, { useState, useEffect } from 'react';
import { leagueScoreCards as leagueScoreCardsApi, leagueTableAssignments as leagueTableAssignmentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, X, ClipboardList } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SEATS = [
  { key: 'east', label: 'East' },
  { key: 'south', label: 'South' },
  { key: 'west', label: 'West' },
  { key: 'north', label: 'North' },
];

/**
 * Player-facing live scoring for a league session.
 * Lets a seated player enter the NESW scores for their own table, per round,
 * and submit a LeagueScoreCard (status 'submitted').
 */
export default function LeaguePlayerScoreEntry({ league, session, user, mySeats, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const seatedRounds = [...mySeats].map(s => s.round).sort((a, b) => a - b);
  const [round, setRound] = useState(seatedRounds[0] || 1);
  const [scores, setScores] = useState({ east: '', south: '', west: '', north: '' });

  const mySeat = mySeats.find(s => s.round === round);
  const tableNum = mySeat?.table;

  const { data: assignment } = useQuery({
    queryKey: ['league-assignment-player', session.id, round, tableNum],
    queryFn: () =>
      leagueTableAssignmentsApi
        .filter({ session_id: session.id, round_number: round, table_number: tableNum })
        .then(r => r[0]),
    enabled: tableNum != null,
  });

  const { data: existingCard } = useQuery({
    queryKey: ['league-scorecard-player', session.id, round, tableNum],
    queryFn: () =>
      leagueScoreCardsApi
        .filter({ session_id: session.id, round_number: round, table_number: tableNum })
        .then(r => r[0]),
    enabled: tableNum != null,
  });

  useEffect(() => {
    if (existingCard) {
      setScores({
        east: existingCard.east_score ?? '',
        south: existingCard.south_score ?? '',
        west: existingCard.west_score ?? '',
        north: existingCard.north_score ?? '',
      });
    } else {
      setScores({ east: '', south: '', west: '', north: '' });
    }
  }, [existingCard, round]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const a = assignment;
      if (!a) throw new Error('No assignment for this table/round.');
      const toNum = (v) => (v === '' || v == null ? null : Number(v));
      const payload = {
        league_id: league.id,
        session_id: session.id,
        round_number: round,
        table_number: tableNum,
        east_player_email: a.east_player_email,
        east_player_name: a.east_player_name,
        east_score: toNum(scores.east),
        south_player_email: a.south_player_email,
        south_player_name: a.south_player_name,
        south_score: toNum(scores.south),
        west_player_email: a.west_player_email,
        west_player_name: a.west_player_name,
        west_score: toNum(scores.west),
        north_player_email: a.north_player_email,
        north_player_name: a.north_player_name,
        north_score: toNum(scores.north),
        status: 'submitted',
        submitted_by_id: user.id,
        submitted_at: new Date().toISOString(),
      };
      if (existingCard) {
        await leagueScoreCardsApi.update(existingCard.id, payload);
      } else {
        await leagueScoreCardsApi.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['league-scorecard-player', session.id] });
      qc.invalidateQueries({ queryKey: ['league-scores', session.id] });
      toast({ title: 'Scores submitted!' });
    },
    onError: (err) => toast({ title: 'Error saving scores', description: err.message, variant: 'destructive' }),
  });

  if (seatedRounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        You have no table assignment for this session yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Enter table scores</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Round selector (only rounds the player is seated) */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Round:</span>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {seatedRounds.map(r => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${round === r ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <Badge variant="outline" className="text-xs">Table {tableNum} · {mySeat.wind}</Badge>
      </div>

      <p className="text-xs text-muted-foreground -mt-1">
        Enter each player's score (NESW). Negative scores are allowed.
      </p>

      <div className="space-y-2">
        {SEATS.map(seat => {
          const name = assignment ? assignment[`${seat.key}_player_name`] : null;
          const email = assignment ? assignment[`${seat.key}_player_email`] : null;
          const isMe = email === user.email;
          return (
            <div key={seat.key} className="flex items-center gap-2">
              <span className={`w-12 text-xs font-semibold shrink-0 ${isMe ? 'text-primary' : 'text-muted-foreground'}`}>{seat.label}</span>
              <span className="flex-1 text-sm text-foreground truncate">
                {name || <span className="text-muted-foreground/50 italic">Empty seat</span>}
                {isMe && <span className="ml-1 text-xs text-primary">(you)</span>}
              </span>
              <Input
                type="number"
                step="any"
                value={scores[seat.key]}
                onChange={e => setScores(s => ({ ...s, [seat.key]: e.target.value }))}
                placeholder="0"
                className="w-24 text-right font-mono"
                disabled={!email}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {existingCard?.status === 'submitted' ? 'Submitted' : 'Not yet submitted'}
          {existingCard?.submitted_at && ` · ${new Date(existingCard.submitted_at).toLocaleDateString()}`}
        </span>
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5">
          <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Submitting…' : 'Submit Scores'}
        </Button>
      </div>
    </div>
  );
}