import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { handLogs as handLogsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, History, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import HandLogComposer from '@/components/hand-logging/HandLogComposer';
import LeagueRoundsSection from '@/components/hand-logging/LeagueRoundsSection';
import LeagueRoundRow from '@/components/hand-logging/LeagueRoundRow';
import { useLeagueRounds } from '@/hooks/useLeagueRounds';
import BackButton from '@/components/shared/BackButton';

function HandLogRow({ log }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        log.hand_status === 'Won' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
      }`}>
        {log.hand_status === 'Won' ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">
            {log.special_hand_name ? `(Special) ${log.special_hand_name}` : log.category}
          </span>
          {log.line && !log.special_hand_id && (
            <span className="text-xs text-muted-foreground">Line {log.line}</span>
          )}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            log.hand_status === 'Won' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {log.hand_status}
          </span>
          {log.win_type && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {log.win_type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy h:mm a') : '—'}
          </span>
          {log.points != null && (
            <span className="font-semibold text-foreground">{log.points} pts</span>
          )}
          {log.concealed === true && <Badge variant="outline" className="text-[10px]">Concealed</Badge>}
          {log.concealed === false && <Badge variant="outline" className="text-[10px]">Exposed</Badge>}
          {log.round && <span>Round {log.round}</span>}
          {log.table && <span>Table {log.table}</span>}
          {(log.tournament_name || log.league_name) && (
            <span className="truncate">{log.tournament_name || log.league_name}</span>
          )}
        </div>
        {log.notes && <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>}
      </div>
    </div>
  );
}

export default function HandLog() {
  const { user } = useAuth();
  const [tab, setTab] = useState('log');
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['hand-logs-player', user?.id],
    queryFn: () => handLogsApi.filter({ player_id: user.id }, '-created_date', 200),
    enabled: !!user?.id,
  });

  const { rounds: leagueRounds = [] } = useLeagueRounds(user?.email);
  const leagueWonRounds = useMemo(() => leagueRounds.filter((r) => r.wonRound), [leagueRounds]);

  const wonItems = useMemo(() => {
    const items = [
      ...logs.filter((l) => l.hand_status === 'Won').map((l) => ({ kind: 'hand', data: l, date: l.created_date })),
      ...leagueWonRounds.map((r) => ({ kind: 'league', data: r, date: r.sessionDate || r.created_date })),
    ];
    items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return items;
  }, [logs, leagueWonRounds]);

  const allItems = useMemo(() => {
    const items = [
      ...logs.map((l) => ({ kind: 'hand', data: l, date: l.created_date })),
      ...leagueRounds.map((r) => ({ kind: 'league', data: r, date: r.sessionDate || r.created_date })),
    ];
    items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return items;
  }, [logs, leagueRounds]);

  const attemptedItems = useMemo(() => {
    const items = [
      ...logs.filter((l) => l.hand_status === 'Attempted').map((l) => ({ kind: 'hand', data: l, date: l.created_date })),
      ...leagueRounds.filter((r) => !r.wonRound).map((r) => ({ kind: 'league', data: r, date: r.sessionDate || r.created_date })),
    ];
    items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return items;
  }, [logs, leagueRounds]);

  const renderItem = (item) =>
    item.kind === 'hand'
      ? <HandLogRow key={item.data.id} log={item.data} />
      : <LeagueRoundRow key={item.data.id} round={item.data} />;

  return (
    <div className="flex flex-col h-full native-app-shell">
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center gap-3 native-app-header">
        <BackButton to="/app" />
        <div className="flex-1">
          <h1 className="text-lg font-heading font-bold leading-tight">Hand Tracker</h1>
          <p className="text-xs text-muted-foreground">Log winning and attempted hands</p>
        </div>
        <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Log
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 native-app-scroll">
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full h-auto bg-muted rounded-lg border border-border p-1 gap-1">
            <TabsTrigger value="log" className="flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md">
              <History className="w-4 h-4" />
              All ({allItems.length})
            </TabsTrigger>
            <TabsTrigger value="won" className="flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md">
              <Trophy className="w-4 h-4" />
              Won ({wonItems.length})
            </TabsTrigger>
            <TabsTrigger value="attempted" className="flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md">
              <Target className="w-4 h-4" />
              Attempted ({attemptedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
            ) : allItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No hands logged yet</p>
                <Button onClick={() => setComposerOpen(true)} size="sm">
                  <Plus className="w-4 h-4" /> Log your first hand
                </Button>
              </div>
            ) : (
              allItems.map(renderItem)
            )}
          </TabsContent>

          <TabsContent value="won" className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
            ) : wonItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No winning hands logged yet</p>
              </div>
            ) : (
              wonItems.map(renderItem)
            )}
          </TabsContent>

          <TabsContent value="attempted" className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
            ) : attemptedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No attempted hands logged yet</p>
              </div>
            ) : (
              attemptedItems.map(renderItem)
            )}
          </TabsContent>
        </Tabs>

        <LeagueRoundsSection />
      </div>

      <HandLogComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        context={{ card_year: new Date().getFullYear() }}
      />
    </div>
  );
}