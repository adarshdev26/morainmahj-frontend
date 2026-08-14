import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { shareInvites as shareInvitesApi } from '@/services/resources';
import { Share2, Users } from 'lucide-react';

/**
 * Shows admin how many share invites exist + total uses for an event.
 */
export default function ShareInviteStats({ contextType, contextId }) {
  const { data: invites = [] } = useQuery({
    queryKey: ['share-invites', contextType, contextId],
    queryFn: () => shareInvitesApi.filter({ context_type: contextType, context_id: contextId }),
    enabled: !!contextId,
  });

  const totalUses = invites.reduce((sum, i) => sum + (i.times_used || 0), 0);

  if (invites.length === 0) return null;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
      <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {invites.length} share link{invites.length !== 1 ? 's' : ''} created</span>
      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {totalUses} click{totalUses !== 1 ? 's' : ''}</span>
    </div>
  );
}