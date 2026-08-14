import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import PublicLeagueNavbar from '@/components/league-website/PublicLeagueNavbar';
import PublicLeagueHero from '@/components/league-website/PublicLeagueHero';
import PublicLeagueSchedule from '@/components/league-website/PublicLeagueSchedule';
import PublicLeagueSidebar from '@/components/league-website/PublicLeagueSidebar';
import PublicLeagueFooter from '@/components/league-website/PublicLeagueFooter';
import PublicEventSections from '@/components/website/PublicEventSections';
import { Check, MapPin, Trophy } from 'lucide-react';

export default function LeagueWebsite() {
  const { slug } = useParams();
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === 'true';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const d = await callAction('getPublicLeagueWebsite', { slug, preview: isPreview });
        if (d.error) { setError(d.error); return; }
        setData(d);
      } catch (err) {
        setError(err?.response?.data?.error || err?.data?.error || 'Failed to load league website.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, isPreview]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Page Not Available</h1>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  const { league, organization, sessions, leaderboard, memberCount } = data;
  const leaderboardMode = data.leaderboardMode || 'attendance';
  const brandColor = league.website_primary_color || organization?.primary_color || '#6D28D9';
  const publicUrl = `${window.location.origin}/league/${league.website_slug}`;
  const highlights = league.website_highlights || [];
  const sponsors = league.website_sponsors || [];
  const galleryImages = league.website_gallery_images || [];
  const documents = (league.website_documents || []).filter(d => d.file_url);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: 'Schedule' },
    ...(galleryImages.length > 0 ? [{ id: 'gallery', label: 'Gallery' }] : []),
    ...(leaderboard.length > 0 ? [{ id: 'standings', label: 'Standings' }] : []),
    { id: 'location', label: 'Location' },
    ...(sponsors.length > 0 ? [{ id: 'sponsors', label: 'Sponsors' }] : []),
    ...(documents.length > 0 ? [{ id: 'documents', label: 'Documents' }] : []),
  ];

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-50" style={{ '--brand': brandColor }}>
      {isPreview && (
        <div className="bg-amber-100 text-amber-800 text-center py-2 text-sm font-medium">
          Draft Preview — This website is not publicly visible yet.
        </div>
      )}
      <PublicLeagueNavbar league={league} organization={organization} />
      <PublicLeagueHero league={league} organization={organization} memberCount={memberCount} />

      <div className="max-w-6xl mx-auto px-4 mt-2">
        <nav className="sticky top-0 z-30 bg-white border rounded-xl px-6 flex gap-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => scrollTo(tab.id)} className="py-3 text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap border-b-2 border-transparent hover:border-slate-300 transition-colors">
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section id="overview">
            <h2 className="text-2xl font-bold mb-3">About the Event</h2>
            <p className="text-slate-600 leading-relaxed">{league.website_description || league.description || 'Welcome to our league!'}</p>
            {highlights.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-3">Event Highlights</h3>
                <ul className="space-y-2">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
                      <span className="text-slate-600">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <PublicEventSections entity={league} />

          {sponsors.length > 0 && (
            <section id="sponsors">
              <h2 className="text-2xl font-bold mb-3">Sponsors</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sponsors.map((s, i) => (
                  <div key={i} className="bg-white border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-12 object-contain mb-2" />}
                    <p className="text-sm font-medium text-slate-600">{s.name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <PublicLeagueSchedule sessions={sessions} />

          {leaderboard.length > 0 && (
            <section id="standings">
              <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Trophy className="h-6 w-6" style={{ color: 'var(--brand)' }} /> Standings</h2>
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Rank</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Player</th>
                      {leaderboardMode === 'points' && (
                        <th className="text-right px-4 py-2 font-semibold text-slate-500">Tables</th>
                      )}
                      <th className="text-right px-4 py-2 font-semibold text-slate-500">{leaderboardMode === 'points' ? 'Points' : 'Sessions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-bold text-slate-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-700">{p.name}</td>
                        {leaderboardMode === 'points' && (
                          <td className="px-4 py-2 text-right text-slate-500">{p.tables ?? 0}</td>
                        )}
                        <td className="px-4 py-2 text-right font-semibold text-slate-600">
                          {leaderboardMode === 'points' ? p.points : p.sessions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2 px-1">
                {leaderboardMode === 'points'
                  ? 'Ranked by total points across all sessions.'
                  : 'Ranked by sessions attended.'}
              </p>
              <a href={`/league/${league.website_slug}/leaderboard`} className="inline-flex items-center gap-1 text-sm font-medium mt-3 hover:underline" style={{ color: 'var(--brand)' }}>
                <Trophy className="h-4 w-4" /> View Full Leaderboard →
              </a>
            </section>
          )}

          <section id="location">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><MapPin className="h-6 w-6" style={{ color: 'var(--brand)' }} /> Location</h2>
            <div className="bg-white border rounded-xl p-5">
              <p className="text-slate-600">{league.location || 'Location TBD'}</p>
              {league.location && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(league.location)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium mt-3 hover:underline" style={{ color: 'var(--brand)' }}>
                  View on Map →
                </a>
              )}
            </div>
          </section>
        </div>

        <PublicLeagueSidebar league={league} organization={organization} memberCount={memberCount} leaderboard={leaderboard} publicUrl={publicUrl} />
      </main>

      <PublicLeagueFooter organization={organization} eventSocial={league.website_social_links} />
    </div>
  );
}