import React, { useState, useMemo, useEffect } from 'react';
import { raffleAllocations as raffleAllocationsApi, rafflePrizeItems as rafflePrizeItemsApi, raffleTickets as raffleTicketsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Trophy, Plus, Minus, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function TRafflePlayerAllocate({ raffle, currentUser }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState({}); // { itemId: entries }
  const [anonymous, setAnonymous] = useState(false);

  const { data: myTickets = [] } = useQuery({
    queryKey: ['my-raffle-tickets', raffle.id, currentUser?.id],
    queryFn: () => raffleTicketsApi.filter({ raffle_id: raffle.id, player_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['raffle-prize-items', raffle.id],
    queryFn: () => rafflePrizeItemsApi.filter({ raffle_id: raffle.id }),
  });

  const { data: myAllocations = [], refetch: refetchAllocations } = useQuery({
    queryKey: ['my-allocations', raffle.id, currentUser?.id],
    queryFn: () => raffleAllocationsApi.filter({ raffle_id: raffle.id, player_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const totalTickets = myTickets.reduce((s, t) => s + (t.quantity || 1), 0);

  const allocatedByItem = useMemo(() => {
    const map = {};
    myAllocations.forEach(a => { map[a.prize_item_id] = a; });
    return map;
  }, [myAllocations]);

  // Sync anonymous state from saved allocations
  React.useEffect(() => {
    if (myAllocations.length > 0) {
      setAnonymous(!!myAllocations[0].anonymous);
    }
  }, [myAllocations.length]);

  const ticketsAllocated = useMemo(() => {
    return myAllocations.reduce((s, a) => s + (a.tickets_spent || 0), 0);
  }, [myAllocations]);

  const pendingTickets = useMemo(() => {
    return Object.entries(pending).reduce((sum, [itemId, entries]) => {
      const item = items.find(i => i.id === itemId);
      return sum + (entries * (item?.ticket_cost || 1));
    }, 0);
  }, [pending, items]);

  const savedTickets = ticketsAllocated;
  const remainingTickets = totalTickets - savedTickets;

  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const saveMutation = useMutation({
    mutationFn: async (changes) => {
      for (const { itemId, entries, item } of changes) {
        const existing = allocatedByItem[itemId];
        if (entries === 0) {
          if (existing) await raffleAllocationsApi.remove(existing.id);
        } else if (existing) {
          await raffleAllocationsApi.update(existing.id, {
            entries,
            tickets_spent: entries * item.ticket_cost,
            anonymous,
          });
        } else {
          await raffleAllocationsApi.create({
            raffle_id: raffle.id,
            prize_item_id: itemId,
            player_id: currentUser.id,
            player_name: currentUser.full_name,
            player_email: currentUser.email,
            entries,
            tickets_spent: entries * item.ticket_cost,
            anonymous,
          });
        }
      }
      // Also update any already-saved allocations not in changes (to sync anonymous flag)
      for (const alloc of myAllocations) {
        if (!changes.find(c => c.itemId === alloc.prize_item_id)) {
          await raffleAllocationsApi.update(alloc.id, { anonymous });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-allocations', raffle.id, currentUser?.id]);
      setPending({});
    },
  });

  const handleSave = () => {
    const changes = Object.entries(pending).map(([itemId, entries]) => ({
      itemId,
      entries,
      item: items.find(i => i.id === itemId),
    }));
    saveMutation.mutate(changes);
  };

  const adjustPending = (itemId, delta, item) => {
    setPending(p => {
      const current = p[itemId] ?? (allocatedByItem[itemId]?.entries || 0);
      const next = Math.max(0, current + delta);
      // Check ticket budget
      const newPendingTickets = Object.entries({ ...p, [itemId]: next }).reduce((sum, [id, e]) => {
        const it = items.find(i => i.id === id);
        return sum + (e * (it?.ticket_cost || 1));
      }, 0);
      // Don't exceed remaining (subtract already-saved for this item)
      const savedForThisItem = (allocatedByItem[itemId]?.tickets_spent || 0);
      const budgetWithoutThisItem = savedTickets - savedForThisItem;
      const totalIfChanged = budgetWithoutThisItem + newPendingTickets;
      if (next > (p[itemId] ?? (allocatedByItem[itemId]?.entries || 0)) && totalIfChanged > totalTickets) return p;
      if (next === (allocatedByItem[itemId]?.entries || 0)) {
        const { [itemId]: _, ...rest } = p;
        return rest;
      }
      return { ...p, [itemId]: next };
    });
  };

  const hasPendingChanges = Object.keys(pending).length > 0;

  if (!raffle.allocation_open) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <Ticket className="h-6 w-6 mx-auto mb-2 opacity-30" />
        Ticket allocation is not open yet.
      </div>
    );
  }

  if (totalTickets === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <Ticket className="h-6 w-6 mx-auto mb-2 opacity-30" />
        You don't have any tickets yet. Purchase tickets to allocate them.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Anonymous toggle */}
      <div className="flex items-center justify-between bg-slate-50 border rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <EyeOff className="h-4 w-4 text-slate-400" />
          <Label className="text-slate-700 font-medium cursor-pointer" htmlFor="anon-toggle">Winner Name Not Posted</Label>
        </div>
        <Switch
          id="anon-toggle"
          checked={anonymous}
          onCheckedChange={setAnonymous}
        />
      </div>
      {anonymous && (
        <p className="text-xs text-slate-400 -mt-2 px-1">Your ticket number will be shown instead of your name. You'll still get a push notification if you win.</p>
      )}

      {/* Ticket balance */}
      <div className="flex items-center justify-between bg-slate-50 border rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Ticket className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-slate-700">{totalTickets} total tickets</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">{savedTickets} allocated</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className={`font-semibold ${remainingTickets > 0 ? 'text-green-600' : 'text-slate-400'}`}>
            {remainingTickets} remaining
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {sorted.map(item => {
          const currentEntries = pending[item.id] ?? (allocatedByItem[item.id]?.entries || 0);
          const ticketsOnItem = currentEntries * item.ticket_cost;
          const isDirty = pending[item.id] !== undefined;

          return (
            <div key={item.id} className={`border rounded-lg p-3 ${isDirty ? 'border-amber-300 bg-amber-50/40' : 'bg-white'}`}>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0">{item.item_number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{item.ticket_cost} ticket{item.ticket_cost !== 1 ? 's' : ''}/entry</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => adjustPending(item.id, -1, item)}
                    disabled={currentEntries === 0}
                    className="h-7 w-7 rounded-full border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-center w-12">
                    <p className="text-base font-bold text-slate-800">{currentEntries}</p>
                    <p className="text-xs text-amber-600">{ticketsOnItem > 0 ? `${ticketsOnItem}t` : '—'}</p>
                  </div>
                  <button
                    onClick={() => adjustPending(item.id, 1, item)}
                    disabled={remainingTickets - (isDirty ? (currentEntries - (allocatedByItem[item.id]?.entries || 0)) * item.ticket_cost : 0) < item.ticket_cost}
                    className="h-7 w-7 rounded-full border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasPendingChanges && (
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Allocations'}
        </Button>
      )}
    </div>
  );
}