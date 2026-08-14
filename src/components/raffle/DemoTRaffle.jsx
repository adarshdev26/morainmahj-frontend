import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Plus, Minus, CheckCircle2, ChevronDown, ChevronUp, Loader2, Trophy } from 'lucide-react';
import { callAction } from '@/services/actions';
import { raffleAllocations as raffleAllocationsApi, rafflePrizeItems as rafflePrizeItemsApi, raffleTickets as raffleTicketsApi, raffles as rafflesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TRafflePlayerAllocate from './TRafflePlayerAllocate';

export default function DemoTRaffle({ tournamentId, leagueId, user }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [buying, setBuying] = useState(false);

  // Fetch raffles
  const { data: raffles = [] } = useQuery({
    queryKey: ['player-raffles', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return rafflesApi.filter(filter);
    },
  });

  // For demo: use any t_raffle, or create a mock one if none exists
  const tRaffle = raffles.find(r => r.type === 't_raffle') || {
    id: 'demo-t-raffle',
    name: 'Prize Raffle',
    type: 't_raffle',
    status: 'open',
    ticket_price_cents: 200,
    bundle_qty: 5,
    bundle_price_cents: 800,
  };

  // Fetch my tickets
  const { data: myTickets = [] } = useQuery({
    queryKey: ['my-raffle-tickets', user?.id],
    queryFn: () => raffleTicketsApi.filter({ player_id: user?.id }),
    enabled: !!user?.id,
  });

  // Fetch prize items
  const { data: prizeItems = [] } = useQuery({
    queryKey: ['t-raffle-items', tRaffle?.id],
    queryFn: () => rafflePrizeItemsApi.filter({ raffle_id: tRaffle?.id }),
    enabled: !!tRaffle?.id && tRaffle.id !== 'demo-t-raffle',
  });

  // Fetch all allocations (to show what others have allocated)
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['t-raffle-allocations', tRaffle?.id],
    queryFn: () => raffleAllocationsApi.filter({ raffle_id: tRaffle?.id }),
    enabled: !!tRaffle?.id && tRaffle.id !== 'demo-t-raffle',
  });

  // Demo items if no real ones exist
  const displayItems = prizeItems.length > 0 ? prizeItems : [
    { id: '1', label: 'Spa Day for Two', ticket_cost: 5, description: 'Full day at Elmwood Spa', item_number: 1 },
    { id: '2', label: 'Wine & Cheese Basket', ticket_cost: 2, description: 'Curated selection of reds & artisan cheeses', item_number: 2 },
    { id: '3', label: 'Restaurant Gift Card', ticket_cost: 3, description: '$100 to The Capital Grille', item_number: 3 },
    { id: '4', label: 'Mah Jongg Tile Set', ticket_cost: 4, description: 'Premium ivory-look tile set with case', item_number: 4 },
    { id: '5', label: 'Golf Lesson Package', ticket_cost: 3, description: '3 lessons with a PGA pro', item_number: 5 },
    { id: '6', label: 'Amazon Gift Card', ticket_cost: 2, description: '$50 Amazon gift card', item_number: 6 },
  ];

  // Calculate allocation summary
  const allocationSummary = displayItems.map(item => {
    const itemAllocations = allAllocations.filter(a => a.prize_item_id === item.id);
    const totalEntries = itemAllocations.reduce((sum, a) => sum + (a.entries || 0), 0);
    const ticketsSpent = totalEntries * item.ticket_cost;
    return {
      ...item,
      totalEntries,
      ticketsSpent,
      allocationCount: itemAllocations.length,
    };
  });

  const myRaffleTickets = myTickets.filter(t => t.raffle_id === tRaffle.id);
  const totalTickets = myRaffleTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

  const handleBuy = async () => {
    setBuying(true);
    const res = await callAction('raffleCheckout', {
      raffle_id: tRaffle.id,
      quantity: tRaffle.bundle_qty || 1,
    });
    setBuying(false);
    if (res?.url) {
      window.open(res.url, '_blank');
    }
    qc.invalidateQueries(['my-raffle-tickets', user?.id]);
  };

  const isFree = !tRaffle.ticket_price_cents || tRaffle.ticket_price_cents === 0;
  const price = isFree ? 'Free' : `$${((tRaffle.bundle_price_cents || tRaffle.ticket_price_cents * (tRaffle.bundle_qty || 1)) / 100).toFixed(2)}`;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-slate-800 text-sm">{tRaffle.name}</span>
          <Badge className="bg-green-100 text-green-700 text-xs">Open</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Prize items preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-slate-700">Prize Items ({displayItems.length})</p>
            </div>
            <div className="space-y-2">
              {allocationSummary.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">#{item.item_number} {item.label}</p>
                    <p className="text-slate-500 truncate">{item.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-amber-600 font-semibold">{item.ticket_cost} tickets/entry</p>
                    {item.ticketsSpent > 0 && (
                      <p className="text-slate-600">{item.totalEntries} entries ({item.ticketsSpent} tickets)</p>
                    )}
                    {item.ticketsSpent === 0 && (
                      <p className="text-slate-400">No allocations yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buy tickets section */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-amber-800">Get More Tickets</p>
                <p className="text-xs text-amber-600">
                  {tRaffle.bundle_qty > 1 ? `${tRaffle.bundle_qty} tickets` : '1 ticket'} — {price}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleBuy}
                disabled={buying}
              >
                {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ticket className="h-3.5 w-3.5 mr-1" /> Buy Tickets</>}
              </Button>
            </div>
            <p className="text-xs text-amber-600">Admin-assigned and purchased tickets appear below</p>
          </div>

          {/* My tickets */}
          {totalTickets > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-green-700 mb-1">
                Your Tickets ({totalTickets} total)
              </p>
              <div className="space-y-0.5">
                {myRaffleTickets.map((t, i) => {
                  const numbers = t.ticket_numbers || [];
                  const label = numbers.length === 1 ? `#${numbers[0]}` :
                    numbers.every((n, idx) => idx === 0 || n === numbers[idx - 1] + 1)
                      ? `#${numbers[0]}–#${numbers[numbers.length - 1]}`
                      : numbers.map(n => `#${n}`).join(', ');
                  return (
                    <p key={i} className="text-xs text-green-600 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-green-500" />
                      {label} {t.payment_status === 'free' && <span className="text-green-500">(assigned)</span>}
                      {t.payment_status === 'paid' && <span className="text-green-500">(purchased)</span>}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {totalTickets === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No tickets yet — purchase or wait for admin assignment</p>
          )}

          {/* Allocation UI */}
          {totalTickets > 0 && (
            <TRafflePlayerAllocate raffle={tRaffle} currentUser={user} />
          )}
        </div>
      )}
    </div>
  );
}