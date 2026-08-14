import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, ChevronDown, ChevronUp, CheckCircle2, Plus, Minus, Loader2 } from 'lucide-react';
import { callAction } from '@/services/actions';
import { raffleTickets as raffleTicketsApi, raffles as rafflesApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function DemoFiftyFifty({ tournamentId, leagueId, user }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);

  // Fetch raffles
  const { data: raffles = [] } = useQuery({
    queryKey: ['player-raffles', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return rafflesApi.filter(filter);
    },
  });

  // Fetch my tickets
  const { data: myTickets = [] } = useQuery({
    queryKey: ['my-raffle-tickets', user?.id],
    queryFn: () => raffleTicketsApi.filter({ player_id: user?.id }),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // For demo: use any fifty_fifty raffle, or create a mock one if none exists
  let fiftyFifty = raffles.find(r => r.type === 'fifty_fifty');
  
  if (!fiftyFifty) {
    fiftyFifty = {
      id: 'demo-fifty-fifty',
      name: '50/50 Raffle',
      type: 'fifty_fifty',
      status: 'open',
      ticket_price_cents: 200,
      bundle_qty: 5,
      bundle_price_cents: 800,
      fifty_fifty_total_cents: 15600,
      show_running_total: true,
      total_tickets_sold: 78,
    };
  }

  const myRaffleTickets = myTickets.filter(t => t.raffle_id === fiftyFifty.id);
  const myTicketCount = myRaffleTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

  const pot = fiftyFifty.fifty_fifty_total_cents && fiftyFifty.show_running_total
    ? (fiftyFifty.fifty_fifty_total_cents / 2 / 100).toFixed(0)
    : '0';
  const myShare = Math.floor(parseFloat(pot) / 2);

  const handleBuy = async () => {
    setBuying(true);
    const res = await callAction('raffleCheckout', {
      raffle_id: fiftyFifty.id,
      quantity: qty,
    });
    setBuying(false);
    if (res?.url) {
      window.open(res.url, '_blank');
    }
    qc.invalidateQueries(['my-raffle-tickets', user?.id]);
  };

  const isFree = !fiftyFifty.ticket_price_cents || fiftyFifty.ticket_price_cents === 0;
  const price = isFree ? 'Free' : `$${(fiftyFifty.ticket_price_cents / 100).toFixed(2)}`;
  const bundlePrice = fiftyFifty.bundle_price_cents ? `$${(fiftyFifty.bundle_price_cents / 100).toFixed(2)}` : null;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <span className="font-semibold text-slate-800 text-sm">{fiftyFifty.name}</span>
          <Badge className="bg-green-100 text-green-700 text-xs">Open</Badge>
          {fiftyFifty.show_running_total && (
            <span className="text-xs text-amber-600 font-medium ml-1">Pot: ${pot}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Pot display */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 mb-0.5">Current pot</p>
            <p className="text-3xl font-bold text-amber-600">${pot}</p>
            <p className="text-xs text-amber-700 mt-0.5">Winner takes <strong>${myShare}</strong></p>
            <p className="text-xs text-amber-600 mt-1">{fiftyFifty.total_tickets_sold || 0} tickets sold</p>
          </div>

          {/* My tickets */}
          {myTicketCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-green-700 mb-1">Your Tickets ({myTicketCount} total)</p>
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

          {/* Buy controls */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {price} {bundlePrice && `· Bundle of ${fiftyFifty.bundle_qty} for ${bundlePrice}`}
            </p>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full bg-slate-100 border border-border flex items-center justify-center active:scale-95 transition-transform">
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xl font-bold w-8 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center active:scale-95 transition-transform">
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">= <strong>${(qty * (fiftyFifty.ticket_price_cents || 0) / 100).toFixed(2)}</strong></span>
            </div>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white w-full"
              onClick={handleBuy}
              disabled={buying}
            >
              {buying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ticket className="h-3.5 w-3.5 mr-1" />}
              Buy {qty} Ticket{qty > 1 ? 's' : ''} — ${(qty * (fiftyFifty.ticket_price_cents || 0) / 100).toFixed(2)}
            </Button>
            {bundlePrice && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setQty(fiftyFifty.bundle_qty || 5)}
              >
                Bundle ({fiftyFifty.bundle_qty} for {bundlePrice})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}