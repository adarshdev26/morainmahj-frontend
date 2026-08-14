import React, { useState, useEffect } from 'react';
import { callAction } from '@/services/actions';
import { CreditCard, ShieldCheck, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * AuctionCardGate
 * Wraps the silent auction bid UI. If the user doesn't have a card on file,
 * shows a prompt to save one via Stripe before they can bid.
 *
 * Props:
 *   auctionId  – the SilentAuction record id (used for redirect URL)
 *   children   – the actual bid UI to show once card is confirmed
 */
export default function AuctionCardGate({ auctionId, children }) {
  const [status, setStatus] = useState('loading'); // loading | no_card | has_card | saving
  const [cardInfo, setCardInfo] = useState(null);

  useEffect(() => {
    // Check if returning from Stripe card-save redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('card_saved') === '1') {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      setStatus('has_card');
      setCardInfo({ just_saved: true });
      return;
    }
    checkCard();
  }, []);

  const checkCard = async () => {
    setStatus('loading');
    const res = await callAction('checkAuctionCard', {});
    if (res?.has_card) {
      setCardInfo(res);
      setStatus('has_card');
    } else {
      setStatus('no_card');
    }
  };

  const handleSaveCard = async () => {
    setStatus('saving');
    const res = await callAction('saveAuctionCard', { auction_id: auctionId });
    if (res?.already_saved) {
      setCardInfo(res);
      setStatus('has_card');
    } else if (res?.url) {
      window.location.href = res.url;
    } else {
      setStatus('no_card');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Checking payment info…</span>
      </div>
    );
  }

  if (status === 'no_card' || status === 'saving') {
    return (
      <div className="border border-dashed border-amber-300 rounded-xl p-5 bg-amber-50 space-y-3">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-slate-800">Card required to bid</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Save a card on file to place bids. <strong>You won't be charged now.</strong> If you win an item, your card will be automatically charged for your winning bid when the auction closes.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          disabled={status === 'saving'}
          onClick={handleSaveCard}
        >
          {status === 'saving' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Redirecting to Stripe…</>
          ) : (
            <><CreditCard className="h-3.5 w-3.5 mr-1.5" /> Save Card & Start Bidding <ChevronRight className="h-3.5 w-3.5 ml-auto" /></>
          )}
        </Button>
        <p className="text-[10px] text-center text-slate-400">Secured by Stripe · Your card details are never stored on our servers</p>
      </div>
    );
  }

  // has_card — show the bid UI with a subtle "card on file" indicator
  return (
    <div>
      {cardInfo && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            {cardInfo.just_saved
              ? 'Card saved! You\'re ready to bid.'
              : `Card on file: ${cardInfo.card_brand?.toUpperCase()} ···· ${cardInfo.card_last4}`}
          </p>
        </div>
      )}
      {children}
    </div>
  );
}