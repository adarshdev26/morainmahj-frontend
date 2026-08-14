import React, { useState, useEffect } from 'react';
import { callAction } from '@/services/actions';
import { prizeWinners as prizeWinnersApi } from '@/services/resources';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trophy, X, Check, Banknote } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PrizeWinnerAssigner({
  tournamentId,
  categories,
  prizeWinners,
  registrations,
  prizeStructure,
  getDollarAmount,
  autoAssignments,
  onUpdate,
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState({}); // { [category]: { playerId, amount } }

  // When autoAssignments arrives, pre-populate all editing fields
  useEffect(() => {
    if (!autoAssignments) return;
    const { overall, roundWinners, amounts = {} } = autoAssignments;
    const newEditing = {};

    console.log('[PrizeWinnerAssigner] autoAssignments received:', JSON.stringify({ overall: overall?.length, roundWinners, amounts }));

    const placeMap = { '1st': 0, '2nd': 1, '3rd': 2 };
    Object.entries(placeMap).forEach(([cat, idx]) => {
      newEditing[cat] = {
        playerId: overall[idx]?.id || '',
        amount: amounts[cat] !== undefined ? amounts[cat] : '',
      };
    });

    [1, 2, 3, 4].forEach(r => {
      const cat = `round_${r}`;
      newEditing[cat] = {
        playerId: roundWinners[r]?.id || '',
        amount: amounts[cat] !== undefined ? amounts[cat] : '',
      };
    });

    console.log('[PrizeWinnerAssigner] newEditing:', JSON.stringify(newEditing));
    setEditing(newEditing);
  }, [autoAssignments]);

  const saveMutation = useMutation({
    mutationFn: async ({ category, playerId, amount }) => {
      const existing = prizeWinners.find(w => w.category === category);
      const reg = registrations.find(r => r.player_id === playerId);
      const data = {
        tournament_id: tournamentId,
        player_id: playerId,
        player_name: reg?.player_name || '',
        player_email: reg?.player_email || '',
        category,
        amount: Number(amount) || 0,
      };
      if (existing) {
        return prizeWinnersApi.update(existing.id, data);
      }
      return prizeWinnersApi.create(data);
    },
    onSuccess: () => {
      onUpdate();
      toast({ title: 'Winner saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => prizeWinnersApi.remove(id),
    onSuccess: () => { onUpdate(); toast({ title: 'Winner removed.' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const payOutMutation = useMutation({
    mutationFn: (winnerId) => callAction('notifyPrizePayOut', { winnerId }),
    onSuccess: () => { onUpdate(); toast({ title: 'Paid out! Player has been notified by email.' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const startEditing = (category) => {
    const existing = prizeWinners.find(w => w.category === category);
    const suggestedAmount = getSuggestedAmount(category);
    setEditing(prev => ({
      ...prev,
      [category]: {
        playerId: existing?.player_id || '',
        amount: existing?.amount || suggestedAmount || '',
      },
    }));
  };

  const getSuggestedAmount = (category) => {
    if (!prizeStructure) return null;
    const keyMap = {
      '1st': 'place_1st',
      '2nd': 'place_2nd',
      '3rd': 'place_3rd',
      'round_1': 'round_1_winner',
      'round_2': 'round_2_winner',
      'round_3': 'round_3_winner',
      'round_4': 'round_4_winner',
    };
    const val = prizeStructure[keyMap[category]];
    return getDollarAmount(val) ? Math.round(getDollarAmount(val)) : null;
  };

  const handleSave = (category) => {
    const { playerId, amount } = editing[category] || {};
    if (!playerId) { toast({ title: 'Select a player', variant: 'destructive' }); return; }
    saveMutation.mutate({ category, playerId, amount });
    setEditing(prev => { const n = { ...prev }; delete n[category]; return n; });
  };

  const cancelEditing = (category) => {
    setEditing(prev => { const n = { ...prev }; delete n[category]; return n; });
  };

  return (
    <div className="space-y-3">
      {categories.map(({ key, label }) => {
        const winner = prizeWinners.find(w => w.category === key);
        const isEditing = !!editing[key];
        const suggested = getSuggestedAmount(key);

        return (
          <div key={key} className="border rounded-xl p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {suggested && (
                  <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    ${suggested.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {winner && !isEditing && (
                  <>
                    {winner.paid_out ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-100 px-2.5 py-1 rounded-full">
                        <Check className="h-3 w-3" /> Paid out
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => payOutMutation.mutate(winner.id)}
                        disabled={payOutMutation.isPending}
                      >
                        <Banknote className="h-3 w-3" /> Mark Paid
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEditing(key)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(winner.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {!winner && !isEditing && (
                  <Button size="sm" variant="outline" onClick={() => startEditing(key)}>Assign</Button>
                )}
              </div>
            </div>

            {!isEditing && winner && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                  {winner.player_name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{winner.player_name}</p>
                  <p className="text-xs text-slate-500">${winner.amount?.toLocaleString()} awarded</p>
                </div>
              </div>
            )}

            {!isEditing && !winner && (
              <p className="text-xs text-slate-400 italic">No winner assigned yet</p>
            )}

            {isEditing && (
              <div className="flex items-end gap-3 mt-2">
                <div className="flex-1">
                  <Select
                    value={editing[key]?.playerId || ''}
                    onValueChange={(val) => setEditing(prev => ({ ...prev, [key]: { ...prev[key], playerId: val } }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select player..." />
                    </SelectTrigger>
                    <SelectContent>
                      {registrations.map(r => (
                        <SelectItem key={r.player_id} value={r.player_id}>
                          {r.player_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    placeholder="$ amount"
                    value={editing[key]?.amount ?? ''}
                    onChange={(e) => setEditing(prev => ({ ...prev, [key]: { ...prev[key], amount: e.target.value } }))}
                  />
                </div>
                <Button size="sm" onClick={() => handleSave(key)} disabled={saveMutation.isPending}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => cancelEditing(key)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}