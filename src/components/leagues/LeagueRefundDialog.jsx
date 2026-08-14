import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { auditLogs as auditLogsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LeagueRefundDialog({ member, league, open, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data: history = [] } = useQuery({
    queryKey: ['league-refund-history', member?.id],
    queryFn: () => auditLogsApi.filter({ entity_type: 'LeagueMember', entity_id: member.id, action: 'refund' }),
    enabled: !!member?.id && open,
  });

  const refundMutation = useMutation({
    mutationFn: (payload) => callAction('processLeagueRefund', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-members'] });
      queryClient.invalidateQueries({ queryKey: ['league-refund-history', member?.id] });
      toast({ title: 'Refund processed' });
      onClose();
    },
    onError: (err) => toast({
      title: 'Refund failed',
      description: err?.response?.data?.error || err?.message,
      variant: 'destructive',
    }),
  });

  const handleSubmit = () => {
    const payload = { member_id: member.id, refund_type: type, reason };
    if (type === 'partial') payload.amount = Number(amount);
    refundMutation.mutate(payload);
  };

  if (!member) return null;
  const paid = member.payment_status === 'paid';
  const fee = member.payment_amount || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Refund Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            <p className="font-medium">{member.player_name}</p>
            <p className="text-slate-500 text-xs">{member.player_email}</p>
            <p className="text-xs mt-1">Paid: ${(fee / 100).toFixed(2)} · <Badge variant="outline" className="text-xs">{member.payment_status}</Badge></p>
          </div>

          {!paid && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">This member hasn't paid via Stripe; only a manual refund can be recorded.</p>
          )}

          <div>
            <Label className="text-xs">Refund type</Label>
            <div className="flex gap-2 mt-1">
              {['full', 'partial', 'manual'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  disabled={!paid && t !== 'manual'}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-input hover:bg-accent'} ${!paid && t !== 'manual' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {type === 'partial' && (
            <div>
              <Label className="text-xs">Amount (cents)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(fee)} />
            </div>
          )}

          <div>
            <Label className="text-xs">Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. player request" />
          </div>

          {history.length > 0 && (
            <div>
              <Label className="text-xs">Refund history</Label>
              <div className="mt-1 space-y-1 max-h-28 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="text-xs border rounded p-2">
                    <span className="font-medium capitalize">{h.details?.type || 'refund'}</span>
                    {h.details?.amount ? ` · $${(h.details.amount / 100).toFixed(2)}` : ''}
                    {h.details?.reason ? ` · ${h.details.reason}` : ''}
                    <span className="text-slate-400"> · {new Date(h.created_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={refundMutation.isPending} className="gap-1">
            {refundMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}