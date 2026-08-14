import React from 'react';
import OrganizerSocialLinks from '@/components/website/OrganizerSocialLinks';

// Shared footer for public tournament/league/course websites.
// Shows the organizer's (Organization) social channels when available,
// falling back to event-level social links.
export default function PublicLeagueFooter({ organization, eventSocial }) {
  const hasSocial = organization?.social_links || eventSocial;
  const orgName = organization?.name;

  return (
    <footer className="bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4 text-center">
        {hasSocial && (
          <OrganizerSocialLinks
            organization={organization}
            eventSocial={eventSocial}
            className="text-slate-300"
          />
        )}
        <p className="text-sm text-slate-400">
          {orgName && <span className="font-medium text-slate-200">{orgName} · </span>}
          Powered by <a href="https://morainmahj.com" target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:underline">Morain Mahj</a>
        </p>
      </div>
    </footer>
  );
}