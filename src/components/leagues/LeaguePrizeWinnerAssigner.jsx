import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { leaguePrizes as leaguePrizesApi } from '@/services/resources';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trophy, X, Check, Banknote } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LeaguePrizeWinnerAssigner({
  leagueId,
  prizes,
  leagueMembers,
  onUpdate,
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null); // null or prize id being edited
  const [newPrizeForm, setNewPrizeForm] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async (prizeData) => {
      return leaguePrizesApi.create({
        ...prizeData,
        league_id: leagueId,
        amount: Number(prizeData.amount) || 0,
      });
    },
    onSuccess: () => {
      onUpdate();
      setNewPrizeForm(null);
      toast({ title: 'Prize added!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return leaguePrizesApi.update(id, data);
    },
    onSuccess: () => {
      onUpdate();
      setEditing(null);
      toast({ title: 'Prize updated!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leaguePrizesApi.remove(id),
    onSuccess: () => { onUpdate(); toast({ title: 'Prize removed.' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const payOutMutation = useMutation({
    mutationFn: (prizeId) => callAction('notifyLeaguePrizePayout', { prizeId }),
    onSuccess: () => { onUpdate(); toast({ title: 'Paid out! Player has been notified by email.' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleAddPrize = () => {
    if (!newPrizeForm?.player_email || !newPrizeForm?.amount) {
      toast({ title: 'Fill in all fields', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(newPrizeForm);
  };

  return (
    <div className="space-y-3">
      {/* Existing prizes */}
      {prizes.map((prize) => (
        <div key={prize.id} className="border rounded-xl p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">{prize.player_name}</span>
              <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                ${(prize.amount / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {prize.paid_out ? (
                <span className="flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-100 px-2.5 py-1 rounded-full">
                  <Check className="h-3 w-3" /> Paid out
                </span>
              ) : (
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => payOutMutation.mutate(prize.id)}
                  disabled={payOutMutation.isPending}
                >
                  <Banknote className="h-3 w-3" /> Mark Paid
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteMutation.mutate(prize.id)}
                disabled={deleteMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {prize.notes && (
            <p className="text-xs text-slate-500 mt-2">{prize.notes}</p>
          )}
        </div>
      ))}

      {/* Add prize form */}
      {newPrizeForm && (
        <div className="border rounded-xl p-4 bg-blue-50 border-blue-200">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Player</label>
              <Select
                value={newPrizeForm.player_email || ''}
                onValueChange={(email) => {
                  const member = leagueMembers.find(m => m.player_email === email);
                  setNewPrizeForm(prev => ({
                    ...prev,
                    player_email: email,
                    player_name: member?.player_name || '',
                  }));
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {leagueMembers.map(m => (
                    <SelectItem key={m.player_email} value={m.player_email}>
                      {m.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Amount ($)</label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={newPrizeForm.amount ?? ''}
                onChange={(e) => setNewPrizeForm(prev => ({ ...prev, amount: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddPrize}
                disabled={saveMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" /> Add Prize
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewPrizeForm(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!newPrizeForm && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setNewPrizeForm({ player_email: '', player_name: '', amount: '' })}
        >
          + Add Prize
        </Button>
      )}
    </div>
  );
}