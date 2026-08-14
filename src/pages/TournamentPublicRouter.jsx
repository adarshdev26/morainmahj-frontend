import React from 'react';
import { useParams } from 'react-router-dom';
import TournamentLanding from './TournamentLanding';
import TournamentWebsite from './TournamentWebsite';

export default function TournamentPublicRouter() {
  const { id } = useParams();
  const isObjectId = /^[0-9a-f]{24}$/i.test(id || '');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');

  if (isObjectId || isUuid) {
    return <TournamentLanding />;
  }
  return <TournamentWebsite slug={id} />;
}