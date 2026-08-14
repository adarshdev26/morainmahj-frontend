import React, { useState } from 'react';
import { Copy, Check, Download, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isCapacitorNative } from '@/lib/capacitor-utils';

const SHARE_BASE_URL = 'https://morainmahj.com';

export default function BeautifulQRCard({ path, label }) {
  const [copied, setCopied] = useState(false);
  const url = `${SHARE_BASE_URL}${path}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    try {
      if (isCapacitorNative()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: label, url, dialogTitle: `Share ${label}` });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: label, url });
        return;
      }
    } catch (e) {
      // User cancelled or share failed — fall through to copy
    }
    copyUrl();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg">
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/20 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative flex flex-col items-center gap-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Morain Mahj</span>
        </div>

        {/* QR Code */}
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-accent/30 blur-md" />
          <div className="relative w-44 h-44 bg-white rounded-xl p-3 shadow-md">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
              alt={`QR code for ${label}`}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Label */}
        <div className="text-center">
          <h4 className="font-heading text-lg font-bold">{label}</h4>
          <p className="text-xs text-primary-foreground/70 font-mono break-all">{url}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full">
          <Button size="sm" variant="secondary" className="flex-1 bg-white/15 text-primary-foreground hover:bg-white/25 border-0" onClick={copyUrl}>
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </Button>
          <Button size="sm" variant="secondary" className="flex-1 bg-white/15 text-primary-foreground hover:bg-white/25 border-0" onClick={share}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button size="sm" variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0" asChild>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`} download={`${label}-qr.png`}>
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}