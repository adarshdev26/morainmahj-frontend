import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { registrations as registrationsApi, scoreCards as scoreCardsApi } from '@/services/resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

export default function PlayerMatchups({ playerId, userEmail }) {
  // Fetch all scorecards where this player participated
  const { data: scorecards = [] } = useQuery({
    queryKey: ['player-matchups', playerId],
    queryFn: async () => {
      const cards = await scoreCardsApi.filter({
        $or: [
          { player1_id: playerId },
          { player2_id: playerId },
          { player3_id: playerId },
          { player4_id: playerId },
        ]
      });
      return cards || [];
    },
    enabled: !!playerId,
  });

  // Fetch tournament registrations to map player IDs to names
  const { data: registrations = [] } = useQuery({
    queryKey: ['player-registrations', playerId],
    queryFn: async () => {
      const regs = await registrationsApi.filter({ player_id: playerId });
      return regs || [];
    },
    enabled: !!playerId,
  });

  // Calculate matchup stats
  const matchupStats = useMemo(() => {
    const opponents = {};
    const playerScores = [];

    scorecards.forEach(card => {
      const playerIndex = card.player1_id === playerId ? 0 : 
                         card.player2_id === playerId ? 1 : 
                         card.player3_id === playerId ? 2 : 
                         card.player4_id === playerId ? 3 : null;

      if (playerIndex === null) return;

      const playerScoreArray = playerIndex === 0 ? card.player1_scores :
                              playerIndex === 1 ? card.player2_scores :
                              playerIndex === 2 ? card.player3_scores :
                              card.player4_scores;

      const otherPlayers = [
        { id: card.player1_id, name: card.player1_id, index: 0 },
        { id: card.player2_id, name: card.player2_id, index: 1 },
        { id: card.player3_id, name: card.player3_id, index: 2 },
        { id: card.player4_id, name: card.player4_id, index: 3 },
      ].filter((p, i) => i !== playerIndex);

      const playerTotal = playerScoreArray ? playerScoreArray.reduce((a, b) => a + (b || 0), 0) : 0;

      otherPlayers.forEach(opponent => {
        if (!opponent.id || opponent.id === playerId) return;

        const reg = registrations.find(r => r.player_id === opponent.id);
        const opponentName = reg?.player_name || opponent.id.substring(0, 8);

        if (!opponents[opponent.id]) {
          opponents[opponent.id] = {
            id: opponent.id,
            name: opponentName,
            matchups: 0,
            playerWins: 0,
            playerLosses: 0,
          };
        }

        opponents[opponent.id].matchups++;

        const opponentScoreArray = opponent.index === 0 ? card.player1_scores :
                                  opponent.index === 1 ? card.player2_scores :
                                  opponent.index === 2 ? card.player3_scores :
                                  card.player4_scores;

        const opponentTotal = opponentScoreArray ? opponentScoreArray.reduce((a, b) => a + (b || 0), 0) : 0;

        if (playerTotal > opponentTotal) {
          opponents[opponent.id].playerWins++;
        } else if (playerTotal < opponentTotal) {
          opponents[opponent.id].playerLosses++;
        }
      });
    });

    return Object.values(opponents).sort((a, b) => b.matchups - a.matchups);
  }, [scorecards, registrations, playerId]);

  // Data for opponent frequency chart
  const frequencyData = useMemo(() => {
    return matchupStats.map(opp => ({
      name: opp.name,
      matchups: opp.matchups,
    })).slice(0, 10);
  }, [matchupStats]);

  // Data for win/loss pie chart
  const winLossData = useMemo(() => {
    const totalWins = matchupStats.reduce((sum, opp) => sum + opp.playerWins, 0);
    const totalLosses = matchupStats.reduce((sum, opp) => sum + opp.playerLosses, 0);
    return [
      { name: 'Wins', value: totalWins, color: '#10b981' },
      { name: 'Losses', value: totalLosses, color: '#ef4444' },
    ];
  }, [matchupStats]);

  const totalMatchups = matchupStats.reduce((sum, opp) => sum + opp.matchups, 0);
  const totalWins = matchupStats.reduce((sum, opp) => sum + opp.playerWins, 0);
  const winRate = totalMatchups > 0 ? ((totalWins / totalMatchups) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Matchups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMatchups}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique opponents faced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{totalWins} wins across all matches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Games Played</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scorecards.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total scorecard entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Win/Loss Pie Chart */}
        {winLossData[0].value + winLossData[1].value > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall Win/Loss</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {winLossData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Opponent Frequency Chart */}
        {frequencyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most Frequent Opponents</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="matchups" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Matchup Table */}
      {matchupStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Head-to-Head Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchupStats.map((opp) => {
                const winPct = opp.matchups > 0 ? ((opp.playerWins / opp.matchups) * 100).toFixed(0) : '0';
                return (
                  <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">{opp.name}</p>
                      <p className="text-xs text-slate-500">{opp.matchups} matchup{opp.matchups !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {opp.playerWins}W
                        </Badge>
                        <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100 ml-1">
                          {opp.playerLosses}L
                        </Badge>
                      </div>
                      <div className="text-right w-12">
                        <p className="text-sm font-bold">{winPct}%</p>
                        <p className="text-xs text-muted-foreground">win</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {matchupStats.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No matchup history yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}