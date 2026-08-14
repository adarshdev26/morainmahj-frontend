import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { raffleAllocations as raffleAllocationsApi, rafflePrizeItems as rafflePrizeItemsApi, raffles as rafflesApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trophy, Ticket, ChevronRight, Zap, Bell, BellOff } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TRaffleDisplay() {
  const { raffleId } = useParams();
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState(null);
  const [drawnItem, setDrawnItem] = useState(null);
  const [drawnResults, setDrawnResults] = useState([]);
  const [drawError, setDrawError] = useState(null);
  const urlMode = new URLSearchParams(window.location.search).get('mode');
  const [mode, setMode] = useState(urlMode || null); // 'one_by_one' | 'all_at_once'
  const [drawingAll, setDrawingAll] = useState(false);
  const [notifStatus, setNotifStatus] = useState(null); // null | 'sending' | 'sent' | 'failed'
  const intervalRef = useRef(null);

  const { data: raffle, isError: raffleError, isLoading: raffleLoading } = useQuery({
    queryKey: ['t-raffle-display', raffleId],
    queryFn: async () => {
      const list = await rafflesApi.list();
      console.log('[TRaffleDisplay] loaded raffles:', list?.length, 'looking for:', raffleId);
      return list.find(x => x.id === raffleId) ?? null;
    },
    refetchInterval: 5000,
    retry: 2,
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['raffle-prize-items-display', raffleId],
    queryFn: () => rafflePrizeItemsApi.filter({ raffle_id: raffleId }),
    refetchInterval: 5000,
    retry: 2,
  });

  const { data: allocations = [], refetch: refetchAllocations } = useQuery({
    queryKey: ['raffle-allocations-display', raffleId],
    queryFn: () => raffleAllocationsApi.filter({ raffle_id: raffleId }),
    refetchInterval: 5000,
    retry: 2,
  });

  const sorted = [...items].sort((a, b) => (a.sort_order ?? a.item_number ?? 0) - (b.sort_order ?? b.item_number ?? 0));
  const alreadyDrawnIds = new Set([
    ...items.filter(i => i.winner_player_name).map(i => i.id),
    ...drawnResults.map(r => r.item.id),
  ]);
  const undrawnItems = sorted.filter(i => !alreadyDrawnIds.has(i.id));

  // Auto-select first undrawn item if nothing is selected
  useEffect(() => {
    if (!selectedItemId && undrawnItems.length > 0 && !spinning && !drawnItem) {
      setSelectedItemId(undrawnItems[0].id);
    }
  }, [undrawnItems.length, selectedItemId, spinning, drawnItem]);

  const fireConfetti = () => confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });

  const sendWinnerPush = async (allocation, itemLabel) => {
    if (!allocation?.player_email) return;
    setNotifStatus('sending');
    try {
      await callAction('sendPushNotification', {
        external_user_ids: [allocation.player_email],
        title: '🏆 You Won!',
        message: `Congratulations! You won: ${itemLabel}`,
      });
      setNotifStatus('sent');
    } catch (e) {
      setNotifStatus('failed');
    }
    setTimeout(() => setNotifStatus(null), 4000);
  };

  const drawItem = async (item) => {
    if (spinning) return;
    setSpinning(true);
    setDrawnItem(null);
    setDrawError(null);
    setDisplayName(null);
    // Safety timeout — reset spinning if something goes wrong
    const safetyTimer = setTimeout(() => setSpinning(false), 15000);

    // Fetch fresh allocations to ensure we have the latest data
    let latestAllocations = allocations;
    try {
      const { data: freshAllocations } = await refetchAllocations();
      if (freshAllocations) latestAllocations = freshAllocations;
    } catch (e) {
      // fall back to cached allocations
    }
    const itemAllocations = latestAllocations.filter(a => a.prize_item_id === item.id);
    // Build pool entries — each entry gets a sequential "entry #N" for anonymous display
    let entryCounter = 1;
    const pool = itemAllocations.flatMap(a => {
      const count = Math.max(1, parseInt(a.entries) || 1);
      return Array(count).fill(null).map(() => ({
        name: a.player_name,
        displayName: a.anonymous ? `Entry #${entryCounter++}` : a.player_name,
        alloc: a,
      }));
    });
    // Pad entry counter for spinning animation pool
    const spinPool = pool.length > 0 ? pool : [];

    if (pool.length === 0) {
      clearTimeout(safetyTimer);
      setSpinning(false);
      setDrawError(`No entries for "${item.label}"`);
      return;
    }

    let count = 0;
    const maxCount = 50;
    intervalRef.current = setInterval(() => {
      setDisplayName(spinPool[Math.floor(Math.random() * spinPool.length)].displayName);
      count++;
      if (count >= maxCount) {
        clearInterval(intervalRef.current);
        const winnerEntry = pool[Math.floor(Math.random() * pool.length)];
        setDisplayName(winnerEntry.displayName);
        setSpinning(false);

        clearTimeout(safetyTimer);
        callAction('drawTRaffle', {
          raffle_id: raffleId,
          winners: [{ item_id: item.id, winner_player_name: winnerEntry.name, winner_player_id: winnerEntry.alloc?.player_id, prize_label: item.label }],
        }).then(async () => {
          setDrawnResults(r => [...r, { item, winner: winnerEntry.displayName, winnerName: winnerEntry.name }]);
          setDrawnItem({ item, winner: winnerEntry.displayName });
          fireConfetti();
          await refetchItems();
        }).catch(err => setDrawError(err.message));
      }
    }, 60);
  };

  const drawAll = async () => {
    if (drawingAll) return;
    setDrawingAll(true);
    setDrawError(null);
    try {
      // Fetch fresh allocations before drawing
      let latestAllocations = allocations;
      try {
        const { data: freshAllocations } = await refetchAllocations();
        if (freshAllocations) latestAllocations = freshAllocations;
      } catch (e) { /* fall back to cached */ }

      // Snapshot undrawn items using latest data
      const { data: freshItems } = await refetchItems();
      const freshSorted = [...(freshItems || items)].sort((a, b) => (a.sort_order ?? a.item_number ?? 0) - (b.sort_order ?? b.item_number ?? 0));
      const freshUndrawn = freshSorted.filter(i => !i.winner_player_name);

      const results = [];
      for (const item of freshUndrawn) {
        const itemAllocations = latestAllocations.filter(a => a.prize_item_id === item.id);
        let entryCounter = 1;
        const pool = itemAllocations.flatMap(a => {
          const count = Math.max(1, parseInt(a.entries) || 1);
          return Array(count).fill(null).map(() => ({
            name: a.player_name,
            displayName: a.anonymous ? `Entry #${entryCounter++}` : a.player_name,
            alloc: a,
          }));
        });
        if (pool.length === 0) continue;
        const winnerEntry = pool[Math.floor(Math.random() * pool.length)];
        results.push({ item, winner: winnerEntry.displayName, winnerName: winnerEntry.name, alloc: winnerEntry.alloc });
      }

      // Save all winners + mark drawn via backend function (handles auth)
      await callAction('drawTRaffle', {
        raffle_id: raffleId,
        winners: results.map(r => ({ item_id: r.item.id, winner_player_name: r.winnerName, winner_player_id: r.alloc?.player_id, prize_label: r.item.label })),
      });

      setDrawnResults(results);
      fireConfetti();
      await refetchItems();
    } catch (e) {
      setDrawError(e.message || 'Draw failed');
    } finally {
      setDrawingAll(false);
    }
  };

  if (!raffle && !raffleError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        Raffle not found or you may need to be logged in to view this page.
      </div>
    );
  }

  // ── Mode selection ──────────────────────────────────────────────────────────
  if (!mode) {
    const totalEntries = allocations.length;
    const uniquePlayers = new Set(allocations.map(a => a.player_id)).size;
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <Dot />
        <div className="relative z-10 text-center max-w-lg w-full space-y-8">
          <div>
            <Ticket className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-3xl font-heading tracking-widest uppercase text-amber-400">{raffle.name}</h1>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm text-slate-400">
              <span>🎁 {sorted.length} prize{sorted.length !== 1 ? 's' : ''}</span>
              <span>👥 {uniquePlayers} player{uniquePlayers !== 1 ? 's' : ''}</span>
              <span>🎟️ {totalEntries} allocation{totalEntries !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-slate-500 text-xs uppercase tracking-widest">How would you like to draw?</p>

            <button
              onClick={() => setMode('one_by_one')}
              className="w-full bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-400 rounded-2xl p-5 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">🎰</span>
                <div>
                  <p className="font-bold text-amber-300 text-lg group-hover:text-amber-200">One Prize at a Time</p>
                  <p className="text-slate-400 text-sm mt-1">Spin the wheel for each prize individually. Great for building suspense on a big screen.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('all_at_once')}
              className="w-full bg-slate-800/60 border border-slate-600 hover:bg-slate-700/60 hover:border-slate-500 rounded-2xl p-5 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">⚡</span>
                <div>
                  <p className="font-bold text-white text-lg group-hover:text-slate-200">Draw All at Once</p>
                  <p className="text-slate-400 text-sm mt-1">Instantly selects all winners simultaneously and reveals the full list at once.</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── All at once ─────────────────────────────────────────────────────────────
  if (mode === 'all_at_once') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <Dot />
        <div className="relative z-10 text-center max-w-2xl w-full">
          <h1 className="text-3xl font-heading tracking-widest uppercase text-amber-400 mb-8">{raffle.name}</h1>
          {drawnResults.length === 0 && !drawingAll && (
            <>
              {undrawnItems.length === 0 ? (
                <p className="text-slate-400">All prizes have already been drawn.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">{undrawnItems.length} prize{undrawnItems.length !== 1 ? 's' : ''} to draw</p>
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xl px-12 py-6 h-auto rounded-full shadow-lg shadow-amber-500/30" onClick={drawAll}>
                    🎰 Draw All Winners
                  </Button>
                </div>
              )}
            </>
          )}
          {drawingAll && (
            <div className="flex items-center gap-3 justify-center text-amber-400">
              <Zap className="h-6 w-6 animate-pulse" />
              <span className="text-lg">Drawing winners & sending notifications…</span>
            </div>
          )}
          {drawnResults.length > 0 && (
            <div className="space-y-3 text-left mt-4">
              {drawnResults.map(({ item, winner }) => (
                <div key={item.id} className="bg-gradient-to-r from-amber-500/20 to-yellow-400/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center gap-4">
                  <Trophy className="h-6 w-6 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-amber-300 uppercase tracking-widest">{item.item_number}. {item.label}</p>
                    <p className="text-2xl font-bold">{winner}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {drawError && <ErrorBox msg={drawError} />}
        </div>
      </div>
    );
  }

  // ── One by one ──────────────────────────────────────────────────────────────
  const itemToDraw = selectedItemId
    ? undrawnItems.find(i => i.id === selectedItemId)
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Dot />
      <div className="relative z-10 text-center max-w-2xl w-full">
        <h1 className="text-2xl font-heading tracking-widest uppercase text-amber-400 mb-2">{raffle.name}</h1>
        <p className="text-slate-400 text-sm mb-6">{drawnResults.length + items.filter(i => i.winner_player_name).length} of {sorted.length} drawn</p>

        {/* Item picker */}
        {!spinning && !drawnItem && (
          <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Select item to draw</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {undrawnItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`px-3 py-3 rounded-xl border text-left transition-all ${
                    selectedItemId === item.id
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-0.5">#{item.item_number ?? '—'}</p>
                  <p className="text-sm font-semibold leading-tight truncate">{item.label}</p>
                  <p className="text-xs text-amber-500/70 mt-1">
                    {allocations.filter(a => a.prize_item_id === item.id).reduce((s, a) => s + a.entries, 0)} entries
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected item display */}
        {itemToDraw && !spinning && !drawnItem && (
          <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Drawing for</p>
            <p className="text-4xl font-bold text-white">{itemToDraw.label}</p>
            {itemToDraw.description && <p className="text-slate-400 mt-1">{itemToDraw.description}</p>}
            <p className="text-sm text-amber-400 mt-1">{itemToDraw.ticket_cost} ticket{itemToDraw.ticket_cost !== 1 ? 's' : ''}/entry</p>
          </div>
        )}

        {/* Spin display */}
        {(spinning || (displayName && !drawnItem)) && (
          <div className={`w-64 h-64 mx-auto rounded-full border-4 flex items-center justify-center mb-10
            ${spinning ? 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)] scale-105' : 'border-slate-600'}`}>
            <span className={`text-3xl font-bold px-4 text-center leading-tight ${spinning ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
              {displayName}
            </span>
          </div>
        )}

        {/* Winner reveal */}
        {drawnItem && (
          <div className="mb-10">
            <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 text-slate-900 rounded-2xl p-8 shadow-2xl shadow-amber-500/40">
              <Trophy className="h-12 w-12 mx-auto mb-3" />
              <p className="text-xs uppercase tracking-widest mb-2">{drawnItem.item.label}</p>
              <p className="text-4xl font-bold font-heading">🎉 {drawnItem.winner}!</p>
            </div>
            {notifStatus === 'sending' && (
              <div className="flex items-center justify-center gap-2 mt-3 text-amber-400 text-sm animate-pulse">
                <Bell className="h-4 w-4" /> Sending push notification…
              </div>
            )}
            {notifStatus === 'sent' && (
              <div className="flex items-center justify-center gap-2 mt-3 text-green-400 text-sm">
                <Bell className="h-4 w-4" /> Notification sent ✓
              </div>
            )}
            {notifStatus === 'failed' && (
              <div className="flex items-center justify-center gap-2 mt-3 text-red-400 text-sm">
                <BellOff className="h-4 w-4" /> Notification failed
              </div>
            )}
          </div>
        )}

        {/* Draw button */}
        {itemToDraw && !spinning && !drawnItem && (
          <Button
            size="lg"
            onClick={() => drawItem(itemToDraw)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xl px-12 py-6 h-auto rounded-full shadow-lg shadow-amber-500/30"
          >
            🎰 Draw Winner
          </Button>
        )}

        {/* Next prize */}
        {drawnItem && undrawnItems.length > 0 && (
          <Button
            size="lg"
            onClick={() => { setDrawnItem(null); setDisplayName(null); setSelectedItemId(null); setNotifStatus(null); }}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg px-10 py-5 h-auto rounded-full gap-2"
          >
            Next Prize <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        {drawnItem && undrawnItems.length === 0 && (
          <p className="text-slate-400 text-sm mt-4">All prizes drawn! 🎊</p>
        )}

        {drawError && <ErrorBox msg={drawError} />}

        {/* Already drawn log */}
        {drawnResults.length > 0 && (
          <div className="mt-10 text-left bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Drawn this session</p>
            {drawnResults.map(({ item, winner }) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-slate-300 truncate">#{item.item_number} {item.label}</span>
                <span className="ml-auto font-semibold text-white shrink-0">{winner}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Small helpers
function Dot() {
  return <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, #f59e0b 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />;
}

function ErrorBox({ msg }) {
  return <div className="mt-4 bg-red-900/60 border border-red-500 rounded-xl px-5 py-3 text-red-300 text-sm">⚠️ {msg}</div>;
}