import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callAction } from '@/services/actions';
import { cardHands as cardHandsApi } from '@/services/resources';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trophy, Send } from 'lucide-react';
import { CATEGORIES, WIN_TYPES, lineLabel } from '@/lib/card-constants';

/**
 * MatchSubmission — East player submits a match result.
 *
 * Props:
 *  - open, onClose
 *  - context: { tournament_id, round_number, table_number, players (array of {id,name}), card_year, organization_id }
 *  - existingResult: MatchResult | null (if already submitted, show read-only summary)
 *  - onSubmitted: () => void
 */
export default function MatchSubmission({ open, onClose, context, existingResult, onSubmitted }) {
  const { toast } = useToast();
  const cardYear = context?.card_year || new Date().getFullYear();

  const [winnerId, setWinnerId] = useState('');
  const [category, setCategory] = useState('');
  const [lineHandId, setLineHandId] = useState('');
  const [lineText, setLineText] = useState('');
  const [winType, setWinType] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setWinnerId('');
      setCategory('');
      setLineHandId('');
      setLineText('');
      setWinType('');
    }
  }, [open]);

  const players = context?.players || [];

  const { data: cardHands = [], isLoading: loadingHands } = useQuery({
    queryKey: ['card-hands-match', cardYear, category],
    queryFn: () => cardHandsApi.filter({ card_year: cardYear, category }, 'position', 50),
    enabled: !!category && open,
  });

  const selectedHand = cardHands.find((h) => h.id === lineHandId) || null;
  const lineLabelValue = selectedHand ? lineLabel(selectedHand) : lineText;
  const fullLabel = `${category}${lineLabelValue ? ' > Line ' + lineLabelValue : ''}`;

  const canSubmit = winnerId && category && (selectedHand || lineText) && winType;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const data = await callAction('submitMatchResult', {
        tournament_id: context.tournament_id,
        round_number: Number(context.round_number),
        table_number: Number(context.table_number),
        winner_id: winnerId,
        winning_hand_category: category,
        winning_hand_line: lineLabelValue,
        winning_hand_label: fullLabel,
        win_type: winType,
      });
      if (data?.error) throw new Error(data.error);
      toast({ title: '✅ Match Result Submitted', description: 'Other players have been notified to approve.' });
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to submit', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Submit Match Result
          </DialogTitle>
        </DialogHeader>

        {existingResult ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">A result has already been submitted for this table:</p>
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
              <p><span className="text-muted-foreground">Winner:</span> <span className="font-semibold">{existingResult.winner_name || '—'}</span></p>
              <p><span className="text-muted-foreground">Hand:</span> <span className="font-medium">{existingResult.winning_hand_label || '—'}</span></p>
              <p><span className="text-muted-foreground">How won:</span> <span className="font-medium">{existingResult.win_type}</span></p>
              <p><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{String(existingResult.status).replace('_', ' ')}</span></p>
            </div>
            <p className="text-xs text-muted-foreground">Approvals: {(existingResult.approvals || []).length} · Disputes: {(existingResult.disputes || []).length}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Winner</Label>
              <Select value={winnerId} onValueChange={setWinnerId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select winner" /></SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Winning Hand — Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setLineHandId(''); setLineText(''); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Winning Hand — Line</Label>
              {loadingHands ? (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading lines…</div>
              ) : cardHands.length > 0 ? (
                <Select value={lineHandId} onValueChange={setLineHandId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select line" /></SelectTrigger>
                  <SelectContent>
                    {cardHands.map((h) => (
                      <SelectItem key={h.id} value={h.id}>Line {lineLabel(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1"
                  placeholder="e.g. 1A"
                  value={lineText}
                  onChange={(e) => setLineText(e.target.value)}
                />
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">How Won</Label>
              <Select value={winType} onValueChange={setWinType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select win type" /></SelectTrigger>
                <SelectContent>
                  {WIN_TYPES.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!existingResult && (
            <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit & Notify
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}