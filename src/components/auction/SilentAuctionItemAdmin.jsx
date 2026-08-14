import React, { useState } from 'react';
import { silentAuctionItems as silentAuctionItemsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Trophy } from 'lucide-react';

export default function SilentAuctionItemAdmin({ auctionId }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', value_cents: '', starting_bid_cents: '', bid_increment_cents: '5' });

  const { data: items = [] } = useQuery({
    queryKey: ['silent-auction-items-admin', auctionId],
    queryFn: () => silentAuctionItemsApi.filter({ auction_id: auctionId }),
    refetchInterval: 5000,
  });

  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const createMutation = useMutation({
    mutationFn: (data) => silentAuctionItemsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['silent-auction-items-admin', auctionId]);
      setForm({ title: '', description: '', value_cents: '', starting_bid_cents: '', bid_increment_cents: '5' });
      setAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => silentAuctionItemsApi.remove(id),
    onSuccess: () => qc.invalidateQueries(['silent-auction-items-admin', auctionId]),
  });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    createMutation.mutate({
      auction_id: auctionId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      value_cents: form.value_cents !== '' ? Math.round(parseFloat(form.value_cents) * 100) : null,
      starting_bid_cents: form.starting_bid_cents !== '' ? Math.round(parseFloat(form.starting_bid_cents) * 100) : 0,
      bid_increment_cents: form.bid_increment_cents !== '' ? Math.round(parseFloat(form.bid_increment_cents) * 100) : 500,
      sort_order: items.length,
      current_bid_cents: 0,
    });
  };

  const winners = sorted.filter(i => i.winner_player_name);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</p>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      {winners.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" /> Winners
          </p>
          {winners.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 truncate">{item.title}</span>
              <span className="font-semibold text-amber-800 shrink-0 ml-2">
                {item.winner_player_name} — ${((item.winner_bid_cents || item.current_bid_cents || 0) / 100).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
          <div>
            <Label className="text-xs">Item title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekend in NYC Penthouse" className="h-8 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about the item…" className="h-8 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Retail value ($)</Label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input type="number" min="0" step="1" className="h-8 text-sm pl-5" value={form.value_cents} placeholder="0" onChange={e => setForm(f => ({ ...f, value_cents: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Starting bid ($)</Label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input type="number" min="0" step="1" className="h-8 text-sm pl-5" value={form.starting_bid_cents} placeholder="0" onChange={e => setForm(f => ({ ...f, starting_bid_cents: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Min raise ($)</Label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input type="number" min="1" step="1" className="h-8 text-sm pl-5" value={form.bid_increment_cents} placeholder="5" onChange={e => setForm(f => ({ ...f, bid_increment_cents: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!form.title || createMutation.isPending}>Add</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !adding && (
        <p className="text-xs text-slate-400 text-center py-3">No items yet.</p>
      )}

      <div className="space-y-1.5">
        {sorted.map((item) => (
          <div key={item.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${item.winner_player_name ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
              {item.winner_player_name ? (
                <p className="text-xs text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Trophy className="h-3 w-3" /> {item.winner_player_name} — ${((item.winner_bid_cents || item.current_bid_cents) / 100).toFixed(0)}
                </p>
              ) : (
                <>
                  {item.description && <p className="text-xs text-slate-400 truncate">{item.description}</p>}
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    {item.value_cents > 0 && <span className="text-green-700 font-semibold">Value: ${(item.value_cents / 100).toFixed(0)}</span>}
                    {item.starting_bid_cents > 0 && <span>Opens: ${(item.starting_bid_cents / 100).toFixed(0)}</span>}
                    {item.current_bid_cents > 0 && <span className="text-amber-600 font-semibold">Current: ${(item.current_bid_cents / 100).toFixed(0)} — {item.current_bidder_name}</span>}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { if (confirm('Remove this item?')) deleteMutation.mutate(item.id); }} className="text-red-300 hover:text-red-500 shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}