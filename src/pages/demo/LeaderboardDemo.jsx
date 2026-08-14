import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, ShieldCheck, RefreshCw, ChevronLeft } from 'lucide-react';
import DemoBottomNav from '@/components/layout/DemoBottomNav';

const MOCK_RANKINGS = [
  { id: '1', name: 'Sandra K.',   rounds: { 1: +82,  2: +64,  3: +56,  4: +46  } },
  { id: '2', name: 'Ruth M.',     rounds: { 1: +48,  2: +72,  3: +38,  4: +38  } },
  { id: '3', name: 'Gloria N.',   rounds: { 1: +56,  2: +44,  3: +52,  4: +32  } },
  { id: '4', name: 'Barbara W.',  rounds: { 1: +36,  2: +32,  3: +44,  4: +30  } },
  { id: '5', name: 'Phyllis T.',  rounds: { 1: +28,  2: +18,  3: +22,  4: +12  } },
  { id: '6', name: 'Doris L.',    rounds: { 1: +12,  2: +24,  3: +8,   4: +26  } },
  { id: '7', name: 'Helen R.',    rounds: { 1: +4,   2: -8,   3: +16,  4: +22  } },
  { id: '8', name: 'Alice P.',    rounds: { 1: -6,   2: +12,  3: -4,   4: +14  } },
  { id: '9', name: 'Margaret S.', rounds: { 1: -14,  2: -8,   3: +10,  4: -4   } },
  { id: '10', name: 'Frances J.', rounds: { 1: -28,  2: -16,  3: -18,  4: -12  } },
].map(p => ({ ...p, total: Object.values(p.rounds).reduce((s, v) => s + v, 0) }))
 .sort((a, b) => b.total - a.total)
 .map((p, i) => ({ ...p, rank: i + 1 }));

const ME_ID = '5'; // Phyllis is "me" for demo

function rankIcon(rank) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-mono w-5 text-center inline-block">{rank}</span>;
}

function fmt(score) {
  if (score === undefined || score === null) return '—';
  return score > 0 ? `+${score}` : String(score);
}

function LeaderboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-4 pt-12 pb-4">
        <button className="flex items-center gap-1 text-sm text-primary-foreground/60 mb-2">
          <ChevronLeft className="w-4 h-4" /> Back to Tournament
        </button>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-400" /> Leaderboard
        </h1>
        <p className="text-xs text-primary-foreground/50 mt-1 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Live · Spring Invitational 2026
        </p>
      </div>

      <div className="flex-1 px-4 pb-32 pt-4 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            16/16 tables verified
          </Badge>
          <Badge variant="outline" className="text-xs">10 players ranked</Badge>
          <Badge className="bg-primary/15 text-primary text-xs">Live</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10 text-center pl-4">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center w-14">R1</TableHead>
                    <TableHead className="text-center w-14">R2</TableHead>
                    <TableHead className="text-center w-14">R3</TableHead>
                    <TableHead className="text-center w-14">R4</TableHead>
                    <TableHead className="text-center font-bold pr-4">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_RANKINGS.map(player => {
                    const isMe = player.id === ME_ID;
                    return (
                      <TableRow key={player.id}
                        className={isMe ? 'bg-primary/10 border-l-2 border-primary' : player.rank <= 3 ? 'bg-amber-50/10' : ''}>
                        <TableCell className="pl-4">
                          <div className="flex items-center justify-center">{rankIcon(player.rank)}</div>
                        </TableCell>
                        <TableCell className={isMe ? 'font-bold' : 'font-medium'}>
                          {player.name}
                          {isMe && <span className="text-primary ml-1.5 text-xs font-normal">(you)</span>}
                        </TableCell>
                        {[1, 2, 3, 4].map(r => (
                          <TableCell key={r} className={`text-center text-sm ${player.rounds[r] < 0 ? 'text-destructive' : player.rounds[r] > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {fmt(player.rounds[r])}
                          </TableCell>
                        ))}
                        <TableCell className={`text-center font-bold text-base pr-4 ${player.total < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {fmt(player.total)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LeaderboardDemo() {
  return (
    <div className="relative w-full min-h-screen">
      <LeaderboardPage />
      <DemoBottomNav activeTab="Tournaments" />
    </div>
  );
}