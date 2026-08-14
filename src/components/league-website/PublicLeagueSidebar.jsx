import React from 'react';
import { Calendar, MapPin, DollarSign, Layers, Users, Clock, Facebook, Twitter, Mail, Link2, Trophy } from 'lucide-react';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PublicLeagueSidebar({ league, organization, memberCount, leaderboard, publicUrl }) {
  const quickInfo = [
    { icon: Calendar, label: 'Season', value: [league.season_start, league.season_end].filter(Boolean).join(' – ') || 'TBD' },
    { icon: MapPin, label: 'Location', value: league.location || 'TBD' },
    ...(league.payment_model === 'paid' ? [{ icon: DollarSign, label: 'Entry Fee', value: `$${(league.membership_fee / 100).toFixed(2).replace(/\.00$/, '')}` }] : []),
    { icon: Layers, label: 'Rounds', value: league.num_rounds || 4 },
    { icon: Users, label: 'Player Limit', value: league.member_cap || 'Open' },
    ...(league.day_of_week != null ? [{ icon: Clock, label: 'Meets', value: `${DAY_SHORT[league.day_of_week]}s${league.start_time ? ' ' + league.start_time : ''}` }] : []),
  ];

  const shareUrl = encodeURIComponent(publicUrl);
  const shareText = encodeURIComponent(`Check out ${league.name}!`);

  return (
    <aside className="space-y-6">
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500 mb-3">Event Quick Info</h3>
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
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook" className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Facebook className="h-4 w-4 text-slate-600" /></a>
          <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Share on X" className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Twitter className="h-4 w-4 text-slate-600" /></a>
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
                <span className="font-semibold text-slate-600">{p.sessions}</span>
              </div>
            ))}
          </div>
          <a href="#standings" className="block text-center text-xs font-medium mt-3 hover:underline" style={{ color: 'var(--brand)' }}>View Full Standings →</a>
        </div>
      )}
    </aside>
  );
}