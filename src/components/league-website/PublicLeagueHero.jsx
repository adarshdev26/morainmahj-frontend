import React from 'react';
import { Calendar, MapPin, Users, DollarSign, Trophy, Layers } from 'lucide-react';
import { getBannerTheme } from '@/lib/banner-themes';

function formatDateRange(start, end) {
  if (!start) return 'TBD';
  const s = new Date(start + 'T12:00:00');
  if (!end || start === end) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const e = new Date(end + 'T12:00:00');
  if (s.getMonth() === e.getMonth()) return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const RULES_LABELS = { nmjl: 'NMJL', nmjl_tl: 'NMJL TL', nmjl_custom: 'Custom' };

export default function PublicLeagueHero({ league, organization, memberCount }) {
  const themeId = league.banner_theme || 'luxury_gold';
  const theme = getBannerTheme(themeId);
  const isCustom = themeId === 'custom' && league.banner_custom_url;
  const bgImage = isCustom ? league.banner_custom_url : theme.imageUrl;
  const isLight = theme.id === 'minimal_clean';

  const stats = [
    { icon: Calendar, label: 'Season', value: formatDateRange(league.season_start, league.season_end) },
    { icon: MapPin, label: 'Location', value: league.location || 'TBD' },
    { icon: Users, label: 'Members', value: `${memberCount || 0}${league.member_cap ? '/' + league.member_cap : ''}` },
    ...(league.payment_model === 'paid' ? [{ icon: DollarSign, label: 'Fee', value: `$${(league.membership_fee / 100).toFixed(2).replace(/\.00$/, '')}` }] : []),
    { icon: Layers, label: 'Rounds', value: league.num_rounds || 4 },
    { icon: Trophy, label: 'Rules', value: RULES_LABELS[league.rules_variant] || 'NMJL' },
  ];

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl mx-auto max-w-6xl my-6"
      style={{
        minHeight: '440px',
        backgroundColor: isLight ? '#F7F2ED' : '#181818',
      }}
    >
      {/* ── Full-box background image (right-aligned, cover) ── */}
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full z-0"
          style={{ objectFit: 'cover', objectPosition: 'right center' }}
        />
      )}

      {/* ── Gradient overlay across the entire box for text readability ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: isLight
            ? 'linear-gradient(to right, rgba(247,242,237,0.95) 0%, rgba(247,242,237,0.8) 40%, rgba(247,242,237,0.1) 70%, rgba(247,242,237,0) 100%)'
            : 'linear-gradient(to right, rgba(24,24,24,0.95) 0%, rgba(24,24,24,0.8) 40%, rgba(24,24,24,0.1) 70%, rgba(24,24,24,0) 100%)',
        }}
      />

      {/* ── Text content (left 45%) ── */}
      <div className="relative z-20 max-w-6xl mx-auto w-full h-full flex items-center" style={{ minHeight: '440px' }}>
        <div className="w-full md:w-[45%] px-6 py-12 md:py-14 md:px-10" style={{ color: theme.textColor }}>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4"
            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
          >
            League
          </span>

          <div className="flex items-center gap-3 mb-3">
            {(league.logo_url || organization?.logo_url) && (
              <img
                src={league.logo_url || organization?.logo_url}
                alt={`${league.name} logo`}
                className="h-14 w-14 md:h-16 md:w-16 rounded-xl object-cover ring-2 flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.accentColor + '40' }}
              />
            )}
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{league.name}</h1>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <s.icon className="h-4 w-4 shrink-0" style={{ color: theme.textMuted }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: theme.textMuted }}>{s.label}</p>
                  <p className="text-sm font-semibold leading-tight">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            <a
              href={`/league-join?league=${league.id}`}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}
            >
              Register Now
            </a>
            <a
              href="#schedule"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold border-2 transition-colors hover:bg-black/10"
              style={{ borderColor: theme.secondaryButtonBorder, color: theme.secondaryButtonText }}
            >
              View Schedule
            </a>
          </div>

          <p className="text-xs" style={{ color: theme.textMuted }}>
            Powered by <a href="https://morainmahj.com" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: theme.textColor }}>Morain Mahj</a>
          </p>
        </div>
      </div>
    </section>
  );
}