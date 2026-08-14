import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { silentAuctionItems as silentAuctionItemsApi, silentAuctions as silentAuctionsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trophy, Gavel, ChevronRight, Zap, Eye, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SilentAuctionDisplay() {
  const { auctionId } = useParams();
  const [mode, setMode] = useState(null); // 'one_by_one' | 'all_at_once'
  const [revealedIds, setRevealedIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [allRevealed, setAllRevealed] = useState(false);
  const [lockedItems, setLockedItems] = useState(null); // fresh items after lock-in
  const [revealError, setRevealError] = useState(null);

  const { data: auction, isLoading } = useQuery({
    queryKey: ['silent-auction-display', auctionId],
    queryFn: async () => {
      const list = await silentAuctionsApi.list();
      return list.find(a => a.id === auctionId) ?? null;
    },
    refetchInterval: 5000,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['silent-auction-items-display', auctionId],
    queryFn: () => silentAuctionItemsApi.filter({ auction_id: auctionId }),
    refetchInterval: 5000,
  });

  // Use lockedItems (fresh from DB after lock-in) when available, otherwise fall back to polled items
  const activeItems = lockedItems || items;
  const sorted = [...activeItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const fireConfetti = () => confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 } });

  const lockInWinners = async () => {
    const response = await callAction('lockInAuctionWinners', { auction_id: auctionId });
    const finalItems = response.items;
    setLockedItems(finalItems);
    return finalItems;
  };

  const revealNext = async () => {
    const item = sorted[currentIndex];
    if (!item) return;
    setRevealedIds(ids => [...ids, item.id]);
    fireConfetti();
    if (currentIndex < sorted.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const revealAll = async () => {
    setRevealing(true);
    setAllRevealed(false);
    setRevealError(null);
    try {
      const fresh = await lockInWinners();
      const allIds = (fresh || []).map(i => i.id);
      setRevealedIds(allIds);
      setAllRevealed(true);
      fireConfetti();
    } catch (e) {
      setRevealError(e?.message || 'Something went wrong');
    } finally {
      setRevealing(false);
    }
  };


  if (isLoading || !auction) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Mode selection
  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <BgDots />
        <div className="relative z-10 text-center max-w-lg w-full space-y-8">
          <div>
            <Gavel className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-3xl font-heading tracking-widest uppercase text-amber-400">{auction.name}</h1>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm text-slate-400">
              <span>🎁 {sorted.length} item{sorted.length !== 1 ? 's' : ''}</span>
              {auction.confidential_bidders
                ? <span className="flex items-center gap-1"><EyeOff className="h-3.5 w-3.5" /> Anonymous bidding</span>
                : <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Named bidding</span>
              }
            </div>
          </div>

          {revealing && (
            <div className="flex items-center gap-3 justify-center text-amber-400 py-6">
              <Zap className="h-6 w-6 animate-pulse" />
              <span className="text-lg">Locking in winners…</span>
            </div>
          )}

          {revealError && (
            <div className="bg-red-900/60 border border-red-500 rounded-xl px-5 py-3 text-red-300 text-sm text-left">
              ⚠️ {revealError}
            </div>
          )}

          {!revealing && <div className="space-y-3">
            <p className="text-slate-500 text-xs uppercase tracking-widest">How would you like to reveal winners?</p>

            <button
              onClick={async () => {
                setRevealError(null);
                try { setRevealing(true); await lockInWinners(); setMode('one_by_one'); }
                catch (e) { setRevealError(e?.message || 'Lock-in failed'); }
                finally { setRevealing(false); }
              }}
              className="w-full bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-400 rounded-2xl p-5 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-bold text-amber-300 text-lg">One Item at a Time</p>
                  <p className="text-slate-400 text-sm mt-1">Reveal each winner individually for maximum suspense.</p>
                </div>
              </div>
            </button>

            <button
              onClick={async () => {
                setRevealError(null);
                try { setRevealing(true); await lockInWinners(); setMode('all_at_once'); }
                catch (e) { setRevealError(e?.message || 'Lock-in failed'); }
                finally { setRevealing(false); }
              }}
              className="w-full bg-slate-800/60 border border-slate-600 hover:bg-slate-700/60 rounded-2xl p-5 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">⚡</span>
                <div>
                  <p className="font-bold text-white text-lg">Reveal All at Once</p>
                  <p className="text-slate-400 text-sm mt-1">Show all winners simultaneously.</p>
                </div>
              </div>
            </button>
          </div>}
        </div>
      </div>
    );
  }

  // All at once
  if (mode === 'all_at_once') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <BgDots />
        <div className="relative z-10 text-center max-w-3xl w-full">
          <Gavel className="h-10 w-10 text-amber-400 mx-auto mb-2" />
          <h1 className="text-3xl font-heading tracking-widest uppercase text-amber-400 mb-6">{auction.name}</h1>

          {!allRevealed && !revealing && !revealError && (
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xl px-12 py-6 h-auto rounded-full shadow-lg shadow-amber-500/30 mb-8"
              onClick={revealAll}
            >
              ⚡ Reveal All Winners
            </Button>
          )}

          {revealing && (
            <div className="flex items-center gap-3 justify-center text-amber-400 mb-8">
              <Zap className="h-6 w-6 animate-pulse" />
              <span className="text-lg">Locking in winners…</span>
            </div>
          )}

          {revealError && (
            <div className="mb-6 bg-red-900/60 border border-red-500 rounded-xl px-5 py-3 text-red-300 text-sm">
              ⚠️ {revealError} — <button className="underline" onClick={revealAll}>Try again</button>
            </div>
          )}

          {allRevealed && (
            <div className="space-y-3 text-left">
              {sorted.map(item => {
                const winner = item.winner_player_name || item.current_bidder_name;
                const winnerBid = item.winner_bid_cents || item.current_bid_cents;
                return (
                  <div key={item.id} className="bg-gradient-to-r from-amber-500/20 to-yellow-400/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center gap-4">
                    <Trophy className="h-6 w-6 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-300 uppercase tracking-widest">{item.title}</p>
                      <p className="text-2xl font-bold truncate">{winner || <span className="text-slate-500 text-base">No bids</span>}</p>
                    </div>
                    {winnerBid > 0 && (
                      <p className="text-2xl font-bold text-amber-400 shrink-0">${(winnerBid / 100).toFixed(0)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // One by one
  const currentItem = sorted[currentIndex];
  const isRevealed = currentItem && revealedIds.includes(currentItem.id);
  const allDone = currentIndex >= sorted.length - 1 && isRevealed;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <BgDots />
      <div className="relative z-10 text-center max-w-2xl w-full">
        <h1 className="text-2xl font-heading tracking-widest uppercase text-amber-400 mb-1">{auction.name}</h1>
        <p className="text-slate-400 text-sm mb-8">{revealedIds.length} of {sorted.length} revealed</p>

        {/* Already revealed log */}
        {revealedIds.length > 0 && (
          <div className="mb-6 text-left bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2">
            {revealedIds.map(id => {
              const item = sorted.find(i => i.id === id);
              if (!item) return null;
              const winner = item.winner_player_name || item.current_bidder_name;
              const bid = item.winner_bid_cents || item.current_bid_cents;
              return (
                <div key={id} className="flex items-center gap-3 text-sm">
                  <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-slate-300 truncate flex-1">{item.title}</span>
                  <span className="font-semibold text-white shrink-0">{winner}</span>
                  {bid > 0 && <span className="text-amber-400 font-bold shrink-0">${(bid / 100).toFixed(0)}</span>}
                </div>
              );
            })}
          </div>
        )}

        {!allDone && currentItem && (
          <>
            {!isRevealed ? (
              <>
                <div className="mb-6">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Next up</p>
                  <p className="text-4xl font-bold text-white">{currentItem.title}</p>
                  {currentItem.description && <p className="text-slate-400 mt-2">{currentItem.description}</p>}
                  {currentItem.value_cents > 0 && (
                    <p className="text-sm text-green-400 mt-1">Retail value: ${(currentItem.value_cents / 100).toFixed(0)}</p>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={revealNext}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xl px-12 py-6 h-auto rounded-full shadow-lg shadow-amber-500/30"
                >
                  🏆 Reveal Winner
                </Button>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 text-slate-900 rounded-2xl p-8 shadow-2xl shadow-amber-500/40">
                    <Trophy className="h-12 w-12 mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest mb-2">{currentItem.title}</p>
                    <p className="text-4xl font-bold font-heading">
                      🎉 {currentItem.winner_player_name || currentItem.current_bidder_name}!
                    </p>
                    {(currentItem.winner_bid_cents || currentItem.current_bid_cents) > 0 && (
                      <p className="text-2xl font-semibold mt-2">
                        ${((currentItem.winner_bid_cents || currentItem.current_bid_cents) / 100).toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>
                {currentIndex < sorted.length - 1 && (
                  <Button
                    size="lg"
                    onClick={() => setCurrentIndex(i => i + 1)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg px-10 py-5 h-auto rounded-full gap-2"
                  >
                    Next Item <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {allDone && (
          <p className="text-slate-400 text-sm mt-4">All items revealed! 🎊</p>
        )}
      </div>
    </div>
  );
}

function BgDots() {
  return <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, #f59e0b 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />;
}