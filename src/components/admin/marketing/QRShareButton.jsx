import React, { useState } from 'react';
import { QrCode, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SHARE_BASE_URL = 'https://morainmahj.com';

export default function QRShareButton({ path, label }) {
  const [copied, setCopied] = useState(false);
  const url = `${SHARE_BASE_URL}${path}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5">
      <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border border-border p-3">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
          alt={`QR code for ${label}`}
          className="w-full h-full"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground font-mono break-all">{url}</p>
      </div>
      <div className="flex gap-2 w-full">
        <Button size="sm" variant="outline" className="flex-1" onClick={copyUrl}>
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`} download={`${label}-qr.png`}>
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}