import React from 'react';
import { Calendar, MapPin, Users, DollarSign, Layers, Trophy } from 'lucide-react';
import { getBannerTheme } from '@/lib/banner-themes';

function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const RULES_LABELS = { nmjl: 'NMJL', nmjl_tl: 'NMJL TL', nmjl_custom: 'Custom' };

export default function PublicTournamentHero({ tournament, organization, confirmedCount }) {
  const themeId = tournament.banner_theme || 'elegant_classic';
  const theme = getBannerTheme(themeId);
  const isCustom = themeId === 'custom' && tournament.banner_custom_url;

  const stats = [
    { icon: Calendar, label: 'Date', value: formatDate(tournament.date) },
    { icon: MapPin, label: 'Location', value: tournament.location || 'TBD' },
    { icon: Users, label: 'Players', value: `${confirmedCount || 0}${tournament.player_cap ? '/' + tournament.player_cap : ''}` },
    ...(tournament.payment_model !== 'none' && tournament.entry_fee ? [{ icon: DollarSign, label: 'Entry Fee', value: `$${(tournament.entry_fee / 100).toFixed(2)}` }] : []),
    { icon: Layers, label: 'Rounds', value: tournament.num_rounds || 4 },
    { icon: Trophy, label: 'Rules', value: RULES_LABELS[tournament.rules_variant] || 'NMJL' },
  ];

  const sectionStyle = isCustom
    ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.4)), url(${tournament.banner_custom_url})`, backgroundSize: 'cover', backgroundPosition: 'center right', backgroundRepeat: 'no-repeat', minHeight: '420px' }
    : { backgroundImage: `${theme.overlay}, url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center right', backgroundRepeat: 'no-repeat', minHeight: '420px' };

  return (
    <section className="relative overflow-hidden flex items-center" style={sectionStyle}>
      <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20 w-full" style={{ color: theme.textColor }}>
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4"
          style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
        >
          Tournament
        </span>
        <div className="flex items-center gap-4 mb-3">
          {(tournament.logo_url || organization?.logo_url) && (
            <img
              src={tournament.logo_url || organization?.logo_url}
              alt={`${tournament.name} logo`}
              className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover ring-2 flex-shrink-0"
              style={{ backgroundColor: isCustom ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)', borderColor: theme.accentColor + '40' }}
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold">{tournament.name}</h1>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <s.icon className="h-5 w-5" style={{ color: theme.textMuted }} />
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: theme.textMuted }}>{s.label}</p>
                <p className="text-sm font-semibold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/player-signup?tournament=${tournament.id}`}
            className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}
          >
            Register Now
          </a>
          <a
            href="#overview"
            className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold border-2 transition-colors hover:bg-black/10"
            style={{ borderColor: theme.secondaryButtonBorder, color: theme.secondaryButtonText }}
          >
            View Details
          </a>
        </div>
        <p className="mt-6 text-sm" style={{ color: theme.textMuted }}>
          Powered by <a href="https://morainmahj.com" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: theme.textColor }}>Morain Mahj</a>
        </p>
      </div>
    </section>
  );
}