import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, RefreshCw, Copy, Share2, Check, Users, MapPin, Calendar } from 'lucide-react';

export default function PublicLeagueLeaderboard() {
  const { slug } = useParams();
  const [copied, setCopied] = useState(false);

  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['public-league-leaderboard', slug],
    queryFn: async () => {
      return callAction('getPublicLeagueLeaderboard', { slug });
    },
    enabled: !!slug,
    refetchInterval: 15000,
  });

  const league = data?.league;
  const season = data?.seasonStandings ?? [];
  const current = data?.currentSession;
  const currentStandings = data?.currentStandings ?? [];
  const mode = data?.mode || 'attendance';
  const memberCount = data?.memberCount ?? 0;
  const brand = league?.website_primary_color || '#6D28D9';

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString()
    : dataUpdatedAt
      ? new Date(dataUpdatedAt).toLocaleTimeString()
      : null;

  const shareUrl = `${window.location.origin}/league/${slug}/leaderboard`;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const share = async () => {
    try { await navigator.share({ title: league?.name || 'League Leaderboard', url: shareUrl }); } catch {}
  };

  const fmtPts = (n) => (n > 0 ? `+${n}` : String(n));

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (data?.error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Not Available</h1>
        <p className="text-slate-500 text-sm">{data.error}</p>
      </div>
    </div>
  );

  const Row = ({ p, i }) => (
    <div className={`flex items-center gap-3 px-4 py-3 ${i < 3 ? 'bg-amber-50' : ''} border-b last:border-0`}>
      <div className="w-7 text-center font-bold text-slate-400">
        {i < 3 ? <Medal className="h-5 w-5 mx-auto text-amber-500" /> : i + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{p.name}</p>
        {mode === 'points' && <p className="text-xs text-slate-400">{p.tables ?? 0} tables</p>}
      </div>
      <div className="font-bold text-slate-700">{mode === 'points' ? fmtPts(p.points) : p.sessions}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" style={{ '--brand': brand }}>
      {/* Header */}
      <div className="text-white py-8 px-4" style={{ background: brand }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2"><Trophy className="h-7 w-7" /> {league?.name || 'Leaderboard'}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-white/90">
            {league?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {league.location}</span>}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {memberCount} members</span>
            {current && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Session · {current.status}</span>}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={copyLink} className="inline-flex items-center gap-1 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition-colors">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy Link'}
            </button>
            <button onClick={share} className="inline-flex items-center gap-1 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition-colors">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            {lastUpdated && <span className="inline-flex items-center gap-1 text-xs text-white/80 ml-auto"><RefreshCw className="h-3 w-3" /> {lastUpdated}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Current session */}
        {current && currentStandings.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Calendar className="h-5 w-5" style={{ color: brand }} /> Current Session</h2>
            <div className="bg-white border rounded-xl overflow-hidden">
              {currentStandings.map((p, i) => <Row key={p.email || i} p={p} i={i} />)}
            </div>
          </section>
        )}

        {/* Overall standings */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Trophy className="h-5 w-5" style={{ color: brand }} /> Overall Standings</h2>
          {season.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-sm">No standings yet.</div>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden">
              {season.map((p, i) => <Row key={p.email || i} p={p} i={i} />)}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2 px-1">
            {mode === 'points' ? 'Ranked by total points (including special hands).' : 'Ranked by sessions attended.'} · Auto-refreshes every 15s.
          </p>
        </section>
      </div>
    </div>
  );
}