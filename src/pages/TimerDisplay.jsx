import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { roundTimers as roundTimersApi } from '@/services/resources';
import { differenceInSeconds } from 'date-fns';

function useTimer(tournamentId, roundNumber) {
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    if (!tournamentId || !roundNumber) return;

    const fetchTimer = async () => {
      const timers = await roundTimersApi.filter({ tournament_id: tournamentId });
      const t = timers.find(t => t.round_number === Number(roundNumber));
      setTimer(t || null);
    };

    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [tournamentId, roundNumber]);

  return timer;
}

function Countdown({ startedAt, durationMinutes, warnAtMinutes, stopped }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (stopped) return;
    const update = () => {
      setElapsed(differenceInSeconds(new Date(), new Date(startedAt)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt, stopped]);

  const totalSecs = durationMinutes * 60;
  const remaining = totalSecs - elapsed;
  const isOvertime = remaining < 0;
  const isWarning = warnAtMinutes > 0 && remaining > 0 && remaining <= warnAtMinutes * 60;
  const display = Math.abs(remaining);
  const m = Math.floor(display / 60).toString().padStart(2, '0');
  const s = (display % 60).toString().padStart(2, '0');

  return (
    <div className={`font-mono font-black leading-none select-none ${isOvertime || isWarning ? 'text-red-400' : 'text-emerald-400'}`}
      style={{ fontSize: 'clamp(6rem, 22vw, 18rem)' }}>
      {isOvertime ? '+' : ''}{m}:{s}
    </div>
  );
}

export default function TimerDisplay() {
  const { tournamentId } = useParams();
  const [searchParams] = useSearchParams();
  const roundNumber = searchParams.get('round');

  const timer = useTimer(tournamentId, roundNumber);

  const status = timer?.status || 'idle';
  const duration = timer?.duration_minutes || 60;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      {/* Round label */}
      <p className="text-slate-400 text-2xl font-semibold tracking-widest uppercase mb-4">
        Round {roundNumber}
      </p>

      {/* Timer */}
      {status === 'running' && timer?.started_at ? (
        <Countdown startedAt={timer.started_at} durationMinutes={Number(duration)} warnAtMinutes={Number(timer?.warn_at_minutes) || 0} stopped={false} />
      ) : status === 'stopped' ? (
        <div className="font-mono font-black text-slate-500 leading-none select-none"
          style={{ fontSize: 'clamp(6rem, 22vw, 18rem)' }}>
          00:00
        </div>
      ) : (
        <div className="font-mono font-black text-slate-600 leading-none select-none"
          style={{ fontSize: 'clamp(6rem, 22vw, 18rem)' }}>
          --:--
        </div>
      )}

      {/* Status badge */}
      <div className={`mt-8 px-6 py-2 rounded-full text-lg font-semibold tracking-wide uppercase ${
        status === 'running' ? 'bg-emerald-900/60 text-emerald-300' :
        status === 'stopped' ? 'bg-red-900/60 text-red-300' :
        'bg-slate-800 text-slate-500'
      }`}>
        {status === 'running' ? 'In Progress' : status === 'stopped' ? 'Stopped' : 'Waiting to Start'}
      </div>

      {status === 'running' && (
        <p className="mt-4 text-slate-600 text-sm">Updates automatically every 5 seconds</p>
      )}
    </div>
  );
}