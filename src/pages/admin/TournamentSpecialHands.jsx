import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tournaments as tournamentsApi } from '@/services/resources';
import PageHeader from '@/components/shared/PageHeader';
import BackButton from '@/components/shared/BackButton';
import SpecialHandsCardManager from '@/components/admin/SpecialHandsCardManager';

/**
 * Admin page for managing card-system special hands for a tournament.
 * Route: /admin/tournament/:id/card-special-hands
 */
export default function TournamentSpecialHands() {
  const { id } = useParams();
  const { data: tournament } = useQuery({
    queryKey: ['tournament-for-special-hands', id],
    queryFn: () => tournamentsApi.get(id),
    enabled: !!id,
  });

  return (
    <div>
      <PageHeader
        title="Tournament Special Hands"
        subtitle={tournament?.name ? `Custom hands for ${tournament.name}` : ''}
        actions={<BackButton fallbackPath={`/admin/tournament/${id}`} />}
      />
      <div className="p-4 lg:p-6 max-w-4xl">
        <SpecialHandsCardManager contextType="tournament" contextId={id} contextName={tournament?.name} />
      </div>
    </div>
  );
}