import React, { useState } from 'react';
import { raffles as rafflesApi } from '@/services/resources';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, ExternalLink } from 'lucide-react';

export default function TRaffleAdminControls({ raffle }) {
  const qc = useQueryClient();
  const [drawMode, setDrawMode] = useState('one_by_one');

  const updateMutation = useMutation({
    mutationFn: (data) => rafflesApi.update(raffle.id, data),
    onSuccess: () => qc.invalidateQueries(['raffles']),
  });

  const toggleAllocation = () => {
    updateMutation.mutate({ allocation_open: !raffle.allocation_open });
  };

  const setCloseAfterRound = (val) => {
    updateMutation.mutate({ allocation_closes_after_round: val === '' ? null : Number(val) });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prize Raffle — Allocation Window</p>
        {raffle.status === 'drawn' && (
          <Badge className="bg-purple-100 text-purple-700">Drawn ✓</Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {raffle.allocation_open
            ? <Unlock className="h-4 w-4 text-green-500" />
            : <Lock className="h-4 w-4 text-slate-400" />
          }
          <Label className="text-sm font-medium">
            Allocation {raffle.allocation_open ? 'Open' : 'Closed'}
          </Label>
          <Badge className={raffle.allocation_open ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
            {raffle.allocation_open ? 'Players can allocate' : 'Locked'}
          </Badge>
        </div>
        <Switch
          checked={!!raffle.allocation_open}
          onCheckedChange={toggleAllocation}
          disabled={updateMutation.isPending}
        />
      </div>

      <div>
        <Label className="text-xs text-slate-500">Auto-close after round</Label>
        <select
          value={raffle.allocation_closes_after_round ?? ''}
          onChange={e => setCloseAfterRound(e.target.value)}
          className="mt-1 flex h-8 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Manual only</option>
          <option value="1">After Round 1</option>
          <option value="2">After Round 2</option>
          <option value="3">After Round 3</option>
          <option value="4">After Round 4</option>
        </select>
        <p className="text-xs text-slate-400 mt-1">Auto-close requires the round timer to be marked complete.</p>
      </div>

      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Draw</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDrawMode('one_by_one')}
            className={`rounded-lg border p-3 text-left transition-all ${drawMode === 'one_by_one' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <p className="text-lg mb-0.5">🎰</p>
            <p className="text-xs font-semibold">One at a Time</p>
            <p className="text-xs opacity-70">Spin for each prize</p>
          </button>
          <button
            onClick={() => setDrawMode('all_at_once')}
            className={`rounded-lg border p-3 text-left transition-all ${drawMode === 'all_at_once' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <p className="text-lg mb-0.5">⚡</p>
            <p className="text-xs font-semibold">All at Once</p>
            <p className="text-xs opacity-70">Reveal all winners</p>
          </button>
        </div>

        {raffle.allocation_open && (
          <p className="text-xs text-amber-600">⚠️ Allocation is still open — consider closing it before drawing.</p>
        )}

        {raffle.must_be_present === false && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-100">
            🔔 Winners will be notified by push notification (not must-be-present)
          </p>
        )}
        <Button
          size="sm"
          className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white w-full"
          onClick={() => window.open(`/t-raffle-display/${raffle.id}?mode=${drawMode}&notify=${raffle.must_be_present === false ? '1' : '0'}`, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open Draw Display
        </Button>
      </div>
    </div>
  );
}