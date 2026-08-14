import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { raffleTickets as raffleTicketsApi, raffles as rafflesApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import TRafflePlayerAllocate from './TRafflePlayerAllocate';

function ticketRangeLabel(numbers) {
  if (!numbers || numbers.length === 0) return '';
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.length === 1) return `#${sorted[0]}`;
  const isConsecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  if (isConsecutive) return `#${sorted[0]}–#${sorted[sorted.length - 1]}`;
  return sorted.map(n => `#${n}`).join(', ');
}

export default function RaffleTicketPurchase({ tournamentId, leagueId, user }) {
  const qc = useQueryClient();
  const [buying, setBuying] = useState({});
  const [expanded, setExpanded] = useState({});

  const { data: raffles = [] } = useQuery({
    queryKey: ['player-raffles', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return rafflesApi.filter(filter);
    },
  });

  const { data: myTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['my-raffle-tickets', user?.id],
    queryFn: () => raffleTicketsApi.filter({ player_id: user.id }),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const openRaffles = raffles.filter(r => r.status === 'open');
  const closedRaffles = raffles.filter(r => r.status === 'closed' || r.status === 'drawn');

  const handleBuy = async (raffle) => {
    setBuying(b => ({ ...b, [raffle.id]: true }));
    const res = await callAction('raffleCheckout', {
      raffle_id: raffle.id,
      quantity: raffle.bundle_qty || 1,
    });
    setBuying(b => ({ ...b, [raffle.id]: false }));
    if (res?.url) {
      window.open(res.url, '_blank');
    } else if (res?.success) {
      refetchTickets();
      qc.invalidateQueries(['player-raffles', tournamentId, leagueId]);
    }
  };

  const myTicketsForRaffle = (raffleId) => myTickets.filter(t => t.raffle_id === raffleId);

  const renderRaffle = (raffle, showBuy) => {
    const myRaffleTickets = myTicketsForRaffle(raffle.id);
    const myCount = myRaffleTickets.reduce((s, t) => s + (t.quantity || 1), 0);
    const pot = raffle.fifty_fifty_total_cents && raffle.show_running_total
      ? `$${(raffle.fifty_fifty_total_cents / 2 / 100).toFixed(2)}`
      : null;
    const isFree = !raffle.ticket_price_cents || raffle.ticket_price_cents === 0;
    const price = isFree ? 'Free' : `$${((raffle.bundle_price_cents || raffle.ticket_price_cents * (raffle.bundle_qty || 1)) / 100).toFixed(2)}`;
    const isWinner = raffle.winner_player_id === user?.id;
    const isExpanded = expanded[raffle.id] !== false;

    return (
      <Card key={raffle.id} className={`border-amber-200/60 overflow-hidden ${isWinner ? 'border-amber-400 bg-amber-50' : ''}`}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => setExpanded(e => ({ ...e, [raffle.id]: !e[raffle.id] }))}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Ticket className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate">{raffle.name}</span>
            {showBuy && <Badge className="bg-green-100 text-green-700 text-xs">Open</Badge>}
            {raffle.status === 'drawn' && <Badge className="bg-purple-100 text-purple-700 text-xs">Drawn</Badge>}
            {raffle.status === 'closed' && <Badge className="bg-orange-100 text-orange-700 text-xs">Closed</Badge>}
            {pot && <span className="text-xs text-amber-600 font-semibold ml-2">Pot: {pot}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showBuy && !isFree && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {raffle.bundle_qty > 1 ? `${raffle.bundle_qty} tickets` : '1 ticket'} — {price}
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <CardContent className="pt-4 pb-4">
            {/* Winner reveal */}
            {isWinner && raffle.status === 'drawn' && (
              <div className="mb-3 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                <p className="text-sm font-bold text-amber-800">🎉 You won!</p>
                <p className="text-xs text-amber-700">
                  Ticket #{raffle.winner_ticket_number}
                  {raffle.winner_prize_name ? ` — ${raffle.winner_prize_name}` : ''}
                </p>
              </div>
            )}

            {/* 50/50 pot info */}
            {raffle.type === 'fifty_fifty' && pot && (
              <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <p className="text-sm font-semibold text-green-800">Current Pot: <strong>{pot}</strong></p>
                <p className="text-xs text-green-600">Winner takes half • {raffle.total_tickets_sold || 0} tickets sold</p>
              </div>
            )}

            {/* Purchase button */}
            {showBuy && (
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    {raffle.bundle_qty > 1 ? `${raffle.bundle_qty} tickets` : '1 ticket'} — <strong className="text-foreground">{price}</strong>
                  </p>
                  {raffle.type === 'fifty_fifty' && <p className="text-xs text-green-600 mt-0.5">Supports the prize pool!</p>}
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => handleBuy(raffle)}
                  disabled={buying[raffle.id]}
                >
                  {buying[raffle.id] ? 'Processing…' : isFree ? 'Get Ticket' : 'Buy Tickets'}
                </Button>
              </div>
            )}

            {/* Player's ticket numbers */}
            {myCount > 0 && (
              <div className="mb-3 space-y-1">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Ticket className="h-3 w-3 text-amber-500" />
                  Your tickets ({myCount} total):
                </p>
                {myRaffleTickets.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-center gap-1 ml-4">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    {ticketRangeLabel(t.ticket_numbers)}
                    {t.payment_status === 'free' && <span className="text-green-600 text-xs">(free)</span>}
                    {t.payment_status === 'paid' && <span className="text-blue-600 text-xs">(paid)</span>}
                  </p>
                ))}
              </div>
            )}

            {/* T-Raffle allocation */}
            {raffle.type === 't_raffle' && myCount > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  Allocate Your {myCount} Tickets to Prizes
                </p>
                <TRafflePlayerAllocate raffle={raffle} currentUser={user} />
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  if (openRaffles.length === 0 && closedRaffles.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Ticket className="h-4 w-4 text-amber-500" /> Raffles
      </h3>
      {openRaffles.map(r => renderRaffle(r, true))}
      {closedRaffles.map(r => renderRaffle(r, false))}
    </div>
  );
}