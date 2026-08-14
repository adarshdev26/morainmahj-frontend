import React, { useState } from 'react';
import { Zap, ChevronRight, X } from 'lucide-react';

const MILESTONES = [
  {
    id: 1, label: 'Setup', emoji: '⚙️',
    color: '#8B5CF6', bg: '#EDE9FE', phase: 'Phase 1', title: 'Tournament Setup',
    description: 'Director creates the tournament with all configuration.',
    details: [
      'Set name, date, location, and player cap',
      'Configure flights and rules variant (NMJL, NMJL T/L, Custom)',
      'Choose payment model (free or paid via Stripe)',
      'Enable/disable raffle, silent auction, borrowed sets',
      'Set registration window open/close dates',
      'All settings fully customizable by the director at any time',
    ],
    automation: null,
  },
  {
    id: 2, label: 'Invites Sent', emoji: '📬',
    color: '#3B82F6', bg: '#DBEAFE', phase: 'Phase 2', title: 'Invitations Sent',
    description: 'Players receive personalized email invites with registration links.',
    details: [
      'Email includes event details, date, location, and parking info',
      'Personalized QR code embedded in email for instant venue check-in',
      'Reminder emails auto-sent 24h before tournament',
      'Bulk communication tools available for last-minute updates',
      'Email subject, body, and timing fully customizable by the director',
    ],
    automation: 'autoSendLeagueInvites fires on schedule — no manual email required',
  },
  {
    id: 3, label: 'Registration', emoji: '📝',
    color: '#06B6D4', bg: '#CFFAFE', phase: 'Phase 3', title: 'Player Registration',
    description: 'Players self-register and pay entry fees online.',
    details: [
      'Players fill in name, phone, city/state, and optional photo',
      'Entry fee collected via Stripe Checkout (if enabled)',
      'Auto-confirmation email sent on successful registration',
      'Director can confirm, waitlist, or cancel any registration',
      'Volunteer game set option during registration',
    ],
    automation: 'onRegistrationConfirmed → email notification fired automatically',
  },
  {
    id: 4, label: 'Waitlist', emoji: '⏳',
    color: '#F59E0B', bg: '#FEF3C7', phase: 'Phase 3b', title: 'Waitlist Management',
    description: 'If a confirmed player cancels, the next waitlisted player is auto-promoted.',
    details: [
      'Waitlist ordered by registration timestamp',
      'Auto-promotion fires immediately when a spot opens',
      'Promoted player receives push notification + email',
      'Director can manually reorder or override waitlist',
    ],
    automation: 'promoteFromWaitlist function triggers on cancellation — zero manual steps',
  },
  {
    id: 5, label: 'Check-In', emoji: '✅',
    color: '#10B981', bg: '#D1FAE5', phase: 'Phase 4', title: 'Venue Check-In',
    description: 'Players scan their QR code or self-check-in on the day.',
    details: [
      'Players scan QR code from confirmation email at the door',
      'Self-check-in kiosk mode available on any tablet',
      'Director sees live check-in count in admin dashboard',
      'Borrowed set volunteers automatically flagged at check-in',
    ],
    automation: 'qrCheckIn function validates token and marks registration checked_in',
  },
  {
    id: 6, label: 'Table Assign', emoji: '🪑',
    color: '#6366F1', bg: '#E0E7FF', phase: 'Phase 5', title: 'Table Assignments',
    description: 'All 4 rounds generated at once, considering history and wind balance.',
    details: [
      'Auto-generate all rounds in seconds with dedup algorithm',
      'Considers full player history — no two players paired twice in a season',
      'Balances East/South/West/North wind assignments across season',
      'Director can manually tweak any seat before publishing',
      'Assignments published and push-notified to all players at once',
    ],
    automation: 'onTableAssigned fires per player — personalized "Table 3, East seat" push',
  },
  {
    id: 7, label: 'Score Entry', emoji: '🀄',
    color: '#EC4899', bg: '#FCE7F3', phase: 'Phase 6', title: 'Score Entry',
    description: 'Players enter scores per set from their own device.',
    details: [
      'Players enter scores for all 4 seats after each set',
      'Numeric keypad optimized for mobile score entry',
      'Per-set submission with timestamp recorded individually',
      'East player verifies all 4 sets before they lock permanently',
      'Atomic lock — once verified, scores are immutable',
    ],
    automation: 'notifyScoreVerified → director gets email when each scorecard is locked',
  },
  {
    id: 8, label: 'Leaderboard', emoji: '📊',
    color: '#14B8A6', bg: '#CCFBF1', phase: 'Phase 6b', title: 'Live Leaderboard',
    description: 'Standings update in real-time as scores are verified throughout the day.',
    details: [
      'Leaderboard updates every 5 seconds via React Query polling',
      'Players see live standings on their own device during play',
      'Public leaderboard URL available to share at venue',
      'Admin leaderboard shows full scorecard completion percentage',
    ],
    automation: null,
  },
  {
    id: 9, label: 'Raffles', emoji: '🎰',
    color: '#F97316', bg: '#FFEDD5', phase: 'Phase 7', title: 'Raffles & Auctions',
    description: 'Fundraising runs concurrently — 4 raffle types and silent auction.',
    details: [
      '4 types: General raffle, 50/50 split, T-raffle (item allocation), Custom',
      'Players buy tickets from their phone during the tournament',
      'Admin draws winner from full-screen raffle display at venue',
      'Animated draw with suspense spin — confetti on winner reveal',
      'Silent auction: live bid tracking with countdown timer',
    ],
    automation: 'drawRaffle → push notification fires to winner if not required present',
  },
  {
    id: 10, label: 'Prizes', emoji: '🏆',
    color: '#EF4444', bg: '#FEE2E2', phase: 'Phase 8', title: 'Prize Payout',
    description: 'Final leaderboard locks; prizes assigned and winners notified.',
    details: [
      'Tournament marked "completed" — final standings locked',
      'Director assigns prize amounts per placement',
      'Admin marks each prize as paid out',
      'notifyPrizePayOut sends email to each winner',
      'Players see their prize earnings in the app',
    ],
    automation: 'notifyTournamentWin + notifyPrizePayOut fire on completion',
  },
  {
    id: 11, label: 'Community', emoji: '💬',
    color: '#7C3AED', bg: '#EDE9FE', phase: 'Phase 9', title: 'Post-Tournament Community',
    description: 'Players connect, post photos, and celebrate on the community board.',
    details: [
      'Built-in social board — no need for external Facebook/Discord',
      'Players post photos, comments, and reactions',
      'Admins can pin announcements and moderate content',
      'Community rules and conduct gate built-in',
      'Posts tied to the specific tournament for organized history',
    ],
    automation: 'notifyLeagueBoardPost → push to all members when pinned post added',
  },
];

const CX = 50;
const CY = 50;
const RADIUS = 36;

function getPosition(index, total) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle),
    angle,
  };
}

export default function TournamentWorkflowChart() {
  const [selected, setSelected] = useState(null);
  const total = MILESTONES.length;
  const selectedMilestone = MILESTONES.find(m => m.id === selected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white font-heading mb-2">
          Tournament Lifecycle
        </h1>
        <p className="text-slate-400 text-sm md:text-base">
          Click any milestone to explore that phase in detail
        </p>
      </div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8">

        {/* ── SVG wheel — everything inside SVG coordinates ── */}
        <div className="w-full max-w-[560px] mx-auto lg:mx-0 shrink-0">
          <svg
            viewBox="-20 -22 140 144"
            className="w-full h-auto"
            style={{ display: 'block' }}
          >
            {/* Glow definitions */}
            <defs>
              {MILESTONES.map(m => (
                <filter key={m.id} id={`glow-${m.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {/* Dashed guide circle */}
            <circle cx={CX} cy={CY} r={RADIUS}
              fill="none" stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.4" strokeDasharray="1.2 1.2"
            />

            {/* Arrows between milestones */}
            {MILESTONES.map((m, i) => {
              const from = getPosition(i, total);
              const to = getPosition((i + 1) % total, total);
              const nodeR = 5.5;

              // Trim line endpoints to edge of circle nodes
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const ux = dx / len;
              const uy = dy / len;
              const sx = from.x + ux * nodeR;
              const sy = from.y + uy * nodeR;
              const ex = to.x - ux * (nodeR + 1.2);
              const ey = to.y - uy * (nodeR + 1.2);

              // Gentle outward curve
              const midX = (sx + ex) / 2;
              const midY = (sy + ey) / 2;
              const ddx = midX - CX;
              const ddy = midY - CY;
              const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
              const qx = midX + (ddx / ddist) * 3;
              const qy = midY + (ddy / ddist) * 3;

              // Arrow head
              const arrowAngle = Math.atan2(ey - qy, ex - qx);
              const aw = 1.0;
              const al = 1.8;
              const apx = ex - al * Math.cos(arrowAngle);
              const apy = ey - al * Math.sin(arrowAngle);

              return (
                <g key={`arr-${i}`}>
                  <path
                    d={`M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`}
                    fill="none" stroke={m.color} strokeWidth="0.6" opacity="0.6"
                  />
                  <polygon
                    points={`${ex},${ey} ${apx + aw * Math.cos(arrowAngle - Math.PI / 2)},${apy + aw * Math.sin(arrowAngle - Math.PI / 2)} ${apx + aw * Math.cos(arrowAngle + Math.PI / 2)},${apy + aw * Math.sin(arrowAngle + Math.PI / 2)}`}
                    fill={m.color} opacity="0.75"
                  />
                </g>
              );
            })}

            {/* Centre logo — Morain Mahj "M" monogram */}
            <g transform={`translate(${CX - 10}, ${CY - 12})`}>
              {/* Outer diamond */}
              <rect x="10" y="0.5" width="18" height="18" transform="rotate(45 10 0.5)"
                stroke="white" strokeWidth="0.5" fill="none" opacity="0.9" />
              {/* Inner diamond */}
              <rect x="10" y="3.5" width="14" height="14" transform="rotate(45 10 3.5)"
                stroke="white" strokeWidth="0.25" fill="none" opacity="0.6" />
              {/* M letter */}
              <text x="10" y="14" textAnchor="middle" dominantBaseline="middle"
                fontFamily="'Cormorant Garamond', serif" fontWeight="300" fontSize="13"
                fill="white" opacity="0.95">M</text>
            </g>

            {/* Milestone nodes */}
            {MILESTONES.map((m, i) => {
              const { x, y, angle } = getPosition(i, total);
              const isActive = selected === m.id;
              const nodeR = 5.5;
              const labelR = RADIUS + 12;
              const lx = CX + labelR * Math.cos(angle);
              const ly = CY + labelR * Math.sin(angle);

              // Anchor text based on position
              let anchor = 'middle';
              if (lx < CX - 5) anchor = 'end';
              else if (lx > CX + 5) anchor = 'start';

              return (
                <g
                  key={m.id}
                  onClick={() => setSelected(isActive ? null : m.id)}
                  style={{ cursor: 'pointer' }}
                  filter={isActive ? `url(#glow-${m.id})` : undefined}
                >
                  {/* Outer ring when active */}
                  {isActive && (
                    <circle cx={x} cy={y} r={nodeR + 1.5}
                      fill="none" stroke={m.color} strokeWidth="0.7" opacity="0.5"
                    />
                  )}
                  {/* Node circle */}
                  <circle cx={x} cy={y} r={nodeR}
                    fill={isActive ? m.color : m.bg}
                    stroke={m.color} strokeWidth={isActive ? "0" : "0.8"}
                  />
                  {/* Emoji text */}
                  <text x={x} y={y + 2.2} textAnchor="middle" fontSize="5.5">{m.emoji}</text>

                  {/* Label */}
                  <text x={lx} y={ly + 1.5}
                    textAnchor={anchor}
                    fontSize="3.2"
                    fill={isActive ? m.color : 'rgba(255,255,255,0.75)'}
                    fontWeight={isActive ? 'bold' : 'normal'}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Detail panel ── */}
        <div className="w-full lg:flex-1">
          {selectedMilestone ? (
            <div
              className="rounded-2xl p-5 border relative"
              style={{
                background: `${selectedMilestone.color}18`,
                borderColor: `${selectedMilestone.color}50`,
              }}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: selectedMilestone.bg }}>
                  {selectedMilestone.emoji}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: selectedMilestone.color }}>
                    {selectedMilestone.phase}
                  </p>
                  <h2 className="text-white font-bold text-lg leading-tight">{selectedMilestone.title}</h2>
                </div>
              </div>

              <p className="text-slate-300 text-sm mb-4 leading-relaxed">{selectedMilestone.description}</p>

              <ul className="space-y-2 mb-4">
                {selectedMilestone.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: selectedMilestone.color }} />
                    {d}
                  </li>
                ))}
              </ul>

              {selectedMilestone.automation && (
                <div className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: `${selectedMilestone.color}25`, border: `1px solid ${selectedMilestone.color}40` }}>
                  <Zap className="h-4 w-4 shrink-0 mt-0.5" style={{ color: selectedMilestone.color }} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: selectedMilestone.color }}>Automation</p>
                    <p className="text-xs text-slate-200 leading-relaxed">{selectedMilestone.automation}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="text-5xl mb-3">👆</div>
              <p className="text-white font-semibold text-lg mb-2">Select a milestone</p>
              <p className="text-slate-400 text-sm mb-5">Click any node on the lifecycle wheel to see what happens at that phase, what players experience, and which automations fire.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {MILESTONES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105"
                    style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}60` }}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-3 justify-center max-w-2xl">
        {[
          { color: '#8B5CF6', label: 'Setup & Config' },
          { color: '#3B82F6', label: 'Communication' },
          { color: '#10B981', label: 'Check-In & Verify' },
          { color: '#F59E0B', label: 'Management' },
          { color: '#EC4899', label: 'Scoring' },
          { color: '#EF4444', label: 'Prizes & Close' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}