import React from 'react';

export default function PublicLeagueNavbar({ league, organization }) {
  const orgName = league.name || organization?.name || 'League';
  const logoUrl = organization?.logo_url || league.logo_url;
  const website = organization?.website || league.website_social_links?.website;

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl && <img src={logoUrl} alt={orgName} className="h-8 w-8 rounded object-cover shrink-0" />}
          <span className="font-bold text-sm uppercase tracking-wide text-slate-800 truncate">{orgName}</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          {website && <a href={website} target="_blank" rel="noreferrer" className="hover:text-slate-900">Home</a>}
          <a href="#overview" className="hover:text-slate-900">About</a>
          <a href="#schedule" className="hover:text-slate-900">Schedule</a>
          <a href="#standings" className="hover:text-slate-900">Standings</a>
          <a href="#location" className="hover:text-slate-900">Location</a>
        </nav>
        <a
          href={`/league-join?league=${league.id}`}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          Register Now
        </a>
      </div>
    </header>
  );
}