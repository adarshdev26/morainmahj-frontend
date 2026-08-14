import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Share2 } from 'lucide-react';

/**
 * Reusable admin toggle for player-to-player sharing.
 * Props:
 *   enabled: boolean
 *   onChange: (val: boolean) => void
 *   saving?: boolean
 */
export default function PlayerSharingToggle({ enabled, onChange, saving }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t border-border mt-4">
      <div className="flex items-start gap-3">
        <Share2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Player sharing</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Allow confirmed players to share an invite link or QR code with friends to join this event.
          </p>
        </div>
      </div>
      <Switch
        checked={!!enabled}
        onCheckedChange={onChange}
        disabled={saving}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}