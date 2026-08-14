import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function InviteAnalyticsCharts({ allPlayers, allRegistrations, allTournaments, allScoreCards, playerStats }) {
  // Activity distribution
  const totalPlayers = allPlayers.length;
  const neverRegistered = totalPlayers - new Set(allRegistrations.map(r => r.player_id)).size;
  const registered = new Set(allRegistrations.map(r => r.player_id)).size;
  const confirmed = new Set(allRegistrations.filter(r => r.status === 'confirmed').map(r => r.player_id)).size;
  const played = new Set(allScoreCards.flatMap(sc => [sc.player1_id, sc.player2_id, sc.player3_id, sc.player4_id]).filter(Boolean)).size;

  const activityData = [
    { name: 'Profile Only', value: neverRegistered, color: '#e2e8f0' },
    { name: 'Registered', value: registered - confirmed, color: '#fbbf24' },
    { name: 'Confirmed', value: confirmed - played, color: '#10b981' },
    { name: 'Played', value: played, color: '#3b82f6' },
  ];

  // Tournaments by player engagement
  const tournamentEngagement = allTournaments.map(t => {
    const tRegs = allRegistrations.filter(r => r.tournament_id === t.id);
    const confirmed = tRegs.filter(r => r.status === 'confirmed').length;
    const played = new Set(
      allScoreCards
        .filter(sc => sc.tournament_id === t.id)
        .flatMap(sc => [sc.player1_id, sc.player2_id, sc.player3_id, sc.player4_id])
    ).size;
    return {
      name: t.name.substring(0, 15),
      registered: tRegs.length,
      confirmed,
      played,
    };
  }).slice(0, 8);

  // Tournament frequency (how many tournaments per player)
  const freqData = Object.values(playerStats)
    .reduce((acc, stat) => {
      const count = stat.tournamentsPlayed || 0;
      acc[count] = (acc[count] || 0) + 1;
      return acc;
    }, {});

  const frequencyData = Object.entries(freqData)
    .map(([tournaments, players]) => ({
      tournaments: `${tournaments} tournament${tournaments !== '1' ? 's' : ''}`,
      players: parseInt(players),
    }))
    .sort((a, b) => parseInt(a.tournaments) - parseInt(b.tournaments));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Activity distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={activityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                {activityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} players`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1 text-xs">
            {activityData.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tournament engagement */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tournament Engagement (Recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tournamentEngagement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="registered" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="confirmed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="played" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Player Commitment</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={frequencyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="tournaments" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="players" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}