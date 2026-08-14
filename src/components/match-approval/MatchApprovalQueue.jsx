import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callAction } from '@/services/actions';
import { matchResults as matchResultsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, AlertTriangle, Clock, Loader2, Inbox } from 'lucide-react';

/**
 * MatchApprovalQueue — shows pending match results awaiting the current player's approval.
 *
 * Props:
 *  - tournamentId
 */
export default function MatchApprovalQueue({ tournamentId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disputeFor, setDisputeFor] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [acting, setActing] = useState(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['match-results-approval', tournamentId],
    queryFn: () => matchResultsApi.filter({ tournament_id: tournamentId }, '-submitted_at', 200),
    enabled: !!tournamentId,
  });

  const myPending = results.filter((r) => {
    const playerIds = [r.player1_id, r.player2_id, r.player3_id, r.player4_id].filter(Boolean);
    if (!playerIds.includes(user?.id)) return false;
    if (r.status !== 'pending_approval') return false;
    if (r.submitted_by_id === user?.id) return false; // East is the submitter
    const approvedIds = (r.approvals || []).map((a) => a.player_id);
    const disputedIds = (r.disputes || []).map((d) => d.player_id);
    return !approvedIds.includes(user?.id) && !disputedIds.includes(user?.id);
  });

  const handleAction = async (result, action, reason) => {
    setActing(result.id);
    try {
      const data = await callAction('respondToMatchResult', {
        match_result_id: result.id,
        action,
        reason: action === 'dispute' ? reason : undefined,
      });
      if (data?.error) throw new Error(data.error);
      toast({
        title: action === 'approve' ? '✅ Approved' : '⚠️ Issue Reported',
        description: action === 'approve' ? 'Thanks — your approval was recorded.' : 'The organizer has been notified of the dispute.',
      });
      queryClient.invalidateQueries({ queryKey: ['match-results-approval'] });
      setDisputeFor(null);
      setDisputeReason('');
    } catch (err) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    } finally {
      setActing(null);
    }
  };

  if (isLoading) {
    return (
      <Card><CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading approvals…
      </CardContent></Card>
    );
  }

  if (myPending.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-amber-600" />
        <h3 className="font-heading font-semibold text-foreground">Match Results Awaiting Your Approval</h3>
        <Badge className="bg-amber-100 text-amber-700">{myPending.length}</Badge>
      </div>

      {myPending.map((r) => (
        <Card key={r.id} className="border-amber-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Round {r.round_number}</Badge>
                <Badge variant="outline">Table {r.table_number}</Badge>
                <Badge className="bg-amber-100 text-amber-700 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
              </div>
              <span className="text-xs text-muted-foreground">Submitted by {r.submitted_by_name || 'East'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Winner:</span> <span className="font-semibold">{r.winner_name || '—'}</span></div>
              <div><span className="text-muted-foreground">How won:</span> <span className="font-medium">{r.win_type}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Winning hand:</span> <span className="font-medium">{r.winning_hand_label || '—'}</span></div>
            </div>

            {disputeFor === r.id ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Describe the issue with this result…"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setDisputeFor(null); setDisputeReason(''); }}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    disabled={acting === r.id}
                    onClick={() => handleAction(r, 'dispute', disputeReason)}
                  >
                    {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Submit Issue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1 flex-1"
                  disabled={acting === r.id}
                  onClick={() => handleAction(r, 'approve')}
                >
                  {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-1"
                  disabled={acting === r.id}
                  onClick={() => setDisputeFor(r.id)}
                >
                  <AlertTriangle className="w-4 h-4" /> Report Issue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}