import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { raffleTickets as raffleTicketsApi, raffles as rafflesApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trophy, Ticket } from 'lucide-react';
import confetti from 'canvas-confetti';
import Logo from '@/components/Logo';

export default function RaffleDisplay() {
  const { raffleId } = useParams();
  const [spinning, setSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState(null);
  const [winner, setWinner] = useState(null);
  const [drawError, setDrawError] = useState(null);
  const intervalRef = useRef(null);

  const { data: raffle, refetch } = useQuery({
    queryKey: ['raffle-display', raffleId],
    queryFn: () => rafflesApi.list().then(r => r.find(x => x.id === raffleId)),
    refetchInterval: 3000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['raffle-tickets-display', raffleId],
    queryFn: () => raffleTicketsApi.list().then(r => r.filter(t => t.raffle_id === raffleId)),
    refetchInterval: 3000,
  });

  const totalTickets = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
  const halfPot = raffle?.fifty_fifty_total_cents ? (raffle.fifty_fifty_total_cents / 2 / 100).toFixed(2) : null;
  const pot = halfPot ? `$${halfPot}` : null;

  useEffect(() => {
    if (raffle?.status === 'drawn' && raffle.winner_ticket_number) {
      setDisplayNumber(raffle.winner_ticket_number);
      setWinner({
        name: raffle.winner_player_name,
        ticket: raffle.winner_ticket_number,
        prize: raffle.winner_prize_name,
      });
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
    }
  }, [raffle?.status, raffle?.winner_ticket_number]);

  const handleSpin = async () => {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);

    let speed = 50;
    let count = 0;
    const maxCount = 60;

    intervalRef.current = setInterval(() => {
      const allNums = tickets.flatMap(t => t.ticket_numbers || []);
      if (allNums.length > 0) {
        setDisplayNumber(allNums[Math.floor(Math.random() * allNums.length)]);
      } else {
        setDisplayNumber(Math.floor(Math.random() * (totalTickets || 100)) + 1);
      }
      count++;
      if (count > maxCount) {
        clearInterval(intervalRef.current);
        setSpinning(false);
        // Trigger actual draw via backend
        callAction('drawRaffle', { raffle_id: raffleId }).then((res) => {
          if (res?.error) {
            setDrawError(res.error);
          } else {
            refetch();
          }
        }).catch(err => setDrawError(err.message));
      }
    }, speed);
  };

  if (!raffle) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle, #f59e0b 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 text-center max-w-2xl w-full">
        {/* Raffle name */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Ticket className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl font-heading font-light tracking-widest uppercase text-amber-400">
            {raffle.name}
          </h1>
          <Ticket className="h-8 w-8 text-amber-400" />
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-12 text-slate-400 text-sm">
          <div>
            <span className="block text-2xl font-bold text-white">{totalTickets || raffle.total_tickets_sold || 0}</span>
            Tickets Sold
          </div>
          {pot && raffle.show_running_total && (
            <div>
              <span className="block text-2xl font-bold text-amber-400">{pot}</span>
              Winner Takes
            </div>
          )}
          {raffle.prizes?.length > 0 && (
            <div>
              <span className="block text-2xl font-bold text-white">{raffle.prizes.length}</span>
              Prizes
            </div>
          )}
        </div>

        {/* Number display */}
        <div className="relative mb-12">
          <div className={`
            w-64 h-64 mx-auto rounded-full border-4 flex items-center justify-center
            text-7xl font-bold transition-all duration-100
            ${spinning ? 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)] scale-105' : 'border-slate-600'}
            ${winner ? 'border-green-400 shadow-[0_0_80px_rgba(74,222,128,0.6)]' : ''}
          `}>
            {displayNumber !== null ? (
              <span className={`
                ${spinning ? 'text-amber-400 animate-pulse' : ''}
                ${winner ? 'text-green-400' : 'text-white'}
              `}>
                {displayNumber}
              </span>
            ) : (
              <div className="text-white opacity-80">
                <Logo variant="icon" size="lg" theme="dark" />
              </div>
            )}
          </div>
        </div>

        {/* Winner reveal */}
        {winner && (
          <div className="mb-10">
            <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 text-slate-900 rounded-2xl p-8 shadow-2xl shadow-amber-500/40 border-2 border-amber-300">
              <Trophy className="h-14 w-14 mx-auto mb-3 drop-shadow" />
              <p className="text-5xl font-bold font-heading mb-3">🎉 {winner.name}!</p>
              <p className="text-2xl font-semibold mb-1">Ticket #{winner.ticket}</p>
              {raffle?.type === 'fifty_fifty' && halfPot && (
                <p className="text-3xl font-bold mt-3 bg-white/30 rounded-xl px-6 py-3 inline-block">
                  💰 Wins ${halfPot}!
                </p>
              )}
              {raffle?.type !== 'fifty_fifty' && winner.prize && (
                <p className="text-xl mt-2 font-semibold">🏆 Prize: {winner.prize}</p>
              )}
            </div>
          </div>
        )}

        {/* Draw button (only if not yet drawn) */}
        {raffle.status === 'open' && !winner && (
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={spinning || totalTickets === 0}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xl px-12 py-6 h-auto rounded-full shadow-lg shadow-amber-500/30 disabled:opacity-50"
          >
            {spinning ? 'Drawing…' : '🎰 Draw Winner'}
          </Button>
        )}

        {raffle.status === 'closed' && !winner && (
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={spinning || totalTickets === 0}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xl px-12 py-6 h-auto rounded-full shadow-lg shadow-amber-500/30"
          >
            {spinning ? 'Drawing…' : '🎰 Draw Winner'}
          </Button>
        )}

        {raffle.status === 'drawn' && winner && (
          <p className="text-slate-400 text-sm mt-4">Raffle complete</p>
        )}

        {drawError && (
          <div className="mt-4 bg-red-900/60 border border-red-500 rounded-xl px-5 py-3 text-red-300 text-sm">
            ⚠️ {drawError}
          </div>
        )}

        {/* Prize list */}
        {raffle.prizes?.length > 0 && !winner && (
          <div className="mt-10 text-left bg-slate-800/60 rounded-xl p-5 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Prizes</p>
            <ul className="space-y-1">
              {raffle.prizes.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-200">
                  <span className="text-amber-400">🏆</span> {p.name}
                  {p.description && <span className="text-slate-500 text-sm">— {p.description}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}