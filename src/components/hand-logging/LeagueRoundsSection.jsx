import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLeagueRounds } from '@/hooks/useLeagueRounds';
import { Target } from 'lucide-react';
import LeagueRoundRow from './LeagueRoundRow';

// Dedicated section showing every league round the player has scored in.
export default function LeagueRoundsSection() {
  const { user } = useAuth();
  const { rounds, isLoading } = useLeagueRounds(user?.email);

  const totalScore = rounds.reduce((sum, r) => sum + r.score, 0);
  const wins = rounds.filter((r) => r.wonRound).length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          League Rounds
        </p>
        {rounds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {rounds.length} rounds · {totalScore > 0 ? '+' : ''}{totalScore} pts · {wins} won
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-6">Loading league rounds…</p>
      ) : rounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-card border border-border rounded-2xl">
          <Target className="w-9 h-9 text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">No league rounds played yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((r) => (
            <LeagueRoundRow key={r.id} round={r} />
          ))}
        </div>
      )}
    </div>
  );
}