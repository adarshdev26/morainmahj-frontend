import React from 'react';
import ScorecardDemo from '@/pages/ScorecardDemo';
import PlayerDemo from '@/pages/PlayerDemo';
import TournamentOverviewDemo from '@/pages/TournamentOverviewDemo';

export default function MobileAppPreview({ demoType }) {
  // Render the actual demo components in a mobile-sized container
  // This shows exactly what the app looks like, not a web iframe
  
  const containerStyle = {
    width: '393px',
    height: '852px',
    overflow: 'hidden',
    position: 'relative'
  };

  return (
    <div style={containerStyle} className="bg-white rounded-[35px] overflow-hidden">
      {demoType === 'scorecard' && <ScorecardDemo />}
      {demoType === 'player' && <PlayerDemo />}
      {demoType === 'tournament' && <TournamentOverviewDemo />}
    </div>
  );
}