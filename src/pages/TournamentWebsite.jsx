import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import PublicTournamentHero from '@/components/tournament-website/PublicTournamentHero';
import PublicLeagueFooter from '@/components/league-website/PublicLeagueFooter';
import PublicEventSections from '@/components/website/PublicEventSections';
import { Check, MapPin, Trophy, Users, Share2, Mail, Link2, Calendar, DollarSign, Layers, Clock } from 'lucide-react';

export default function TournamentWebsite({ slug: slugProp }) {
  const { slug: slugParam } = useParams();
  const slug = slugProp || slugParam;
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === 'true';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const d = await callAction('getPublicTournamentWebsite', { slug, preview: isPreview });
        if (d.error) { setError(d.error); return; }
        setData(d);
      } catch (err) {
        setError(err?.response?.data?.error || err?.data?.error || 'Failed to load tournament website.');
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

  const { tournament, organization, confirmedCount, leaderboard } = data;
  const brandColor = tournament.website_primary_color || organization?.primary_color || '#6D28D9';
  const publicUrl = `${window.location.origin}/tournament/${tournament.website_slug}`;
  const highlights = tournament.website_highlights || [];
  const sponsors = tournament.website_sponsors || [];
  const galleryImages = tournament.website_gallery_images || [];
  const documents = (tournament.website_documents || []).filter(d => d.file_url);

  const quickInfo = [
    { icon: Calendar, label: 'Date', value: tournament.date || 'TBD' },
    { icon: MapPin, label: 'Location', value: tournament.location || 'TBD' },
    ...(tournament.payment_model !== 'none' && tournament.entry_fee ? [{ icon: DollarSign, label: 'Entry Fee', value: `$${(tournament.entry_fee / 100).toFixed(2)}` }] : []),
    { icon: Layers, label: 'Rounds', value: tournament.num_rounds || 4 },
    { icon: Users, label: 'Player Cap', value: tournament.player_cap || 'Open' },
  ];

  const shareUrl = encodeURIComponent(publicUrl);
  const shareText = encodeURIComponent(`Check out ${tournament.name}!`);

  const tabs = [
    { id: 'overview', label: 'Overview' },
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

      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {(organization?.logo_url || tournament.logo_url) && <img src={organization?.logo_url || tournament.logo_url} alt={tournament.name} className="h-8 w-8 rounded object-cover shrink-0" />}
            <span className="font-bold text-sm uppercase tracking-wide text-slate-800 truncate">{tournament.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#overview" className="hover:text-slate-900">About</a>
            {leaderboard.length > 0 && <a href="#standings" className="hover:text-slate-900">Standings</a>}
            <a href="#location" className="hover:text-slate-900">Location</a>
          </nav>
          <a href={`/player-signup?tournament=${tournament.id}`} className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0" style={{ backgroundColor: 'var(--brand)' }}>
            Register Now
          </a>
        </div>
      </header>

      <PublicTournamentHero tournament={tournament} organization={organization} confirmedCount={confirmedCount} />

      <nav className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex gap-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => scrollTo(tab.id)} className="py-3 text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap border-b-2 border-transparent hover:border-slate-300 transition-colors">
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section id="overview">
            <h2 className="text-2xl font-bold mb-3">About the Tournament</h2>
            <p className="text-slate-600 leading-relaxed">{tournament.website_description || tournament.description || 'Welcome to our tournament!'}</p>
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

          <PublicEventSections entity={tournament} />

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

          {leaderboard.length > 0 && (
            <section id="standings">
              <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Trophy className="h-6 w-6" style={{ color: 'var(--brand)' }} /> Standings</h2>
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Rank</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Player</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-500">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-bold text-slate-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-700">{p.name}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-600">{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section id="location">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><MapPin className="h-6 w-6" style={{ color: 'var(--brand)' }} /> Location</h2>
            <div className="bg-white border rounded-xl p-5">
              <p className="text-slate-600">{tournament.location || 'Location TBD'}</p>
              {tournament.location && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(tournament.location)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium mt-3 hover:underline" style={{ color: 'var(--brand)' }}>
                  View on Map →
                </a>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500 mb-3">Tournament Quick Info</h3>
            <div className="space-y-3">
              {quickInfo.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm font-medium text-slate-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500 mb-3">Share Event</h3>
            <div className="flex gap-2">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Share2 className="h-4 w-4 text-slate-600" /></a>
              <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Share2 className="h-4 w-4 text-slate-600" /></a>
              <a href={`mailto:?subject=${shareText}&body=${shareUrl}`} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Mail className="h-4 w-4 text-slate-600" /></a>
              <button onClick={() => navigator.clipboard.writeText(publicUrl)} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Link2 className="h-4 w-4 text-slate-600" /></button>
            </div>
          </div>
          {leaderboard.length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2"><Trophy className="h-4 w-4" /> Live Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                      <span className="font-medium text-slate-700">{p.name}</span>
                    </div>
                    <span className="font-semibold text-slate-600">{p.total}</span>
                  </div>
                ))}
              </div>
              <a href="#standings" className="block text-center text-xs font-medium mt-3 hover:underline" style={{ color: 'var(--brand)' }}>View Full Standings →</a>
            </div>
          )}
        </aside>
      </main>

      <PublicLeagueFooter organization={organization} eventSocial={tournament.website_social_links} />
    </div>
  );
}