import React, { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle2, XCircle, MinusCircle, FileText } from 'lucide-react';


const STATUS = {
  both: { label: 'Both', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-4 w-4 text-blue-500" /> },
  us_only: { label: 'Morain Only ✦', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
  them_only: { label: 'AMR Only', color: 'bg-rose-100 text-rose-800', icon: <XCircle className="h-4 w-4 text-rose-400" /> },
  neither: { label: 'Neither', color: 'bg-gray-100 text-gray-500', icon: <MinusCircle className="h-4 w-4 text-gray-400" /> },
};

const ROWS = [
  // ── SCORE TRACKING ──────────────────────────────────────────────────────────
  { category: 'Score Tracking', feature: 'Input scores from real-life games', status: 'both', morain: 'Full scorecard per player per round, 4 sets', amr: 'Basic score input' },
  { category: 'Score Tracking', feature: 'All players confirm/verify scores', status: 'both', morain: 'East player final verification flow', amr: 'All players confirm before recording' },
  { category: 'Score Tracking', feature: 'Real-time leaderboard updates', status: 'both', morain: 'Live standings during & after tournament', amr: 'Automatic leaderboard updates' },
  { category: 'Score Tracking', feature: 'Match/game history', status: 'both', morain: 'Full scorecard history per tournament', amr: 'Comprehensive match history' },
  { category: 'Score Tracking', feature: 'Special hand tracking (bonus scoring)', status: 'us_only', morain: 'Special hand banner & bonus score entry', amr: 'Not mentioned' },
  { category: 'Score Tracking', feature: 'Score entry by non-East players', status: 'us_only', morain: 'Any seated player can enter scores', amr: 'Not specified' },
  { category: 'Score Tracking', feature: 'Per-set score breakdown (4 sets/round)', status: 'us_only', morain: 'Tracks all 4 sets independently', amr: 'Total score only' },

  // ── GAME FORMATS & RULES ────────────────────────────────────────────────────
  { category: 'Game Formats & Rules', feature: 'NMJL official rules support', status: 'both', morain: 'NMJL standard + T/L variant + custom', amr: 'NMJL rules' },
  { category: 'Game Formats & Rules', feature: 'Tournament format', status: 'both', morain: 'Full tournament management', amr: 'AMR tournament format' },
  { category: 'Game Formats & Rules', feature: 'Casual / friendly games', status: 'them_only', morain: 'Not applicable — director-run events only', amr: 'Casual play for friendly games' },
  { category: 'Game Formats & Rules', feature: 'Flexible / house rules', status: 'them_only', morain: 'Rules description field per event', amr: 'Flexible scoring for all play styles' },
  { category: 'Game Formats & Rules', feature: 'Boutique / specialty tiles toggle', status: 'us_only', morain: 'Per-tournament & per-league setting', amr: 'Not mentioned' },
  { category: 'Game Formats & Rules', feature: 'Rules variant config (NMJL / T-L / custom)', status: 'us_only', morain: 'Admin selects variant per event', amr: 'Not mentioned' },

  // ── TOURNAMENT MANAGEMENT ───────────────────────────────────────────────────
  { category: 'Tournament Management', feature: 'Create & manage tournaments', status: 'both', morain: 'Full setup, flights, rounds, cap, waitlist', amr: 'Create and manage events' },
  { category: 'Tournament Management', feature: 'Player registration & invitation', status: 'both', morain: 'Invite waves, bulk email, self-register', amr: 'Easy event registration' },
  { category: 'Tournament Management', feature: 'Waitlist management', status: 'us_only', morain: 'Auto-promote, manual reorder, notifications', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Flight assignments', status: 'us_only', morain: 'Admin assigns players to flights', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Table assignments (seating chart)', status: 'us_only', morain: 'Auto & manual, per round, published to players', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Room map / visual seating layout', status: 'us_only', morain: 'Drag & drop room map editor + player view', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'QR code check-in', status: 'us_only', morain: 'Director scans QR at door', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Borrowed game sets tracking', status: 'us_only', morain: 'Volunteer tracking, auto table assignment', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Permanent East seat assignments', status: 'us_only', morain: 'Player agrees, admin assigns table', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Round timer / director control', status: 'us_only', morain: 'Live timer, haptic alerts, fullscreen display', amr: 'Not mentioned' },
  { category: 'Tournament Management', feature: 'Browse events by location/date', status: 'them_only', morain: 'Not currently — events are org-specific', amr: 'Browse & search upcoming events' },
  { category: 'Tournament Management', feature: 'Invite codes for tournaments', status: 'both', morain: 'Share links + QR referral codes', amr: 'Tournament invite codes (v1.2.9)' },

  // ── LEAGUE MANAGEMENT ───────────────────────────────────────────────────────
  { category: 'League Management', feature: 'Recurring league / club play', status: 'us_only', morain: 'Full league system: sessions, RSVP, roster', amr: 'Clubs — no recurring session management' },
  { category: 'League Management', feature: 'Session RSVP & attendance', status: 'us_only', morain: 'RSVP yes/no, waitlist, comments, volunteer', amr: 'Not mentioned' },
  { category: 'League Management', feature: 'Auto session invites (email)', status: 'us_only', morain: 'Configurable days-before, custom templates', amr: 'Not mentioned' },
  { category: 'League Management', feature: 'League leaderboard / season standings', status: 'us_only', morain: 'Attendance-based + score-based', amr: 'Global masterlist only' },
  { category: 'League Management', feature: 'League prize tracking', status: 'us_only', morain: 'Prize structure, winner assignment, payout notify', amr: 'Not mentioned' },

  // ── COURSES ─────────────────────────────────────────────────────────────────
  { category: 'Courses / Education', feature: 'Teaching courses & lessons', status: 'us_only', morain: 'Full course builder: lessons, materials, enrollment', amr: 'Not mentioned' },
  { category: 'Courses / Education', feature: 'Student enrollment & waitlist', status: 'us_only', morain: 'Enrollment cap, waitlist, auto-promote', amr: 'Not mentioned' },

  // ── FUNDRAISING ─────────────────────────────────────────────────────────────
  { category: 'Fundraising & Fun', feature: 'Raffle (general / 50-50)', status: 'us_only', morain: 'Full raffle mgmt, ticket sales, draw, display', amr: 'Not mentioned' },
  { category: 'Fundraising & Fun', feature: 'T-Raffle (player allocates tickets)', status: 'us_only', morain: 'Item allocation, live display, auto-close', amr: 'Not mentioned' },
  { category: 'Fundraising & Fun', feature: 'Silent auction', status: 'us_only', morain: 'Items, bidding, winner lock, live display', amr: 'Not mentioned' },

  // ── COMMUNITY & SOCIAL ──────────────────────────────────────────────────────
  { category: 'Community & Social', feature: 'Community feed / posts', status: 'us_only', morain: 'Per-event feed, photos, likes, comments', amr: 'Not mentioned as per-event' },
  { category: 'Community & Social', feature: 'Follow players', status: 'them_only', morain: 'Not currently', amr: 'Follow favorite players' },
  { category: 'Community & Social', feature: 'Join clubs / local communities', status: 'them_only', morain: 'Organizations, not open discovery', amr: 'Join clubs & connect locally' },
  { category: 'Community & Social', feature: 'Public player profiles', status: 'both', morain: 'Profile with photo, stats, history', amr: 'Public profiles with achievements' },
  { category: 'Community & Social', feature: 'Content moderation tools', status: 'us_only', morain: 'Report, block, admin moderation panel', amr: 'Not mentioned' },
  { category: 'Community & Social', feature: 'Player sharing / referral links', status: 'us_only', morain: 'Share links + QR codes with usage tracking', amr: 'Not mentioned' },

  // ── PLAYER STATS & RANKINGS ─────────────────────────────────────────────────
  { category: 'Player Stats & Rankings', feature: 'Personal performance analytics', status: 'both', morain: 'Score history, win rates, tournament history', amr: 'Win rates, analytics' },
  { category: 'Player Stats & Rankings', feature: 'Global ranking / masterlist', status: 'them_only', morain: 'Per-event leaderboards only', amr: 'Cross-format global masterlist' },
  { category: 'Player Stats & Rankings', feature: 'Rank / experience progression', status: 'them_only', morain: 'Not currently', amr: 'Rank display + XP progression' },
  { category: 'Player Stats & Rankings', feature: 'Compare stats with other players', status: 'them_only', morain: 'Not currently', amr: 'Compare stats head-to-head' },
  { category: 'Player Stats & Rankings', feature: 'Achievement tracking', status: 'them_only', morain: 'Not currently', amr: 'Achievements system' },
  { category: 'Player Stats & Rankings', feature: 'Player matchup history', status: 'us_only', morain: 'Head-to-head matchup records', amr: 'Not mentioned' },

  // ── COMMUNICATIONS ──────────────────────────────────────────────────────────
  { category: 'Communications', feature: 'Email notifications to players', status: 'us_only', morain: 'Bulk email, templates, delivery reports', amr: 'Welcome email only (v1.3.0)' },
  { category: 'Communications', feature: 'SMS / text messaging', status: 'us_only', morain: 'Bulk SMS, opt-in per player', amr: 'Not mentioned' },
  { category: 'Communications', feature: 'Push notifications', status: 'both', morain: 'OneSignal — score verified, waitlist, prizes', amr: 'Match confirmation notifications' },
  { category: 'Communications', feature: 'Broadcast / announcement comms', status: 'us_only', morain: 'Broadcast tab with delivery tracking', amr: 'Not mentioned' },

  // ── PAYMENTS ────────────────────────────────────────────────────────────────
  { category: 'Payments', feature: 'Entry fee / payment collection', status: 'us_only', morain: 'Stripe checkout, multiple fee models', amr: 'Not mentioned' },
  { category: 'Payments', feature: 'In-app subscription / ad removal', status: 'them_only', morain: 'Subscription model (Stripe)', amr: 'AMR+ $4.99/mo ad-free subscription' },
  { category: 'Payments', feature: 'Ads in app', status: 'them_only', morain: 'No ads', amr: 'Banner ads (removable with AMR+)' },

  // ── ADMIN / OPERATIONS ──────────────────────────────────────────────────────
  { category: 'Admin & Operations', feature: 'Admin dashboard', status: 'us_only', morain: 'Full admin portal: analytics, users, orgs', amr: 'Not mentioned' },
  { category: 'Admin & Operations', feature: 'Organization / multi-club management', status: 'us_only', morain: 'Organization entity with multi-league support', amr: 'Single club focus' },
  { category: 'Admin & Operations', feature: 'Analytics dashboard', status: 'us_only', morain: 'Tournament & player performance analytics', amr: 'Not mentioned' },
  { category: 'Admin & Operations', feature: 'Audit log / data access controls', status: 'us_only', morain: 'Full audit log + data export restrictions', amr: 'Not mentioned' },
  { category: 'Admin & Operations', feature: 'Data archiving', status: 'us_only', morain: 'Archive & cleanup old tournaments/leagues', amr: 'Not mentioned' },
  { category: 'Admin & Operations', feature: 'CRM logic / club management', status: 'them_only', morain: 'Not explicitly', amr: 'CRM logic added v1.3.0' },
];

const CATEGORIES = [...new Set(ROWS.map(r => r.category))];

const statusCount = (s) => ROWS.filter(r => r.status === s).length;

export default function CompetitorComparison() {
  const tableRef = useRef(null);

  const exportPDF = () => {
    const el = tableRef.current;
    if (!el) return;
    const html = `<!DOCTYPE html><html><head><title>Feature Comparison</title>
    <style>
      @page { margin: 0.5in; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      h1 { font-size: 20px; margin-bottom: 2px; }
      p.sub { color: #64748b !important; font-size: 12px; margin-bottom: 16px; }
      .cards { display: flex; gap: 12px; margin-bottom: 16px; }
      .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; text-align: center; flex: 1; background: #ffffff !important; }
      .card .num { font-size: 22px; font-weight: bold; }
      .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; margin-top: 2px; }
      .card p { color: #94a3b8 !important; font-size: 10px; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f1f5f9 !important; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #475569 !important; }
      td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      td.cat { font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #475569 !important; background: #f8fafc !important; }
      .bg-emerald-100 { background: #d1fae5 !important; color: #065f46 !important; }
      .text-emerald-800 { color: #065f46 !important; }
      .bg-blue-100 { background: #dbeafe !important; color: #1e40af !important; }
      .text-blue-800 { color: #1e40af !important; }
      .bg-rose-100 { background: #fee2e2 !important; color: #991b1b !important; }
      .text-rose-800 { color: #991b1b !important; }
      .bg-gray-100 { background: #f3f4f6 !important; color: #6b7280 !important; }
      .text-gray-500 { color: #6b7280 !important; }
      .insights { display: flex; gap: 12px; margin-top: 16px; }
      .ins { border-radius: 8px; padding: 12px; flex: 1; font-size: 10px; }
      .ins.green { background: #ecfdf5 !important; border: 1px solid #a7f3d0; color: #065f46 !important; }
      .ins.red { background: #fff1f2 !important; border: 1px solid #fecdd3; color: #9f1239 !important; }
      .ins h2 { font-size: 12px; margin-bottom: 6px; }
      .ins li { margin-bottom: 3px; }
      footer { color: #94a3b8 !important; font-size: 9px; text-align: center; margin-top: 12px; }
    </style></head><body>${el.innerHTML}</body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const exportCSV = () => {
    const headers = ['Category', 'Feature', 'Who Has It', 'Morain Mahj Detail', 'AMR Authority Detail'];
    const rows = ROWS.map(r => [
      r.category,
      r.feature,
      STATUS[r.status].label,
      r.morain,
      r.amr,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Morain_vs_AMR_Comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div ref={tableRef} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900">Feature Comparison</h1>
            <p className="text-slate-500 mt-1">Morain Mahj vs. AMR Authority</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={exportPDF} className="gap-2">
              <FileText className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { status: 'us_only', label: 'Morain Only', desc: 'Features we have, they don\'t' },
            { status: 'both', label: 'Both Have', desc: 'Head-to-head overlap' },
            { status: 'them_only', label: 'AMR Only', desc: 'Features they have, we don\'t' },
            { status: 'neither', label: 'Neither', desc: 'Potential opportunities' },
          ].map(({ status, label, desc }) => (
            <div key={status} className="bg-white rounded-xl border border-border p-4 text-center shadow-sm">
              <div className="text-3xl font-bold text-slate-900">{statusCount(status)}</div>
              <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${STATUS[status].color}`}>{label}</div>
              <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Feature</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 w-32">Who Has It</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Morain Mahj</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">AMR Authority</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => {
                  const catRows = ROWS.filter(r => r.category === cat);
                  return catRows.map((row, i) => (
                    <tr key={row.feature} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {i === 0 && (
                        <td
                          rowSpan={catRows.length}
                          className="px-4 py-3 align-top font-semibold text-slate-700 bg-slate-50 border-r border-slate-100 text-xs uppercase tracking-wide"
                        >
                          {cat}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-800">{row.feature}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[row.status].color}`}>
                          {STATUS[row.status].icon}
                          {STATUS[row.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{row.morain}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs italic">{row.amr}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Insights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <h2 className="font-semibold text-emerald-800 mb-3">✦ Our Key Differentiators</h2>
            <ul className="text-sm text-emerald-700 space-y-1.5">
              <li>• <strong>Director-grade event ops:</strong> table assignments, room maps, QR check-in, round timer</li>
              <li>• <strong>Leagues:</strong> recurring sessions, RSVP, auto-invites, season standings</li>
              <li>• <strong>Courses:</strong> full teaching platform with lesson/material management</li>
              <li>• <strong>Fundraising suite:</strong> raffles, T-raffles, silent auctions</li>
              <li>• <strong>Communications:</strong> bulk email/SMS, templates, delivery tracking</li>
              <li>• <strong>Payment collection:</strong> Stripe entry fees, multiple fee models</li>
              <li>• <strong>Admin ops:</strong> audit log, analytics, org management, data archiving</li>
              <li>• <strong>No ads, ever</strong></li>
            </ul>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
            <h2 className="font-semibold text-rose-800 mb-3">⚠ Where AMR Has an Edge</h2>
            <ul className="text-sm text-rose-700 space-y-1.5">
              <li>• <strong>Global ranking system:</strong> cross-event, cross-format masterlist</li>
              <li>• <strong>Player discovery:</strong> browse events by location, follow players</li>
              <li>• <strong>XP / rank progression:</strong> gamified player leveling system</li>
              <li>• <strong>Achievements:</strong> badges and milestones</li>
              <li>• <strong>Casual / pickup games:</strong> not just director-run events</li>
              <li>• <strong>Head-to-head stat comparison</strong> between players</li>
              <li>• <strong>Club open discovery:</strong> anyone can join a public club</li>
            </ul>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-6 text-center">Based on AMR Authority App Store listing (v1.3.0, Apr 2026) · Generated {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}