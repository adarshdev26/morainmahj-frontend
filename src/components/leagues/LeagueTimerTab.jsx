import React, { useState, useEffect } from 'react';
import { leagueRoundTimers as leagueRoundTimersApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, RotateCcw, ExternalLink } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

function Countdown({ startedAt, durationMinutes, warnAtMinutes }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(differenceInSeconds(new Date(), new Date(startedAt)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const totalSecs = durationMinutes * 60;
  const remaining = totalSecs - elapsed;
  const isOvertime = remaining < 0;
  const isWarning = warnAtMinutes > 0 && remaining > 0 && remaining <= warnAtMinutes * 60;
  const display = Math.abs(remaining);
  const m = Math.floor(display / 60).toString().padStart(2, '0');
  const s = (display % 60).toString().padStart(2, '0');

  return (
    <div className={`text-4xl font-mono font-bold ${isOvertime || isWarning ? 'text-red-500' : 'text-emerald-600'}`}>
      {isOvertime ? '+' : ''}{m}:{s}
    </div>
  );
}

export default function LeagueTimerTab({ session, league }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draftDurations, setDraftDurations] = useState({});
  const [draftWarnAt, setDraftWarnAt] = useState({});
  const numRounds = league.num_rounds || 4;

  const { data: timers = [] } = useQuery({
    queryKey: ['league-timers', session.id],
    queryFn: () => leagueRoundTimersApi.filter({ session_id: session.id }),
    enabled: !!session.id,
    refetchInterval: 5000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['league-timers', session.id] });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => leagueRoundTimersApi.update(id, data),
    onSuccess: invalidate,
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => leagueRoundTimersApi.create(data),
    onSuccess: invalidate,
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const getTimer = (roundNum) => timers.find(t => t.round_number === roundNum);

  const handleStart = (roundNum) => {
    const existing = getTimer(roundNum);
    const duration = draftDurations[roundNum] ?? existing?.duration_minutes ?? 60;
    const warnAt = draftWarnAt[roundNum] !== undefined ? draftWarnAt[roundNum] : (existing?.warn_at_minutes ?? null);
    const warnAtVal = warnAt === '' || warnAt === null || warnAt === undefined ? null : Number(warnAt);
    const data = { status: 'running', started_at: new Date().toISOString(), stopped_at: null, duration_minutes: Number(duration), warn_at_minutes: warnAtVal };
    if (existing) {
      saveMutation.mutate({ id: existing.id, data });
    } else {
      createMutation.mutate({ session_id: session.id, league_id: session.league_id, round_number: roundNum, ...data });
    }
  };

  const handleStop = (roundNum) => {
    const existing = getTimer(roundNum);
    if (!existing) return;
    saveMutation.mutate({ id: existing.id, data: { status: 'stopped', stopped_at: new Date().toISOString() } });
  };

  const handleReset = (roundNum) => {
    const existing = getTimer(roundNum);
    if (!existing) return;
    saveMutation.mutate({ id: existing.id, data: { status: 'idle', started_at: null, stopped_at: null } });
  };

  if (!league.table_assignments_enabled) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Timers are available when table assignments are enabled for this league.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Set a duration and start the timer for each round. The countdown auto-updates every 5 seconds.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: numRounds }, (_, i) => i + 1).map(roundNum => {
          const timer = getTimer(roundNum);
          const status = timer?.status || 'idle';
          const duration = draftDurations[roundNum] ?? timer?.duration_minutes ?? 60;
          const warnAt = draftWarnAt[roundNum] !== undefined ? draftWarnAt[roundNum] : (timer?.warn_at_minutes ?? '');

          return (
            <Card key={roundNum} className="border border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Round {roundNum}</CardTitle>
                  <Badge className={
                    status === 'running' ? 'bg-emerald-100 text-emerald-700' :
                    status === 'stopped' ? 'bg-slate-100 text-slate-600' :
                    'bg-slate-100 text-slate-400'
                  }>
                    {status === 'running' ? 'Running' : status === 'stopped' ? 'Stopped' : 'Idle'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                   <Clock className="h-4 w-4 text-slate-400" />
                   <span className="text-slate-500">Duration:</span>
                   <Input
                     type="number"
                     min={1}
                     value={duration}
                     onChange={e => setDraftDurations(d => ({ ...d, [roundNum]: e.target.value }))}
                     className="h-7 w-20 text-center text-sm"
                     disabled={status === 'running'}
                   />
                   <span className="text-slate-400">min</span>
                 </div>

                 <div className="flex items-center gap-2 text-sm">
                   <span className="text-slate-500 text-xs">🔴 Red at:</span>
                   <Input
                     type="number"
                     min={0}
                     placeholder="off"
                     value={warnAt}
                     onChange={e => setDraftWarnAt(d => ({ ...d, [roundNum]: e.target.value }))}
                     className="h-7 w-20 text-center text-sm"
                     disabled={status === 'running'}
                   />
                   <span className="text-slate-400 text-xs">min left</span>
                 </div>

                 {status === 'running' && timer?.started_at && (
                   <Countdown startedAt={timer.started_at} durationMinutes={Number(duration)} warnAtMinutes={Number(warnAt) || 0} />
                 )}

                {timer?.started_at && (
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div>Started: {format(new Date(timer.started_at), 'h:mm:ss a')}</div>
                    {timer.stopped_at && <div>Stopped: {format(new Date(timer.stopped_at), 'h:mm:ss a')}</div>}
                  </div>
                )}

                <div className="flex gap-2">
                  {status !== 'running' ? (
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => handleStart(roundNum)}>
                      <Play className="h-3.5 w-3.5" />
                      {status === 'stopped' ? 'Restart' : 'Start'}
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 gap-1.5" onClick={() => handleStop(roundNum)}>
                      <Square className="h-3.5 w-3.5" />
                      Stop
                    </Button>
                  )}
                  {status !== 'idle' && (
                    <Button size="sm" variant="outline" onClick={() => handleReset(roundNum)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    title="Open timer display in new window"
                    onClick={() => window.open(`/league-timer-display?session=${session.id}&round=${roundNum}`, `league_timer_r${roundNum}`, 'width=1280,height=720')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}