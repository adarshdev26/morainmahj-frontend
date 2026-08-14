import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, QrCode, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function QRCodeDisplay({ sessionId, leagueId, tournamentId, sessionName, qrSize = 256 }) {
  const { toast } = useToast();

  // Generate unique check-in URL
  const checkInUrl = useMemo(() => {
    const baseUrl = `${window.location.origin}/checkin`;
    const params = new URLSearchParams();
    params.append('sessionId', sessionId);
    if (leagueId) params.append('leagueId', leagueId);
    if (tournamentId) params.append('tournamentId', tournamentId);
    return `${baseUrl}?${params.toString()}`;
  }, [sessionId, leagueId, tournamentId]);

  // Generate QR code URL using qrserver API
  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(checkInUrl)}`;
  }, [checkInUrl, qrSize]);

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `checkin-${sessionId || sessionName || 'qr'}.png`;
    link.click();
    toast({ title: 'QR code downloaded' });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(checkInUrl);
    toast({ title: 'Check-in URL copied to clipboard' });
  };

  const openQR = () => {
    window.open(checkInUrl, '_blank');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            Self Check-In QR Code
          </h3>
          <p className="text-sm text-slate-500 mt-1">Players scan to check in automatically</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
        {/* QR Code */}
        <div className="bg-white p-4 border-2 border-slate-200 rounded-lg shrink-0">
          <img src={qrImageUrl} alt="Check-in QR code" className="w-64 h-64" />
        </div>

        {/* Info & Controls */}
        <div className="flex-1 space-y-4">
          {/* Check-in URL */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Check-In URL</label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={checkInUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono"
              />
              <Button size="sm" variant="outline" onClick={copyUrl} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">How it works:</p>
            <ol className="text-xs text-blue-600 space-y-1 ml-4 list-decimal">
              <li>Display this QR code at the venue entrance or on a screen</li>
              <li>Players scan with their phone camera or QR app</li>
              <li>They enter their email and scan verification button</li>
              <li>Check-in status updates immediately in the database</li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={downloadQR} variant="outline" className="gap-1.5">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button onClick={openQR} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="h-4 w-4" />
              Open Check-In Page
            </Button>
          </div>

          {/* Display info */}
          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>Session:</strong> {sessionName || sessionId}</p>
            <p><strong>Type:</strong> {leagueId ? 'League Session' : 'Tournament'}</p>
            <p><strong>URL expires:</strong> Never (always active for this session)</p>
          </div>
        </div>
      </div>
    </div>
  );
}