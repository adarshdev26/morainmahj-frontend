import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { silentAuctionItems as silentAuctionItemsApi, silentAuctions as silentAuctionsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Trophy, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

export default function SilentAuctionBidPanel({ tournamentId, leagueId, user }) {
  const qc = useQueryClient();

  const { data: auctions = [] } = useQuery({
    queryKey: ['silent-auctions-player', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return silentAuctionsApi.filter(filter);
    },
    refetchInterval: 10000,
  });

  const openAuctions = auctions.filter(a => a.status === 'open' || a.status === 'closed');
  if (openAuctions.length === 0) return null;

  return (
    <div className="space-y-4">
      {openAuctions.map(auction => (
        <AuctionCard key={auction.id} auction={auction} user={user} />
      ))}
    </div>
  );
}

function AuctionCard({ auction, user }) {
  const [expanded, setExpanded] = useState(false);

  const { data: items = [], refetch } = useQuery({
    queryKey: ['silent-auction-items-player', auction.id],
    queryFn: () => silentAuctionItemsApi.filter({ auction_id: auction.id }),
    refetchInterval: 15000,
  });

  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const isOpen = auction.status === 'open';

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-slate-800 text-sm">{auction.name}</span>
          <Badge className={isOpen ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
            {isOpen ? 'Bidding Open' : 'Closed'}
          </Badge>
          {auction.confidential_bidders && (
            <span className="flex items-center gap-1 text-xs text-slate-500"><EyeOff className="h-3 w-3" /> Anonymous</span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="divide-y">
          {sorted.map(item => (
            <AuctionItemRow
              key={item.id}
              item={item}
              auction={auction}
              user={user}
              onBidPlaced={refetch}
            />
          ))}
          {sorted.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No items in this auction yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AuctionItemRow({ item, auction, user, onBidPlaced }) {
  const [bidValue, setBidValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const isMyBid = item.current_bidder_id === user?.id;
  const isOpen = auction.status === 'open';

  const minNextBid = item.current_bid_cents > 0
    ? (item.current_bid_cents + (item.bid_increment_cents || 500))
    : (item.starting_bid_cents || 0);

  // Format last bid time
  const lastBidTime = item.closed_at ? null : 
    item.current_bid_cents > 0 && item.updated_date
      ? new Date(item.updated_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : null;

  const handleBid = async () => {
    setError(null);
    const cents = Math.round(parseFloat(bidValue) * 100);
    if (!cents || cents < minNextBid) {
      setError(`Minimum bid is $${(minNextBid / 100).toFixed(2)}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await callAction('placeSilentAuctionBid', { item_id: item.id, amount_cents: cents });
      if (res?.error) throw new Error(res.error);
      setBidValue('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onBidPlaced();
    } catch (e) {
      setError(e.message || 'Bid failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{item.title}</p>
          {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
          {item.value_cents > 0 && (
            <p className="text-xs text-green-600 font-medium mt-0.5">Retail value: ${(item.value_cents / 100).toFixed(0)}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {item.current_bid_cents > 0 ? (
            <>
              <p className="text-lg font-bold text-amber-600">${(item.current_bid_cents / 100).toFixed(2)}</p>
              {!auction.confidential_bidders ? (
                <p className={`text-xs font-medium ${isMyBid ? 'text-green-600' : 'text-slate-500'}`}>
                  {isMyBid ? '✓ Your bid' : item.current_bidder_name}
                </p>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                  <Eye className="h-3 w-3" /> {isMyBid ? '✓ Your bid' : 'Anonymous'}
                </p>
              )}
              {lastBidTime && (
                <p className="text-xs text-slate-400 mt-0.5">Bid {lastBidTime}</p>
              )}
            </>
          ) : (
            <div>
              <p className="text-sm text-slate-400">No bids yet</p>
              {item.starting_bid_cents > 0 && (
                <p className="text-xs text-slate-400">Opens at ${(item.starting_bid_cents / 100).toFixed(0)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {isOpen && !isMyBid && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input
              type="number"
              min={minNextBid / 100}
              step="1"
              className="pl-6 h-8 text-sm"
              placeholder={`Min $${(minNextBid / 100).toFixed(0)}`}
              value={bidValue}
              onChange={e => setBidValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBid()}
            />
          </div>
          <Button size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-white gap-1 shrink-0" onClick={handleBid} disabled={submitting}>
            <Gavel className="h-3.5 w-3.5" /> {submitting ? '…' : 'Bid'}
          </Button>
        </div>
      )}

      {isOpen && isMyBid && (
        <p className="mt-1.5 text-xs text-green-600 font-medium">✓ You're the highest bidder!</p>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {success && <p className="mt-1 text-xs text-green-600">✓ Bid placed successfully!</p>}
    </div>
  );
}