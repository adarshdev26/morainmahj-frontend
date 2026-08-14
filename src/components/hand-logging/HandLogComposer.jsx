import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callAction } from '@/services/actions';
import { cardHands as cardHandsApi, specialHands as specialHandsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Check, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { CATEGORIES, WIN_TYPES, lineLabel, concealedLabel } from '@/lib/card-constants';

/**
 * HandLogComposer — 3-tap hand logging interface.
 *
 * Props:
 *  - context: { tournament_id, tournament_name, league_id, league_name, card_year, organization_id, round, table }
 *  - open: boolean
 *  - onClose: () => void
 *  - preselectStatus: 'Won' | 'Attempted' (optional)
 */
export default function HandLogComposer({ context, open, onClose, preselectStatus }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cardYear = context?.card_year || new Date().getFullYear();

  const [step, setStep] = useState(1);
  const [status, setStatus] = useState(preselectStatus || 'Won');
  const [category, setCategory] = useState('');
  const [selectedHand, setSelectedHand] = useState(null); // CardHand or null
  const [specialHand, setSpecialHand] = useState(null); // SpecialHand or null
  const [winType, setWinType] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setStatus(preselectStatus || 'Won');
      setCategory('');
      setSelectedHand(null);
      setSpecialHand(null);
      setWinType('');
    }
  }, [open, preselectStatus]);

  // Fetch card hands for selected year + category
  const { data: cardHands = [], isLoading: loadingHands } = useQuery({
    queryKey: ['card-hands-for-log', cardYear, category],
    queryFn: () =>
      cardHandsApi.filter({ card_year: cardYear, category }, 'position', 50),
    enabled: !!category && open,
  });

  // Fetch special hands for this tournament/league
  const specialHandFilter = useMemo(() => {
    if (context?.tournament_id) return { tournament_id: context.tournament_id, active: true };
    if (context?.league_id) return { league_id: context.league_id, active: true };
    return null;
  }, [context?.tournament_id, context?.league_id]);

  const { data: specialHands = [] } = useQuery({
    queryKey: ['special-hands-for-log', specialHandFilter],
    queryFn: () => specialHandsApi.filter(specialHandFilter, 'name', 50),
    enabled: !!specialHandFilter && open,
  });

  const hasCardData = cardHands.length > 0;

  const handlePickCategory = (c) => {
    setCategory(c);
    setSelectedHand(null);
    setSpecialHand(null);
  };

  const handlePickLine = (hand) => {
    setSelectedHand(hand);
    setSpecialHand(null);
  };

  const handlePickSpecial = (sh) => {
    setSpecialHand(sh);
    setSelectedHand(null);
  };

  const canGoNext = () => {
    if (step === 1) return !!category;
    if (step === 2) return !!selectedHand || !!specialHand;
    if (step === 3) {
      if (status === 'Won') return !!winType;
      return true; // attempted
    }
    return false;
  };

  const handleLog = async () => {
    if (!canGoNext()) return;
    setSaving(true);
    try {
      const payload = {
        card_year: cardYear,
        status,
        win_type: status === 'Won' ? winType : undefined,
        special_hand_id: specialHand?.id || undefined,
        category: specialHand ? undefined : category,
        position: specialHand ? undefined : selectedHand?.position,
        side: specialHand ? undefined : selectedHand?.side || 'none',
        tournament_id: context?.tournament_id || '',
        tournament_name: context?.tournament_name || '',
        league_id: context?.league_id || '',
        league_name: context?.league_name || '',
        session_id: context?.session_id || '',
        organization_id: context?.organization_id || user?.data?.organization_id || '',
        round: context?.round || '',
        table: context?.table || '',
        notes: '',
      };

      const data = await callAction('logHand', payload);
      if (data?.error) throw new Error(data.error);

      toast({
        title: '✅ Hand Logged!',
        description: specialHand
          ? `${specialHand.name} — ${data.points || 0} pts (${specialHand.concealed ? 'Concealed' : 'Exposed'})`
          : `${category} > Line ${selectedHand ? lineLabel(selectedHand) : ''} — ${data.points || 0} pts`,
      });
      queryClient.invalidateQueries({ queryKey: ['hand-logs-player'] });
      queryClient.invalidateQueries({ queryKey: ['hand-logs-admin'] });
      onClose();
    } catch (err) {
      toast({ title: 'Failed to log hand', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const summaryPoints = specialHand
    ? status === 'Won' ? specialHand.point_value : 0
    : selectedHand
    ? status === 'Won' ? selectedHand.points : 0
    : null;
  const summaryConcealed = specialHand
    ? specialHand.concealed
    : selectedHand
    ? selectedHand.concealed_exposed === 'C'
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Log Your Hand — Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {/* Status toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={status === 'Won' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('Won')}
            className="flex-1"
          >
            <Trophy className="w-4 h-4" /> Won
          </Button>
          <Button
            type="button"
            variant={status === 'Attempted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('Attempted')}
            className="flex-1"
          >
            <Target className="w-4 h-4" /> Attempted
          </Button>
        </div>

        {/* STEP 1: Category */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a card category:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePickCategory(c)}
                  className={`min-h-[44px] px-3 py-3 rounded-lg border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    category === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  {category === c && <Check className="w-4 h-4" />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Line + special hands */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You selected: <span className="font-semibold text-foreground">{category}</span>
            </p>

            {/* Standard lines */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Standard Hands</p>
              {loadingHands ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !hasCardData ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Card data not configured for {cardYear}. Contact admin.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {cardHands.map((h, idx) => {
                    const isSelected = selectedHand?.id === h.id;
                    return (
                      <button
                        key={`${h.id}-${idx}`}
                        type="button"
                        onClick={() => handlePickLine(h)}
                        className={`min-h-[44px] px-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        Line {lineLabel(h)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Special hands */}
            {specialHands.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Special Hands for This Event
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {specialHands.map((sh) => {
                    const isSelected = specialHand?.id === sh.id;
                    return (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => handlePickSpecial(sh)}
                        className={`min-h-[44px] px-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        {sh.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Auto-fill display */}
            {summaryPoints !== null && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                <p><span className="text-muted-foreground">Points:</span> <span className="font-bold">{summaryPoints}</span></p>
                <p><span className="text-muted-foreground">Concealment:</span> <span className="font-semibold">{summaryConcealed ? 'Concealed' : 'Exposed'}</span></p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Win type / attempted confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {specialHand
                ? `You selected: ${specialHand.name}`
                : `You selected: ${category} > Line ${selectedHand ? lineLabel(selectedHand) : ''}`}
            </p>

            {status === 'Won' ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">How did you win?</p>
                <div className="grid grid-cols-3 gap-2">
                  {WIN_TYPES.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWinType(w)}
                      className={`min-h-[44px] px-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                        winType === w
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                You tried for this hand but didn't win. This will be logged as "Attempted". No points awarded.
              </div>
            )}

            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
              <p><span className="text-muted-foreground">Category:</span> <span className="font-medium">{specialHand ? specialHand.name : category}</span></p>
              <p><span className="text-muted-foreground">Line:</span> <span className="font-medium">{specialHand ? '—' : (selectedHand ? lineLabel(selectedHand) : '')}</span></p>
              <p><span className="text-muted-foreground">Points:</span> <span className="font-bold">{summaryPoints}</span></p>
              <p><span className="text-muted-foreground">Concealment:</span> <span className="font-semibold">{summaryConcealed ? 'Concealed' : 'Exposed'}</span></p>
              <p><span className="text-muted-foreground">Status:</span> <span className="font-semibold">{status}</span></p>
              {status === 'Won' && winType && (
                <p><span className="text-muted-foreground">Win Type:</span> <span className="font-medium">{winType}</span></p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => canGoNext() && setStep(step + 1)}
              disabled={!canGoNext()}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleLog} disabled={!canGoNext() || saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Log Hand
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}