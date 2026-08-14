import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ShieldCheck, Clock, Send, Lock } from 'lucide-react';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East: 'bg-red-100 text-red-700',
  South: 'bg-blue-100 text-blue-700',
  West: 'bg-green-100 text-green-700',
  North: 'bg-amber-100 text-amber-700',
};

export default function ScoreTable({ scorecard, players, onUpdate, canEdit = true, tournamentStatus = 'active' }) {
  const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

  const playerKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
  const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];

  const [scores, setScores] = useState({
    player1_scores: scorecard.player1_scores || [0, 0, 0, 0],
    player2_scores: scorecard.player2_scores || [0, 0, 0, 0],
    player3_scores: scorecard.player3_scores || [0, 0, 0, 0],
    player4_scores: scorecard.player4_scores || [0, 0, 0, 0],
  });

  const handleScoreChange = (playerKey, setIdx, value) => {
    if (!canEdit || scorecard.status === 'verified' || tournamentStatus === 'completed') return;
    const parsed = value === '' || value === '-' ? value : Number(value);
    setScores(prev => {
      const updated = { ...prev };
      updated[playerKey] = [...prev[playerKey]];
      updated[playerKey][setIdx] = parsed;
      return updated;
    });
  };

  const getTotal = (playerKey) => {
    return scores[playerKey].reduce((sum, s) => sum + (typeof s === 'number' ? s : 0), 0);
  };

  const handleSubmit = () => {
    const cleanScores = {};
    playerKeys.forEach(key => {
      cleanScores[key] = scores[key].map(s => typeof s === 'number' ? s : 0);
    });
    onUpdate(scorecard.id, { ...cleanScores, status: 'submitted', east_verified: false });
  };

  const handleVerify = () => {
    onUpdate(scorecard.id, { status: 'verified', east_verified: true });
  };

  const statusBadge = {
    pending: { label: 'Pending', icon: Clock, className: 'bg-secondary text-secondary-foreground' },
    submitted: { label: 'Awaiting Verification', icon: Send, className: 'bg-accent/20 text-accent-foreground' },
    verified: { label: 'Verified', icon: ShieldCheck, className: 'bg-primary/15 text-primary' },
  };

  // Determine if editing is allowed: must have canEdit=true AND tournament must be active AND scorecard not verified
  const isVerified = scorecard.status === 'verified';
  const isTournamentCompleted = tournamentStatus === 'completed';
  const canModify = canEdit && !isTournamentCompleted && !isVerified;

  const st = statusBadge[scorecard.status] || statusBadge.pending;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base">Table {scorecard.table_number}</CardTitle>
          <Badge className={st.className}>
            <st.icon className="h-3 w-3 mr-1" />
            {st.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Player</th>
                {[1, 2, 3, 4].map(s => (
                  <th key={s} className="text-center py-2 px-1 font-medium text-muted-foreground w-16">Set {s}</th>
                ))}
                <th className="text-center py-2 pl-2 font-bold w-16">Total</th>
              </tr>
            </thead>
            <tbody>
              {playerKeys.map((key, idx) => (
                <tr key={key} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] px-1 py-0 ${WIND_COLORS[WINDS[idx]]}`}>
                        {WINDS[idx].charAt(0)}
                      </Badge>
                      <span className="font-medium text-xs truncate max-w-[100px]">
                        {getPlayerName(scorecard[playerIdKeys[idx]])}
                      </span>
                    </div>
                  </td>
                  {[0, 1, 2, 3].map(setIdx => (
                    <td key={setIdx} className="py-2 px-1">
                      <Input
                        type="number"
                        value={scores[key][setIdx]}
                        onChange={e => handleScoreChange(key, setIdx, e.target.value)}
                        className="h-8 w-16 text-center text-xs"
                        disabled={!canModify}
                      />
                    </td>
                  ))}
                  <td className={`py-2 pl-2 text-center font-bold text-sm ${getTotal(key) < 0 ? 'text-destructive' : ''}`}>
                    {getTotal(key)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 mt-4">
          {!canModify && isTournamentCompleted && (
            <p className="text-xs text-muted-foreground text-center w-full py-1">
              Score entry is locked — tournament has ended.
            </p>
          )}
          {!canModify && isVerified && !isTournamentCompleted && (
            <p className="text-xs text-muted-foreground text-center w-full py-1">
              Scores are verified and locked. Only admins can modify verified scores.
            </p>
          )}
          {canModify && scorecard.status !== 'verified' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={handleSubmit}
            >
              <Send className="h-3.5 w-3.5" /> Submit Scores
            </Button>
          )}
          {canModify && scorecard.status === 'submitted' && (
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleVerify}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> East Verify
            </Button>
          )}
          {isVerified && !isTournamentCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => onUpdate(scorecard.id, { status: 'submitted', east_verified: false })}
            >
              Unlock for Editing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}