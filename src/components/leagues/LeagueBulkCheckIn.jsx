import React, { useState } from 'react';
import { leagueRsvps as leagueRsvpsApi } from '@/services/resources';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Undo2, Clock, XCircle, CheckCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LeagueBulkCheckIn({ session, rsvps }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(() => new Set());
  const attending = rsvps.filter(r => r.status === 'yes');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['session-rsvps', session.id] });

  const bulkMutate = useMutation({
    mutationFn: async (updates) => leagueRsvpsApi.bulkUpdate(updates),
    onSuccess: () => { invalidate(); setSelected(new Set()); },
    onError: (err) => toast({ title: 'Error', description: err?.message || 'Update failed', variant: 'destructive' }),
  });

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const allSelected = attending.length > 0 && selected.size === attending.length;

  const runBulk = (patch) => {
    const ids = [...selected];
    if (ids.length === 0) {
      toast({ title: 'Select at least one player first' });
      return;
    }
    const now = new Date().toISOString();
    const updates = ids.map(id => {
      const r = rsvps.find(x => x.id === id) || {};
      const merged = { ...patch };
      if ('checked_in' in merged) {
        merged.checked_in_at = merged.checked_in ? (r.checked_in_at || now) : null;
      }
      return { id, ...merged };
    });
    bulkMutate.mutate(updates);
    toast({ title: `Updated ${ids.length} player${ids.length === 1 ? '' : 's'}` });
  };

  return (
    <div className="bg-white border rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CheckCheck className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-sm">Bulk Check-In</h3>
          <Badge variant="outline" className="text-xs">{selected.size} selected</Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelected(allSelected ? new Set() : new Set(attending.map(r => r.id)))}
        >
          {allSelected ? 'Clear All' : 'Select All'}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" className="gap-1" disabled={bulkMutate.isPending} onClick={() => runBulk({ checked_in: true })}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Check In
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={bulkMutate.isPending} onClick={() => runBulk({ checked_in: false })}>
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={bulkMutate.isPending} onClick={() => runBulk({ late_arrival: true, checked_in: true })}>
          <Clock className="h-3.5 w-3.5" /> Late Arrival
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={bulkMutate.isPending} onClick={() => runBulk({ marked_no_show: true, checked_in: false })}>
          <XCircle className="h-3.5 w-3.5" /> No Show
        </Button>
      </div>

      {attending.length > 0 && (
        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          {attending.map(r => (
            <label key={r.id} className="flex items-center gap-2 py-1 cursor-pointer">
              <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
              <span className="text-sm flex-1 truncate">{r.player_name}</span>
              {r.checked_in && !r.marked_no_show && <Badge className="bg-green-100 text-green-700 text-[10px]">In</Badge>}
              {r.late_arrival && <Badge variant="outline" className="text-[10px]">Late</Badge>}
              {r.marked_no_show && <Badge className="bg-red-100 text-red-600 text-[10px]">No-show</Badge>}
            </label>
          ))}
        </div>
      )}
      {attending.length === 0 && (
        <p className="text-xs text-slate-400 mt-2">No attending players to check in.</p>
      )}
    </div>
  );
}