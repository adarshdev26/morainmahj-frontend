import React from 'react';
import { format } from 'date-fns';
import { Trophy, Calendar, Hash } from 'lucide-react';

export default function LeagueRoundRow({ round }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        round.wonRound ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
      }`}>
        {round.wonRound ? <Trophy className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{round.leagueName}</span>
          {round.wonRound && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Won round
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {round.sessionDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(round.sessionDate), 'MMM d, yyyy')}
            </span>
          )}
          {round.round != null && <span>Round {round.round}</span>}
          {round.table != null && <span>Table {round.table}</span>}
        </div>
      </div>
      <span className={`text-sm font-bold shrink-0 ${
        round.score > 0 ? 'text-green-600' : round.score < 0 ? 'text-red-600' : 'text-muted-foreground'
      }`}>
        {round.score > 0 ? '+' : ''}{round.score}
      </span>
    </div>
  );
}