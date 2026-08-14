import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { leagues as leaguesApi } from '@/services/resources';
import PageHeader from '@/components/shared/PageHeader';
import BackButton from '@/components/shared/BackButton';
import SpecialHandsCardManager from '@/components/admin/SpecialHandsCardManager';

/**
 * Admin page for managing card-system special hands for a league.
 * Route: /admin/leagues/:id/card-special-hands
 */
export default function LeagueSpecialHands() {
  const { id } = useParams();
  const { data: league } = useQuery({
    queryKey: ['league-for-special-hands', id],
    queryFn: () => leaguesApi.get(id),
    enabled: !!id,
  });

  return (
    <div>
      <PageHeader
        title="League Special Hands"
        subtitle={league?.name ? `Custom hands for ${league.name}` : ''}
        actions={<BackButton fallbackPath={`/admin/leagues/${id}`} />}
      />
      <div className="p-4 lg:p-6 max-w-4xl">
        <SpecialHandsCardManager contextType="league" contextId={id} contextName={league?.name} />
      </div>
    </div>
  );
}