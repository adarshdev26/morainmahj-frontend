import React, { useState, useEffect } from 'react';
import { callAction } from '@/services/actions';
import { silentAuctionBids as silentAuctionBidsApi, silentAuctionItems as silentAuctionItemsApi, silentAuctions as silentAuctionsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gavel, Eye, EyeOff, ChevronDown, ChevronUp, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DemoSilentAuction({ tournamentId, leagueId, user }) {
  const { data: allAuctions = [], refetch, isLoading } = useQuery({
    queryKey: ['silent-auctions-all', tournamentId, leagueId],
    queryFn: () => silentAuctionsApi.list(),
    refetchInterval: 5000,
    enabled: !!tournamentId || !!leagueId,
  });

  const auctions = tournamentId 
    ? allAuctions.filter(a => a.tournament_id === tournamentId)
    : allAuctions.filter(a => a.league_id === leagueId);

  const activeAuctions = auctions.filter(a => ['open', 'closed', 'revealed'].includes(a.status));

  // Debug: log what we're seeing
  React.useEffect(() => {
    console.log('Auctions loaded:', allAuctions.length, 'Total');
    console.log('Filtered auctions:', auctions.length, 'For tournament/league:', tournamentId || leagueId);
    console.log('Active auctions:', activeAuctions.length);
    if (allAuctions.length > 0) {
      console.log('Sample auction:', allAuctions[0]);
    }
  }, [allAuctions, auctions, activeAuctions, tournamentId, leagueId]);

  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="text-center text-sm text-muted-foreground py-4">Loading auctions...</div>
      )}
      {!isLoading && activeAuctions.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4">
          No silent auctions at this time.
          <button 
            onClick={() => refetch()}
            className="block mx-auto mt-2 text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
      ) : (
        activeAuctions.map(auction => (
          <AuctionCard key={auction.id} auction={auction} user={user} />
        ))
      )}
    </div>
  );
}

function AuctionCard({ auction, user }) {
  const [expanded, setExpanded] = useState(false);

  const { data: items = [] } = useQuery({
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

function AuctionItemRow({ item, auction, user }) {
  const [bidValue, setBidValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showCardGate, setShowCardGate] = useState(false);

  const isMyBid = item.current_bidder_id === user?.id;
  const isOpen = auction.status === 'open';

  const minNextBid = item.current_bid_cents > 0
    ? (item.current_bid_cents + (item.bid_increment_cents || 500))
    : (item.starting_bid_cents || 0);

  // Fetch last bid time
  const { data: lastBid } = useQuery({
    queryKey: ['last-silent-bid', item.id],
    queryFn: () => silentAuctionBidsApi.filter({ item_id: item.id }).then(bids => {
      if (!bids || bids.length === 0) return null;
      return bids.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    }),
    refetchInterval: 5000,
    enabled: item.current_bid_cents > 0,
  });

  const handleBid = async () => {
    setError(null);
    
    // Check if user has card on file
    try {
      const checkRes = await callAction('checkAuctionCard', {});
      if (!checkRes?.has_card) {
        setShowCardGate(true);
        return;
      }
    } catch (e) {
      // If check fails, assume no card
      setShowCardGate(true);
      return;
    }

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
              {lastBid && (
                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(new Date(lastBid.created_date), { addSuffix: true })}
                </p>
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

      {showCardGate && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Card Required to Bid</p>
              <p className="text-xs text-amber-700 mt-1">Please add a payment method to start bidding on auction items.</p>
              <Button
                size="sm"
                className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={async () => {
                  const res = await callAction('checkAuctionCard', {});
                  if (res?.stripe_url) {
                    window.open(res.stripe_url, '_blank');
                  }
                }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Add Card
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOpen && isMyBid && (
        <p className="mt-1.5 text-xs text-green-600 font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> You're the highest bidder!
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {success && <p className="mt-1 text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Bid placed!</p>}
    </div>
  );
}