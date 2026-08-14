import React from 'react';
import { prizeWinners as prizeWinnersApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Trophy, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORY_LABELS = {
  '1st': '🥇 1st Place',
  '2nd': '🥈 2nd Place',
  '3rd': '🥉 3rd Place',
  'round_1': 'Round 1 Winner',
  'round_2': 'Round 2 Winner',
  'round_3': 'Round 3 Winner',
  'round_4': 'Round 4 Winner',
};

export default function MyPrizeEarnings({ userId }) {
  const { data: prizes = [], isLoading } = useQuery({
    queryKey: ['my-prizes', userId],
    queryFn: () => prizeWinnersApi.filter({ player_id: userId }),
    enabled: !!userId,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-list'],
    queryFn: () => tournamentsApi.list(),
    enabled: prizes.length > 0,
  });

  if (isLoading) return null;
  if (prizes.length === 0) return null;

  const totalEarnings = prizes.reduce((sum, p) => sum + (p.amount || 0), 0);

  const getTournamentName = (tid) => {
    return tournaments.find(t => t.id === tid)?.name || 'Tournament';
  };

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-semibold text-slate-800">Prize Earnings</h3>
          <span className="ml-auto text-sm font-bold text-green-700 flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {totalEarnings.toLocaleString()} total
          </span>
        </div>
        <div className="space-y-2">
          {prizes.map((prize) => (
            <div key={prize.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">{CATEGORY_LABELS[prize.category] || prize.category}</p>
                <p className="text-xs text-amber-700">{getTournamentName(prize.tournament_id)}</p>
              </div>
              <p className="text-base font-bold text-green-700">${prize.amount?.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}