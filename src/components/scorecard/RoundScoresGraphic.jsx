import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp } from 'lucide-react';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East:  { bg: 'bg-red-500',   text: 'text-white', light: 'bg-red-50 text-red-700' },
  South: { bg: 'bg-blue-500',  text: 'text-white', light: 'bg-blue-50 text-blue-700' },
  West:  { bg: 'bg-green-500', text: 'text-white', light: 'bg-green-50 text-green-700' },
  North: { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50 text-amber-700' },
};

/**
 * Displays scorecard as graphical round boxes with 4 hands, player names, and scores
 * Props: scorecards (array), registrations (array), currentUserId
 */
export default function RoundScoresGraphic({ scorecards, registrations, currentUserId }) {
  const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
  const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

  const getPlayerName = (id) => {
    const reg = registrations.find(r => r.player_id === id);
    return reg?.player_name || 'Unknown';
  };

  // Group scorecards by round
  const roundMap = {};
  scorecards.forEach(sc => {
    if (!roundMap[sc.round_number]) roundMap[sc.round_number] = [];
    roundMap[sc.round_number].push(sc);
  });

  if (Object.keys(roundMap).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No rounds yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.keys(roundMap)
        .sort((a, b) => Number(a) - Number(b))
        .map(roundNum => {
          const roundScores = roundMap[roundNum];
          
          // Build a map of player → their scores for this round
          const playerRoundData = {};
          roundScores.forEach(sc => {
            playerIdKeys.forEach((idKey, idx) => {
              const playerId = sc[idKey];
              const scoreKey = scoreKeys[idx];
              const wind = WINDS[idx];
              
              if (!playerRoundData[playerId]) {
                playerRoundData[playerId] = {
                  name: getPlayerName(playerId),
                  wind,
                  handScores: [0, 0, 0, 0],
                };
              }
              
              // Collect hand scores from this scorecard
              const handScores = sc[scoreKey] || [0, 0, 0, 0];
              handScores.forEach((score, handIdx) => {
                playerRoundData[playerId].handScores[handIdx] = score;
              });
            });
          });

          const players = Object.keys(playerRoundData)
            .map(pid => ({ id: pid, ...playerRoundData[pid] }))
            .sort((a, b) => {
              // Sort by wind order: East, South, West, North
              return WINDS.indexOf(a.wind) - WINDS.indexOf(b.wind);
            });

          // Calculate totals
          const playerTotals = players.map(p => ({
            ...p,
            total: p.handScores.reduce((sum, s) => sum + (Number(s) || 0), 0),
          }));

          const roundTotal = playerTotals.reduce((sum, p) => sum + p.total, 0);

          return (
            <Card key={roundNum} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Round {roundNum}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className={`text-2xl font-bold font-heading ${roundTotal < 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {roundTotal > 0 ? '+' : ''}{roundTotal}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Hand headers */}
                <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground">
                  <div>Player</div>
                  <div className="text-center">H1</div>
                  <div className="text-center">H2</div>
                  <div className="text-center">H3</div>
                  <div className="text-center">H4</div>
                </div>

                {/* Player rows */}
                <div className="space-y-2 border-t pt-3">
                  {playerTotals.map(player => (
                    <div key={player.id} className={`grid grid-cols-5 gap-2 p-3 rounded-lg items-center ${
                      player.id === currentUserId ? 'bg-primary/10' : 'bg-muted/40'
                    }`}>
                      {/* Name + Wind */}
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${WIND_COLORS[player.wind].light}`}>
                          {player.wind[0]}
                        </span>
                        <span className={`text-sm font-medium truncate ${player.id === currentUserId ? 'font-bold text-primary' : ''}`}>
                          {player.name}
                        </span>
                      </div>

                      {/* Hand scores */}
                      {player.handScores.map((score, idx) => (
                        <div key={idx} className="text-center">
                          <span className={`text-sm font-bold font-heading ${
                            Number(score) < 0 ? 'text-destructive' : Number(score) > 0 ? 'text-foreground' : 'text-muted-foreground/40'
                          }`}>
                            {Number(score) > 0 ? '+' : ''}{score}
                          </span>
                        </div>
                      ))}

                      {/* Round total (right side) */}
                      <div className="text-right pl-2 border-l border-border">
                        <span className={`text-sm font-bold font-heading ${
                          player.total < 0 ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {player.total > 0 ? '+' : ''}{player.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Round summary */}
                <div className="pt-2 border-t flex items-center justify-between text-sm font-semibold">
                  <span>Round Total</span>
                  <span className={roundTotal < 0 ? 'text-destructive' : 'text-foreground'}>
                    {roundTotal > 0 ? '+' : ''}{roundTotal}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}