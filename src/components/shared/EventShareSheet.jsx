import React, { useState, useEffect } from 'react';
import { callAction } from '@/services/actions';
import { appParams } from '@/lib/app-params';
import { Button } from '@/components/ui/button';
import { Share2, QrCode, Copy, Check, X, Link } from 'lucide-react';

// Tiny QR code using a free API
function QRCodeDisplay({ url }) {
  const encoded = encodeURIComponent(url);
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&margin=1`}
        alt="QR Code"
        className="w-48 h-48 rounded-xl border border-border"
      />
      <p className="text-xs text-muted-foreground text-center">Show this to a friend to share</p>
    </div>
  );
}

/**
 * EventShareSheet
 * 
 * Props:
 *   contextType: 'tournament' | 'league' | 'course'
 *   contextId: string
 *   contextName: string
 */
export default function EventShareSheet({ contextType, contextId, contextName, onClose }) {
  const [step, setStep] = useState('loading'); // loading | link | qr | disabled | error
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await callAction('generateShareToken', {
          context_type: contextType,
          context_id: contextId,
        });
        if (cancelled) return;
        if (res.error) {
          if (res.error.includes('not enabled')) {
            setStep('disabled');
          } else {
            setStep('error');
          }
          return;
        }
        const token = res.token;
        // Use the hosted app URL (not the native shell's localhost origin)
        const base = (appParams.appBaseUrl || window.location.origin).replace(/\/$/, '');
        let url;
        if (contextType === 'tournament') url = `${base}/tournament/${contextId}?ref=${token}`;
        else if (contextType === 'league')  url = `${base}/league-join?league=${contextId}&ref=${token}`;
        else if (contextType === 'course')  url = `${base}/course-register?courseId=${contextId}&ref=${token}`;
        setShareUrl(url);
        setStep('link');
      } catch {
        if (!cancelled) setStep('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [contextType, contextId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: contextName, text: `Join me at ${contextName}!`, url: shareUrl });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-background w-full max-w-md rounded-t-2xl p-5 pb-10 space-y-4 animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">Invite a Friend</h2>
            <p className="text-xs text-muted-foreground truncate max-w-xs">{contextName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'loading' && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {step === 'disabled' && (
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Player sharing is not enabled</p>
            <p className="text-xs mt-1">The organizer hasn't turned on player sharing for this event.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Could not generate share link. Please try again.</p>
          </div>
        )}

        {(step === 'link' || step === 'qr') && (
          <>
            {/* Toggle between link & QR */}
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              <button
                onClick={() => setStep('link')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${step === 'link' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <Link className="h-3.5 w-3.5" /> Share Link
              </button>
              <button
                onClick={() => setStep('qr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${step === 'qr' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <QrCode className="h-3.5 w-3.5" /> QR Code
              </button>
            </div>

            {step === 'link' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
                  <p className="flex-1 text-xs text-muted-foreground truncate font-mono">{shareUrl}</p>
                </div>
                <Button onClick={handleCopy} variant="outline" className="w-full gap-2">
                  {copied ? <><Check className="h-4 w-4 text-green-600" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
                </Button>
                <Button onClick={handleNativeShare} className="w-full gap-2">
                  <Share2 className="h-4 w-4" /> Share…
                </Button>
              </div>
            )}

            {step === 'qr' && (
              <div className="flex flex-col items-center py-2 space-y-4">
                <QRCodeDisplay url={shareUrl} />
                <Button onClick={handleCopy} variant="outline" className="w-full gap-2">
                  {copied ? <><Check className="h-4 w-4 text-green-600" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link Instead</>}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}