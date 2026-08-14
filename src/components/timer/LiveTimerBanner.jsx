import React, { useState, useEffect, useRef } from 'react';
import { leagueRoundTimers as leagueRoundTimersApi, roundTimers as roundTimersApi } from '@/services/resources';
import { differenceInSeconds } from 'date-fns';
import { Maximize2, Minimize2, Timer } from 'lucide-react';
import { haptics } from '@/lib/haptics';

function useCountdown(startedAt, durationMinutes, warnAtMinutes) {
  const [elapsed, setElapsed] = useState(0);
  const warnedRef = useRef(false);
  const overtimeRef = useRef(false);
  useEffect(() => {
    if (!startedAt) return;
    warnedRef.current = false;
    overtimeRef.current = false;
    const update = () => setElapsed(differenceInSeconds(new Date(), new Date(startedAt)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const remaining = durationMinutes * 60 - elapsed;
  const isOvertime = remaining < 0;
  const isWarning = warnAtMinutes > 0 && remaining > 0 && remaining <= warnAtMinutes * 60;

  // Haptic alerts
  if (isWarning && !warnedRef.current) { warnedRef.current = true; haptics.warning(); }
  if (isOvertime && !overtimeRef.current) { overtimeRef.current = true; haptics.heavy(); }

  const abs = Math.abs(remaining);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const s = (abs % 60).toString().padStart(2, '0');
  return { display: `${isOvertime ? '+' : ''}${m}:${s}`, isOvertime, isWarning };
}

function TimerFace({ timer, roundLabel, fullscreen, onToggleFullscreen }) {
  const { display, isOvertime, isWarning } = useCountdown(timer?.started_at, timer?.duration_minutes || 60, timer?.warn_at_minutes || 0);
  const status = timer?.status || 'idle';

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <button
          onClick={onToggleFullscreen}
          className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors p-2"
        >
          <Minimize2 className="h-6 w-6" />
        </button>
        <p className="text-slate-400 text-xl font-semibold tracking-widest uppercase mb-6">{roundLabel}</p>
        {status === 'running' ? (
          <div className={`font-mono font-black leading-none select-none ${isOvertime || isWarning ? 'text-red-400' : 'text-emerald-400'}`}
            style={{ fontSize: 'clamp(6rem, 25vw, 20rem)' }}>
            {display}
          </div>
        ) : status === 'stopped' ? (
          <div className="font-mono font-black text-slate-500 leading-none" style={{ fontSize: 'clamp(6rem, 25vw, 20rem)' }}>00:00</div>
        ) : (
          <div className="font-mono font-black text-slate-600 leading-none" style={{ fontSize: 'clamp(6rem, 25vw, 20rem)' }}>--:--</div>
        )}
        <div className={`mt-8 px-6 py-2 rounded-full text-lg font-semibold tracking-wide uppercase ${
          status === 'running' ? 'bg-emerald-900/60 text-emerald-300' :
          status === 'stopped' ? 'bg-red-900/60 text-red-300' :
          'bg-slate-800 text-slate-500'
        }`}>
          {status === 'running' ? 'In Progress' : status === 'stopped' ? 'Stopped' : 'Waiting to Start'}
        </div>
        <p className="mt-6 text-slate-600 text-sm">Tap {<Minimize2 className="inline h-3 w-3" />} to exit fullscreen</p>
      </div>
    );
  }

  // Compact banner
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-xl mb-4 cursor-pointer select-none transition-all active:scale-[0.99] ${
        status === 'running'
          ? (isOvertime || isWarning) ? 'bg-red-900 text-white' : 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-500 border border-slate-200'
      }`}
      onClick={onToggleFullscreen}
    >
      <div className="flex items-center gap-3">
        <Timer className={`h-4 w-4 shrink-0 ${status === 'running' ? (isOvertime ? 'text-red-300' : 'text-emerald-400') : 'text-slate-400'}`} />
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${status === 'running' ? 'text-slate-400' : 'text-slate-400'}`}>{roundLabel}</p>
          <p className={`font-mono font-bold text-2xl leading-none ${
            status === 'running' ? (isOvertime || isWarning ? 'text-red-400' : 'text-emerald-400') : 'text-slate-400'
          }`}>
            {status === 'running' ? display : status === 'stopped' ? '00:00' : '--:--'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          status === 'running' ? 'bg-emerald-800 text-emerald-300' :
          status === 'stopped' ? 'bg-slate-700 text-slate-300' :
          'bg-slate-200 text-slate-400'
        }`}>
          {status === 'running' ? 'Live' : status === 'stopped' ? 'Stopped' : 'Idle'}
        </span>
        <Maximize2 className={`h-4 w-4 ${status === 'running' ? 'text-slate-400' : 'text-slate-300'}`} />
      </div>
    </div>
  );
}

// Tournament timer banner
export function TournamentTimerBanner({ tournamentId }) {
  const [timers, setTimers] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    const fetch = async () => {
      const data = await roundTimersApi.filter({ tournament_id: tournamentId });
      setTimers(data);
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  // Find the currently running timer, or fall back to most recent
  const activeTimer = timers.find(t => t.status === 'running') || timers.sort((a, b) => b.round_number - a.round_number)[0];

  if (!activeTimer) return null;

  return (
    <TimerFace
      timer={activeTimer}
      roundLabel={`Round ${activeTimer.round_number}`}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen(f => !f)}
    />
  );
}

// League timer banner
export function LeagueTimerBanner({ sessionId, leagueId }) {
  const [timers, setTimers] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const fetch = async () => {
      const data = await leagueRoundTimersApi.filter({ session_id: sessionId });
      setTimers(data);
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const activeTimer = timers.find(t => t.status === 'running') || timers.sort((a, b) => b.round_number - a.round_number)[0];

  if (!activeTimer) return null;

  return (
    <TimerFace
      timer={activeTimer}
      roundLabel={`Round ${activeTimer.round_number}`}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen(f => !f)}
    />
  );
}