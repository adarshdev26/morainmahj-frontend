import React, { useState } from 'react';
import { rafflePrizeItems as rafflePrizeItemsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Trophy, GripVertical } from 'lucide-react';

export default function TRaffleAdminItems({ raffleId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ label: '', description: '', ticket_cost: 1, value_cents: '', item_number: '' });
  const [adding, setAdding] = useState(false);

  const { data: items = [], refetch } = useQuery({
    queryKey: ['raffle-prize-items', raffleId],
    queryFn: () => rafflePrizeItemsApi.filter({ raffle_id: raffleId }),
    refetchInterval: 3000,
  });

  const sorted = [...items].sort((a, b) => (a.sort_order ?? a.item_number ?? 0) - (b.sort_order ?? b.item_number ?? 0));

  const createMutation = useMutation({
    mutationFn: (data) => rafflePrizeItemsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['raffle-prize-items', raffleId]); setForm({ label: '', description: '', ticket_cost: 1, value_cents: '', item_number: '' }); setAdding(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rafflePrizeItemsApi.remove(id),
    onSuccess: () => qc.invalidateQueries(['raffle-prize-items', raffleId]),
  });

  const handleAdd = () => {
    if (!form.label.trim()) return;
    createMutation.mutate({
      raffle_id: raffleId,
      label: form.label.trim(),
      description: form.description.trim() || null,
      ticket_cost: Number(form.ticket_cost) || 1,
      value_cents: form.value_cents !== '' ? Math.round(parseFloat(form.value_cents) * 100) : null,
      item_number: form.item_number !== '' ? Number(form.item_number) : (items.length + 1),
      sort_order: form.item_number !== '' ? Number(form.item_number) : items.length,
    });
  };

  const winners = sorted.filter(i => i.winner_player_name);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prize Items</p>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      {/* Winners summary — shown prominently once any draws happen */}
      {winners.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" /> Winners
          </p>
          {winners.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 truncate">{item.item_number ? `#${item.item_number} ` : ''}{item.label}</span>
              <span className="font-semibold text-amber-800 shrink-0 ml-2">{item.winner_player_name}</span>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Item #</Label>
              <Input type="number" min="1" value={form.item_number} onChange={e => setForm(f => ({ ...f, item_number: e.target.value }))} placeholder={items.length + 1} className="h-8 text-sm mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Prize name</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Wine Basket" className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Tickets/entry</Label>
              <div className="flex items-center gap-1 mt-1">
                <button type="button" onClick={() => setForm(f => ({ ...f, ticket_cost: Math.max(1, (Number(f.ticket_cost) || 1) - 1) }))} className="h-8 w-8 flex items-center justify-center border rounded-md bg-white hover:bg-slate-100 text-slate-600 shrink-0 text-lg font-bold">−</button>
                <Input type="number" min="1" max="99" value={form.ticket_cost} onChange={e => setForm(f => ({ ...f, ticket_cost: e.target.value === '' ? '' : Number(e.target.value) }))} className="h-8 text-sm text-center w-14" />
                <button type="button" onClick={() => setForm(f => ({ ...f, ticket_cost: (Number(f.ticket_cost) || 1) + 1 }))} className="h-8 w-8 flex items-center justify-center border rounded-md bg-white hover:bg-slate-100 text-slate-600 shrink-0 text-lg font-bold">+</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Prize value ($)</Label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input type="number" min="0" step="1" className="h-8 text-sm pl-5" value={form.value_cents} placeholder="0.00" onChange={e => setForm(f => ({ ...f, value_cents: e.target.value }))} />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details…" className="h-8 text-sm mt-1" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!form.label || createMutation.isPending}>Add</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !adding && (
        <p className="text-xs text-slate-400 text-center py-4">No items yet. Add prize items above.</p>
      )}

      <div className="space-y-1.5">
        {sorted.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${item.winner_player_name ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <span className="text-xs font-bold text-slate-400 w-5">{item.item_number ?? i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
              {item.winner_player_name ? (
                <p className="text-xs text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Trophy className="h-3 w-3" /> {item.winner_player_name}
                </p>
              ) : (
                item.description && <p className="text-xs text-slate-400 truncate">{item.description}</p>
              )}
            </div>
            {item.value_cents > 0 && (
              <span className="text-xs text-green-700 font-semibold shrink-0">${(item.value_cents / 100).toFixed(0)}</span>
            )}
            <Badge variant="outline" className="text-xs shrink-0">{item.ticket_cost} ticket{item.ticket_cost !== 1 ? 's' : ''}/entry</Badge>
            <button onClick={() => { if (confirm('Remove this item?')) deleteMutation.mutate(item.id); }} className="text-red-300 hover:text-red-500 shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}