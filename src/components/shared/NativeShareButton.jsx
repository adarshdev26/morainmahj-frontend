import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check, Copy } from 'lucide-react';
import { haptics } from '@/lib/haptics';

/**
 * NativeShareButton — uses the Web Share API on iOS/Android (triggers native share sheet),
 * falls back to clipboard copy on desktop.
 */
export default function NativeShareButton({ title, text, url, className = '', label = 'Share' }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleShare = async () => {
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (e) {
        // User cancelled — no-op
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="outline"
      className={className}
      onClick={handleShare}
    >
      {copied
        ? <><Check className="h-4 w-4 mr-2 text-emerald-400" /> Copied!</>
        : navigator.share
          ? <><Share2 className="h-4 w-4 mr-2" /> {label}</>
          : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>
      }
    </Button>
  );
}