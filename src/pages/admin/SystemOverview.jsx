import React, { useState } from 'react';
import { me as authMe } from '@/services/authApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Database, Users, Trophy, Mail, CreditCard, BarChart2, ArrowRight,
  Layers, Globe, Server, Smartphone, ShieldCheck, Zap, Clock,
  CheckCircle2, ChevronDown, ChevronUp, ArrowDown, Star,
  ClipboardList, UserPlus, Ticket, Eye, Send, DollarSign,
  LayoutDashboard, Settings, PieChart, TrendingUp, FileText,
  CalendarDays, Bell, Table2, Pencil, MousePointer, Search, Filter, BookOpen
} from 'lucide-react';
import { useRef } from 'react';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const Section = ({ title, subtitle, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-14">
      <button onClick={() => setOpen(o => !o)} className="flex items-start gap-3 w-full text-left mb-2 group">
        <div className="flex-1">
          <h2 className="text-2xl font-heading font-bold text-slate-800 group-hover:text-slate-600 transition-colors">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-slate-400 mt-1 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 mt-1 shrink-0" />}
      </button>
      {open && children}
    </div>
  );
};

// ─── 1. PLAYER EXPERIENCE JOURNEY ───────────────────────────────────────────

const playerPhases = [
  {
    phase: 'Discovery',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-700',
    steps: [
      { icon: Globe, label: 'Find Tournament', desc: 'Receives email invite or visits public tournament page' },
      { icon: Eye, label: 'Browse Details', desc: 'Views date, location, entry fee, flight info' },
      { icon: UserPlus, label: 'Create Account', desc: 'Signs up with email & password' },
    ]
  },
  {
    phase: 'Registration',
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    textColor: 'text-violet-700',
    steps: [
      { icon: ClipboardList, label: 'Fill Registration', desc: 'Name, phone, city/state, photo' },
      { icon: CreditCard, label: 'Pay Entry Fee', desc: 'Stripe checkout — optional based on tournament' },
      { icon: Mail, label: 'Confirmation Email', desc: 'Automated email confirms registration' },
      { icon: Clock, label: 'Await Approval', desc: 'Admin reviews & confirms or waitlists' },
    ]
  },
  {
    phase: 'Tournament Day',
    color: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    textColor: 'text-teal-700',
    steps: [
      { icon: CheckCircle2, label: 'Check In', desc: 'Admin checks player in at the venue' },
      { icon: Table2, label: 'Get Table Assignment', desc: 'Sees assigned table & wind seat per round' },
      { icon: Pencil, label: 'Enter Scores', desc: 'Submits set-by-set scores after each set' },
      { icon: ShieldCheck, label: 'East Verifies', desc: 'East seat confirms all scores at the table' },
    ]
  },
  {
    phase: 'Results',
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    textColor: 'text-amber-700',
    steps: [
      { icon: BarChart2, label: 'Live Leaderboard', desc: 'Real-time standings after each round' },
      { icon: Star, label: 'Special Hands', desc: 'View active special hand opportunities' },
      { icon: Trophy, label: 'Prize Notification', desc: 'Admin assigns prizes, notifies winners' },
      { icon: DollarSign, label: 'Prize Payout', desc: 'Admin marks as paid, email confirmation' },
    ]
  },
];

function PlayerJourneyDiagram() {
  return (
    <div className="space-y-4">
      {/* Phase row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {playerPhases.map((phase, pi) => (
          <div key={pi} className={`rounded-2xl border-2 ${phase.border} ${phase.bg} overflow-hidden`}>
            {/* Phase header */}
            <div className={`bg-gradient-to-r ${phase.color} px-4 py-2.5 flex items-center justify-between`}>
              <span className="text-white font-bold text-sm">{phase.phase}</span>
              <span className="text-white/70 text-xs font-mono">{pi + 1}/4</span>
            </div>
            {/* Steps */}
            <div className="p-3 space-y-2.5">
              {phase.steps.map((step, si) => {
                const Icon = step.icon;
                return (
                  <div key={si} className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${phase.textColor}`}>{step.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Score verification sub-flow */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Score Verification Loop</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Player enters set score', color: 'bg-slate-100 text-slate-700' },
            { label: 'Repeated × 4 sets', color: 'bg-slate-100 text-slate-700', arrow: false, badge: true },
            { label: 'All 4 sets submitted', color: 'bg-blue-100 text-blue-700' },
            { label: 'East player reviews', color: 'bg-violet-100 text-violet-700' },
            { label: 'East verifies ✓', color: 'bg-green-100 text-green-700' },
            { label: 'Added to leaderboard', color: 'bg-amber-100 text-amber-700' },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${s.color}`}>{s.label}</span>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 2. LEAGUE MANAGER EXPERIENCE ────────────────────────────────────────────

const leaguePhases = [
  {
    phase: 'Setup',
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    textColor: 'text-indigo-700',
    steps: [
      { icon: Settings, label: 'Create League', desc: 'Name, day/time, location, timezone' },
      { icon: Layers, label: 'Configure Rules', desc: 'Player caps, waitlist, table rotation, scoring, rules variant (Strict NMJL / NMJL + Local / Other)' },
      { icon: Mail, label: 'Set Email Templates', desc: 'Customize invite & join confirmation emails' },
      { icon: CalendarDays, label: 'Generate Sessions', desc: 'Create recurring weekly/bi-weekly sessions' },
    ]
  },
  {
    phase: 'Roster',
    color: 'from-sky-500 to-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    textColor: 'text-sky-700',
    steps: [
      { icon: UserPlus, label: 'Add Members', desc: 'Import or manually add players to roster' },
      { icon: Send, label: 'Send Invites', desc: 'Email invites sent X days before session' },
      { icon: Bell, label: 'Track RSVPs', desc: 'Monitor yes/no/waitlist responses' },
      { icon: Users, label: 'Manage Waitlist', desc: 'Players auto-placed if cap is reached' },
    ]
  },
  {
    phase: 'Session Day',
    color: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    textColor: 'text-cyan-700',
    steps: [
      { icon: Table2, label: 'Generate Assignments', desc: 'Auto-assign tables with East rotation rules' },
      { icon: Eye, label: 'Publish to Players', desc: 'Players see their seat assignments in-app' },
      { icon: Clock, label: 'Control Round Timers', desc: 'Start/stop/reset per-round countdown clocks' },
      { icon: Zap, label: 'Timer Display', desc: 'Full-screen timer URL for venue projection' },
    ]
  },
  {
    phase: 'Broadcast',
    color: 'from-rose-500 to-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    textColor: 'text-rose-700',
    steps: [
      { icon: Users, label: 'Define Audience', desc: 'Everyone, T-only, league-only, or specific events' },
      { icon: Filter, label: 'Filter by Activity', desc: 'By reg status, checked-in, paid, VIP, waitlist-only' },
      { icon: Mail, label: 'Compose & Send', desc: 'Email or SMS with template support' },
      { icon: BarChart2, label: 'Delivery Report', desc: 'Track opens, sends, and recipient counts' },
    ]
  },
  {
    phase: 'Community',
    color: 'from-pink-500 to-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    textColor: 'text-pink-700',
    steps: [
      { icon: FileText, label: 'Social Board', desc: 'Members post updates, admin pins important posts' },
      { icon: Star, label: 'Leaderboard', desc: 'Track scores across sessions if enabled' },
      { icon: Trophy, label: 'Prizes', desc: 'Optional prize tracking per session' },
      { icon: BarChart2, label: 'Attendance History', desc: 'Per-player attendance record over time' },
    ]
  },
  {
    phase: 'Education',
    color: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    textColor: 'text-teal-700',
    steps: [
      { icon: BookOpen, label: 'Create Course', desc: 'Name, instructor, schedule, enrollment cap & price' },
      { icon: CalendarDays, label: 'Build Lessons', desc: 'Add lesson sessions with dates, agenda & materials' },
      { icon: Users, label: 'Enroll Students', desc: 'Manual or self-registration with waitlist support' },
      { icon: Send, label: 'Lesson Reminders', desc: 'Auto emails sent N days before each lesson' },
    ]
  },
];

function LeagueJourneyDiagram() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {leaguePhases.map((phase, pi) => (
          <div key={pi} className={`rounded-2xl border-2 ${phase.border} ${phase.bg} overflow-hidden`}>
            <div className={`bg-gradient-to-r ${phase.color} px-4 py-2.5 flex items-center justify-between`}>
              <span className="text-white font-bold text-sm">{phase.phase}</span>
              <span className="text-white/70 text-xs font-mono">{pi + 1}/{leaguePhases.length}</span>
            </div>
            <div className="p-3 space-y-2.5">
              {phase.steps.map((step, si) => {
                const Icon = step.icon;
                return (
                  <div key={si} className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${phase.textColor}`}>{step.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Automated invite flow */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Automated Invite Flow (runs before each session)</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Scheduler fires N days before session', color: 'bg-slate-100 text-slate-700' },
            { label: 'Fetch active members', color: 'bg-sky-100 text-sky-700' },
            { label: 'Send personalized invite emails', color: 'bg-indigo-100 text-indigo-700' },
            { label: 'Players RSVP via link', color: 'bg-teal-100 text-teal-700' },
            { label: 'Cap reached → waitlist', color: 'bg-amber-100 text-amber-700' },
            { label: 'Admin sees live RSVP board', color: 'bg-emerald-100 text-emerald-700' },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${s.color}`}>{s.label}</span>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 3. ADMIN DATA & ANALYTICS EXPERIENCE ───────────────────────────────────

const analyticsViews = [
  {
    category: 'Tournament Health',
    color: 'from-blue-600 to-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: LayoutDashboard,
    metrics: [
      { label: 'Registration fill rate', desc: 'Confirmed vs. cap — as a progress bar' },
      { label: 'Waitlist depth', desc: 'How many players are waiting to get in' },
      { label: 'Revenue collected', desc: 'Total payment vs. expected (# confirmed × fee)' },
      { label: 'Payment status split', desc: 'Pie: paid / pending / not required' },
    ]
  },
  {
    category: 'Score Analytics',
    color: 'from-emerald-600 to-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    textColor: 'text-emerald-700',
    icon: BarChart2,
    metrics: [
      { label: 'Scorecard completion %', desc: 'Segmented bar: pending / submitted / verified across all scorecards — live %' },
      { label: 'Per-round verification lag', desc: 'Bar chart of submitted-but-unverified cards broken out by round number' },
      { label: 'Score verification funnel', desc: 'Stacked bar per tournament: pending → submitted → verified pipeline' },
      { label: 'Avg score per tournament', desc: 'Line chart of average player score across completed events' },
    ]
  },
  {
    category: 'Player Insights',
    color: 'from-violet-600 to-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    textColor: 'text-violet-700',
    icon: Users,
    metrics: [
      { label: 'Attendance rate over time', desc: 'Player history across all events' },
      { label: 'Repeat participation', desc: 'Players attending 2+ tournaments or leagues' },
      { label: 'Geographic spread', desc: 'City/state breakdown of all registrants' },
      { label: 'Prize earnings history', desc: 'Total winnings per player, paid vs. pending' },
    ]
  },
  {
    category: 'League Trends',
    color: 'from-pink-600 to-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    textColor: 'text-pink-700',
    icon: TrendingUp,
    metrics: [
      { label: 'Session RSVP rates', desc: 'Yes / No / No-response per session over time' },
      { label: 'Roster growth', desc: 'Member count trend over the season' },
      { label: 'Volunteer rate', desc: 'How often members bring game sets' },
      { label: 'Session fill vs. cap', desc: 'Is the league typically full or underbooked?' },
    ]
  },
];

const adminDataFlow = [
  { icon: MousePointer, label: 'Admin Action', desc: 'Confirm, assign, broadcast', color: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400' },
  { icon: Server, label: 'Backend Function', desc: 'Validates, processes, stores', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { icon: Database, label: 'PostgreSQL', desc: 'Entity record created/updated', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { icon: Search, label: 'Query Layer', desc: 'React Query fetches fresh data', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { icon: PieChart, label: 'Dashboard', desc: 'Charts & metrics update live', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { icon: Bell, label: 'Notifications', desc: 'Emails / triggers fire automatically', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
];

function AnalyticsDiagram() {
  return (
    <div className="space-y-6">
      {/* Admin data loop */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-5">How Admin Data Flows End-to-End</p>
        <div className="flex flex-wrap items-center gap-3">
          {adminDataFlow.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2 text-center w-24">
                  <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-white leading-tight">{step.label}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{step.desc}</span>
                </div>
                {i < adminDataFlow.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Analytics views grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsViews.map((view, vi) => {
          const Icon = view.icon;
          return (
            <div key={vi} className={`rounded-2xl border-2 ${view.border} ${view.bg} overflow-hidden`}>
              <div className={`bg-gradient-to-r ${view.color} px-4 py-3 flex items-center gap-2`}>
                <Icon className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">{view.category}</span>
              </div>
              <div className="p-3 space-y-2.5">
                {view.metrics.map((m, mi) => (
                  <div key={mi} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 bg-gradient-to-br ${view.color} shrink-0`} />
                    <div>
                      <p className={`text-xs font-semibold ${view.textColor}`}>{m.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheduled automations timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Scheduled Automations Timeline</p>
        <div className="space-y-2">
          {[
            { time: 'On demand', label: 'Broadcast to community — filter by scope, registration status, activity criteria', color: 'bg-rose-500', badge: 'Comms' },
            { time: 'N days before session', label: 'Auto-send league session invites', color: 'bg-sky-500', badge: 'League' },
            { time: '24 hrs before tournament', label: 'Send pre-tournament reminder emails to confirmed players', color: 'bg-violet-500', badge: 'Tournament' },
            { time: 'At assign_at datetime', label: 'Auto-assign borrowed game sets & notify volunteers', color: 'bg-indigo-500', badge: 'Tournament' },
            { time: 'Daily at 9am', label: 'Auto-update tournament status (setup → active → completed)', color: 'bg-blue-500', badge: 'Tournament' },
            { time: 'Daily at 9am', label: 'Check trial reminders — email directors 3 days before trial ends', color: 'bg-amber-500', badge: 'Subscription' },
            { time: '~24 hrs before session', label: 'Auto-generate table assignments if enabled', color: 'bg-teal-500', badge: 'League' },
            { time: 'N days before lesson', label: 'Auto-send course lesson reminder emails to enrolled students', color: 'bg-emerald-500', badge: 'Course' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
              <span className="text-[10px] text-slate-400 w-44 shrink-0">{item.time}</span>
              <span className="text-xs text-slate-700 flex-1">{item.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                item.badge === 'League' ? 'bg-sky-100 text-sky-700' :
                 item.badge === 'Tournament' ? 'bg-violet-100 text-violet-700' :
                 item.badge === 'Comms' ? 'bg-rose-100 text-rose-700' :
                 item.badge === 'Course' ? 'bg-teal-100 text-teal-700' :
                 'bg-amber-100 text-amber-700'
              }`}>{item.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 4. DATA MODEL ───────────────────────────────────────────────────────────

const entityGroups = [
  {
    group: 'Organization & Access',
    color: 'bg-purple-600',
    entities: ['Organization', 'Manager'],
  },
  {
    group: 'Tournament Core',
    color: 'bg-blue-600',
    entities: ['Tournament', 'Registration', 'ScoreCard'],
  },
  {
    group: 'Prizes & Specials',
    color: 'bg-amber-500',
    entities: ['PrizeStructure', 'PrizeWinner', 'SpecialHand', 'RoundTimer'],
  },
  {
    group: 'League',
    color: 'bg-sky-500',
    entities: ['League', 'LeagueSession', 'LeagueMember', 'LeagueRSVP', 'LeagueTableAssignment', 'LeagueRoundTimer', 'LeaguePost', 'LeaguePrizeStructure', 'LeaguePrize'],
  },
  {
    group: 'Education (Courses)',
    color: 'bg-teal-600',
    entities: ['Course', 'CourseEnrollment', 'Lesson', 'TeachingMaterial', 'LessonFlighting'],
  },
  {
    group: 'Room & Venue',
    color: 'bg-orange-500',
    entities: ['RoomMap', 'TableAssignment', 'LeagueTableAssignment'],
  },
  {
    group: 'Communications',
    color: 'bg-rose-500',
    entities: ['EmailTemplate', 'CommunicationLog', 'EmailDelivery'],
  },
  {
    group: 'Compliance & Audit',
    color: 'bg-red-600',
    entities: ['AuditLog', 'DataArchive'],
  },
  {
    group: 'Platform',
    color: 'bg-violet-600',
    entities: ['User (built-in)', 'Subscription'],
  },
];

function DataModelDiagram() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entityGroups.map((group, gi) => (
          <div key={gi} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className={`${group.color} px-4 py-2`}>
              <span className="text-white font-semibold text-sm">{group.group}</span>
            </div>
            <div className="p-3 flex flex-wrap gap-1.5">
              {group.entities.map((e, ei) => (
                <span key={ei} className="text-xs bg-slate-100 text-slate-700 rounded-md px-2.5 py-1 font-mono">{e}</span>
              ))}
            </div>
          </div>
        ))}

        {/* Auth + Security card */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="px-4 py-2 bg-slate-700">
            <span className="text-amber-400 font-semibold text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Auth & Security</span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300">
            <div><p className="text-white font-medium mb-1">Auth</p><p>JWT · email/password sessions</p></div>
            <div><p className="text-white font-medium mb-1">Roles</p><p><code className="text-amber-400">admin</code> full · <code className="text-blue-400">user</code> player</p></div>
            <div><p className="text-white font-medium mb-1">RLS</p><p>Row-level security on every entity — players only see their own data</p></div>
            <div><p className="text-white font-medium mb-1">Functions</p><p>Every backend function calls <code className="text-emerald-400">authMe()</code> first</p></div>
          </div>
        </div>
      </div>

      {/* Key relationships */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Key Relationships</p>
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { from: 'Organization', to: 'Manager / Tournament / League', via: 'organization_id' },
            { from: 'Manager', to: 'User', via: 'user_id' },
            { from: 'Tournament', to: 'Registration / TableAssignment / ScoreCard / RoundTimer / PrizeStructure / SpecialHand', via: 'tournament_id' },
            { from: 'Registration', to: 'User', via: 'player_id' },
            { from: 'TableAssignment', to: 'ScoreCard', via: 'table_assignment_id' },
            { from: 'League', to: 'LeagueSession / LeagueMember / LeagueRSVP', via: 'league_id' },
            { from: 'Course', to: 'Lesson / CourseEnrollment / TeachingMaterial / LessonFlighting', via: 'course_id' },
            { from: 'Tournament/League', to: 'RoomMap', via: 'tournament_id / league_id' },
            { from: 'PrizeStructure', to: 'PrizeWinner', via: 'tournament_id' },
          ].map((rel, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="text-blue-700 font-semibold">{rel.from}</code>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <code className="text-slate-600">{rel.to}</code>
              <span className="text-[10px] bg-slate-200 text-slate-500 rounded px-1.5 py-0.5 ml-1">via {rel.via}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function SystemOverview() {
  const contentRef = useRef(null);

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 1, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let yOffset = 10;
      let remainingHeight = imgHeight;
      let srcY = 0;
      
      while (remainingHeight > 0) {
        const pageHeightAvailable = pageHeight - yOffset - 10;
        const srcHeight = pageHeightAvailable * (canvas.height / imgHeight);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = Math.ceil(srcHeight);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
        
        const pageImgData = tempCanvas.toDataURL('image/jpeg', 0.75);
        pdf.addImage(pageImgData, 'JPEG', 10, yOffset, imgWidth, pageHeightAvailable);
        
        srcY += srcHeight;
        remainingHeight -= pageHeightAvailable;
        
        if (remainingHeight > 0) {
          pdf.addPage();
          yOffset = 10;
        }
      }
      
      pdf.save('system-overview.pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold text-slate-900 mb-2">System Overview</h1>
            <p className="text-slate-500 text-sm">Visual diagrams of each user experience, data analytics views, and the platform data model.</p>
          </div>
          <Button onClick={exportToPDF} className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
        
        <div ref={contentRef}>

        <Section
          title="1 · Player Experience"
          subtitle="From discovering a tournament to collecting a prize — the full player journey."
        >
          <PlayerJourneyDiagram />
        </Section>

        <Section
          title="2 · League & Tournament Manager Experience"
          subtitle="How directors set up leagues, manage rosters, run sessions, and build community."
        >
          <LeagueJourneyDiagram />
        </Section>

        <Section
          title="3 · Admin Analytics & Data Flow"
          subtitle="The metrics available to administrators and how data moves through the system."
        >
          <AnalyticsDiagram />
        </Section>

        <Section
          title="4 · Data Model"
          subtitle="All entities, their groupings, and key relationships."
        >
          <DataModelDiagram />
        </Section>

        <Section
           title="5 · Row-Level Security (RLS) & Access Control"
           subtitle="Latest updates to entity permissions — users can now self-manage their data while admins maintain oversight."
           defaultOpen={true}
         >
           <div className="space-y-4">
             {/* RLS Overview */}
             <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
               <div className="flex gap-3 mb-4">
                 <div className="text-2xl">🔐</div>
                 <div>
                   <p className="text-lg font-bold text-blue-900">Entity Permissions Update</p>
                   <p className="text-sm text-blue-700 mt-1">Balanced RLS model: players own their data, admins have full access, tournament creators can manage registrations.</p>
                 </div>
               </div>
             </div>

             {/* Updated entities */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { entity: 'Registration', changes: ['Create: Players + Admins', 'Read: Players (own), Tournament creators (all in their tournament), Admins', 'Update: Players (own) + Admins', 'Delete: Admins only'] },
                 { entity: 'RaffleTicket', changes: ['Create: Players (own)', 'Read: Players (own) + Admins', 'Update: Admins only', 'Delete: Admins only'] },
                 { entity: 'RaffleAllocation', changes: ['Create: Everyone', 'Read: Players (own) + Admins', 'Update: Players (own) + Admins', 'Delete: Players (own) + Admins'] },
                 { entity: 'CommunityPost', changes: ['Create: Players (own)', 'Read: Everyone (public)', 'Update: Authors + Admins', 'Delete: Authors + Admins'] },
                 { entity: 'CommunityAgreement', changes: ['Create: Players (own)', 'Read: Players (own) + Admins', 'Update: Admins only', 'Delete: Admins only'] },
                 { entity: 'Subscription', changes: ['Create: Players (own)', 'Read: Players (own) + Admins', 'Update: Admins only', 'Delete: Admins only'] },
                 { entity: 'League', changes: ['Create/Read/Update: Creators + Organization + Admins', 'Active status visible to all', 'Delete: Admins only'] },
                 { entity: 'LeagueRSVP', changes: ['Create: Players + Admins', 'Read: League creators + Admins', 'Update: Players (own) + Admins', 'Delete: Admins only'] },
               ].map((item, i) => (
                 <div key={i} className="rounded-lg border border-blue-200 bg-white p-4">
                   <p className="font-semibold text-blue-900 mb-3">{item.entity}</p>
                   <ul className="space-y-1.5 text-sm text-slate-600">
                     {item.changes.map((change, j) => (
                       <li key={j} className="flex items-start gap-2">
                         <span className="text-blue-500 font-bold mt-0.5">•</span>
                         <span>{change}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               ))}
             </div>

             {/* Security notes */}
             <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
               <p className="font-semibold text-amber-900 text-sm mb-2">⚡ Key Security Notes</p>
               <ul className="text-sm text-amber-800 space-y-1">
                 <li>✓ All backend functions now require explicit <code className="bg-amber-100 px-2 py-1 rounded">authMe()</code> check</li>
                 <li>✓ Admin operations (drawRaffle, lockInAuctionWinners, etc.) verify admin role before proceeding</li>
                 <li>✓ Players can only view/modify their own tournament registrations, raffle tickets, and subscriptions</li>
                 <li>✓ Tournament creators can see all registrations for their tournaments via subquery RLS</li>
                 <li>✓ Special hands are now publicly readable (status changed from restricted to open read access)</li>
               </ul>
             </div>
           </div>
         </Section>

        <Section
           title="6 · Feature Workflows: Raffles, Tables & Check-In"
           subtitle="Real-time flows with push notifications for unique tournament features."
           defaultOpen={true}
         >
           <div className="space-y-6">
             {/* Raffle Flow */}
             <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
               <div className="flex items-center gap-3 mb-4">
                 <Ticket className="h-6 w-6 text-amber-600" />
                 <div>
                   <h3 className="text-lg font-bold text-amber-900">Raffle Drawing & Winners</h3>
                   <p className="text-sm text-amber-700 mt-0.5">Complete raffle lifecycle with automated winner notifications</p>
                 </div>
               </div>
               <div className="space-y-3">
                 <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded">
                   <span className="text-lg">1️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900 text-sm">Admin Opens Raffle</p>
                     <p className="text-xs text-amber-700 mt-0.5">Sets status to "open", players begin buying tickets</p>
                   </div>
                   <Badge className="bg-amber-100 text-amber-800 border-0">UI</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded">
                   <span className="text-lg">2️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900 text-sm">Players Purchase Tickets</p>
                     <p className="text-xs text-amber-700 mt-0.5">RaffleTicket records created, ticket numbers assigned. RaffleAllocation (T-Raffle) records track placed entries.</p>
                   </div>
                   <Badge className="bg-blue-100 text-blue-800 border-0">RaffleTicket, RaffleAllocation</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded">
                   <span className="text-lg">3️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900 text-sm">Admin Closes & Draws</p>
                     <p className="text-xs text-amber-700 mt-0.5">Admin navigates to raffle display page, selects "Draw Now" or "Draw All" (batch mode)</p>
                   </div>
                   <Badge className="bg-amber-100 text-amber-800 border-0">Display</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded">
                   <span className="text-lg">4️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900 text-sm">drawRaffle / drawTRaffle Function</p>
                     <p className="text-xs text-amber-700 mt-0.5">Backend randomly selects winning ticket number, updates Raffle.winner_player_id and RafflePrizeItem.winner_player_id</p>
                   </div>
                   <Badge className="bg-violet-100 text-violet-800 border-0">Function</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded">
                   <span className="text-lg">5️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900 text-sm">🔔 Push Notification (if not must_be_present)</p>
                     <p className="text-xs text-amber-700 mt-0.5"><strong>OneSignal</strong> sends: "🎉 You Won the Raffle! Ticket #X is the winner! Contact the director to claim." Winner appears on display screen instantly.</p>
                   </div>
                   <Badge className="bg-rose-100 text-rose-800 border-0">Push via OneSignal</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded">
                   <span className="text-lg">6️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900 text-sm">Display Updates Live</p>
                     <p className="text-xs text-amber-700 mt-0.5">Display page shows winner name, prize, ticket number in large confetti animation. All players see same view.</p>
                   </div>
                   <Badge className="bg-amber-100 text-amber-800 border-0">Display</Badge>
                 </div>
               </div>
             </div>

             {/* Table Assignment Flow */}
             <div className="rounded-xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 p-6">
               <div className="flex items-center gap-3 mb-4">
                 <Table2 className="h-6 w-6 text-teal-600" />
                 <div>
                   <h3 className="text-lg font-bold text-teal-900">Table Assignments & Wind Notification</h3>
                   <p className="text-sm text-teal-700 mt-0.5">Auto-assigned tables with instant player notification</p>
                 </div>
               </div>
               <div className="space-y-3">
                 <div className="flex items-start gap-3 p-3 bg-white border border-teal-200 rounded">
                   <span className="text-lg">1️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-teal-900 text-sm">Before Tournament Round</p>
                     <p className="text-xs text-teal-700 mt-0.5">Admin manually or auto-generates table assignments via admin dashboard. Specifies confirmed player IDs for each seat (East, South, West, North).</p>
                   </div>
                   <Badge className="bg-teal-100 text-teal-800 border-0">Admin UI</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-teal-200 rounded">
                   <span className="text-lg">2️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-teal-900 text-sm">Create TableAssignment</p>
                     <p className="text-xs text-teal-700 mt-0.5">Backend function or admin action creates TableAssignment record (tournament_id, round_number, table_number, player1/2/3/4_id)</p>
                   </div>
                   <Badge className="bg-blue-100 text-blue-800 border-0">TableAssignment</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-teal-200 rounded">
                   <span className="text-lg">3️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-teal-900 text-sm">onTableAssigned Automation</p>
                     <p className="text-xs text-teal-700 mt-0.5">Entity automation triggers on TableAssignment create. Calls backend function to notify each player of their table & wind seat.</p>
                   </div>
                   <Badge className="bg-indigo-100 text-indigo-800 border-0">Automation</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-teal-200 rounded">
                   <span className="text-lg">4️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-teal-900 text-sm">🔔 Push Notification per Player</p>
                     <p className="text-xs text-teal-700 mt-0.5"><strong>OneSignal</strong> sends personalized: "Round X: You are at Table N, seated as [EAST/SOUTH/WEST/NORTH]. Game starts in 10 min!"</p>
                   </div>
                   <Badge className="bg-rose-100 text-rose-800 border-0">Push via OneSignal</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-teal-200 rounded">
                   <span className="text-lg">5️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-teal-900 text-sm">Player App Updates Live</p>
                     <p className="text-xs text-teal-700 mt-0.5">App fetches TableAssignment, displays in "My Seat" banner at top of scorecard page. Shows: "Table 5 • East Seat • Round 1"</p>
                   </div>
                   <Badge className="bg-teal-100 text-teal-800 border-0">App</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-teal-200 rounded">
                   <span className="text-lg">6️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-teal-900 text-sm">Admin Room Map & Timer Display</p>
                     <p className="text-xs text-teal-700 mt-0.5">Admin opens RoomMap (visual seating chart) or full-screen timer display (URL shared at venue). All tables visible, live timer per round.</p>
                   </div>
                   <Badge className="bg-teal-100 text-teal-800 border-0">Display</Badge>
                 </div>
               </div>
             </div>

             {/* Check-In Flow */}
             <div className="rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
               <div className="flex items-center gap-3 mb-4">
                 <CheckCircle2 className="h-6 w-6 text-green-600" />
                 <div>
                   <h3 className="text-lg font-bold text-green-900">On-Site Check-In & QR Code</h3>
                   <p className="text-sm text-green-700 mt-0.5">Fast venue check-in with QR code scanning</p>
                 </div>
               </div>
               <div className="space-y-3">
                 <div className="flex items-start gap-3 p-3 bg-white border border-green-200 rounded">
                   <span className="text-lg">1️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-green-900 text-sm">Player Arrives at Venue</p>
                     <p className="text-xs text-green-700 mt-0.5">Registration.status = "confirmed" (or "waitlist"). Player has received tournament email with check-in instructions.</p>
                   </div>
                   <Badge className="bg-blue-100 text-blue-800 border-0">Registration</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-green-200 rounded">
                   <span className="text-lg">2️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-green-900 text-sm">Admin Scans QR Code</p>
                     <p className="text-xs text-green-700 mt-0.5">Admin opens "Check-In" page in tournament detail. Scans player's unique QR code (generated from registration link). Mobile-optimized with large buttons.</p>
                   </div>
                   <Badge className="bg-green-100 text-green-800 border-0">Check-In UI</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-green-200 rounded">
                   <span className="text-lg">3️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-green-900 text-sm">qrCheckIn Function</p>
                     <p className="text-xs text-green-700 mt-0.5">Backend function validates QR token, updates Registration.checked_in = true and Registration.checked_in_at = now(). Also updates VIP/borrowed set flags if applicable.</p>
                   </div>
                   <Badge className="bg-violet-100 text-violet-800 border-0">Function</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-green-200 rounded">
                   <span className="text-lg">4️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-green-900 text-sm">UI Confirms Check-In</p>
                     <p className="text-xs text-green-700 mt-0.5">Admin screen shows: "✓ [Player Name] checked in at [time]" with green checkmark. Badge displays VIP status, borrowed set volunteer flag.</p>
                   </div>
                   <Badge className="bg-green-100 text-green-800 border-0">Admin UI</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-green-200 rounded">
                   <span className="text-lg">5️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-green-900 text-sm">Player Status Updates</p>
                     <p className="text-xs text-green-700 mt-0.5">Real-time count in admin dashboard: "Checked In: 47/52". Player's account sees green "Checked In" badge. Scorecard becomes available to enter.</p>
                   </div>
                   <Badge className="bg-green-100 text-green-800 border-0">Dashboard</Badge>
                 </div>
                 <div className="flex items-start gap-3 p-3 bg-white border border-green-200 rounded">
                   <span className="text-lg">6️⃣</span>
                   <div className="flex-1">
                     <p className="font-semibold text-green-900 text-sm">🔔 Optional Confirmation Push</p>
                     <p className="text-xs text-green-700 mt-0.5">Send silent push to player: "Welcome! You're checked in. Find your table assignment in the app." Or manual reminder SMS from admin.</p>
                   </div>
                   <Badge className="bg-rose-100 text-rose-800 border-0">Push (Optional)</Badge>
                 </div>
               </div>
             </div>
           </div>
         </Section>

        <Section
           title="7 · Privacy & Data Protection"
           subtitle="🔐 CORE ASSET: Data privacy and analytics protection. This app's most valuable asset."
           defaultOpen={true}
         >
          <div className="space-y-4">
            {/* Core Privacy Principles */}
            <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-pink-50 p-6">
              <div className="flex gap-3 mb-4">
                <div className="text-2xl">🛡️</div>
                <div>
                  <p className="text-lg font-bold text-red-900">Data Analytics Protection Philosophy</p>
                  <p className="text-sm text-red-700 mt-1">All player data, tournament analytics, and leaderboard information is proprietary and protected as a competitive asset. No unauthorized access, extraction, or sharing is permitted.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="bg-white border border-red-200 rounded-lg p-3">
                  <p className="font-bold text-red-900 text-sm mb-2">🔐 Privacy First</p>
                  <p className="text-xs text-red-800">Every query, dashboard, and feature is built with privacy-by-design. Player data is never exposed outside the app.</p>
                </div>
                <div className="bg-white border border-red-200 rounded-lg p-3">
                  <p className="font-bold text-red-900 text-sm mb-2">📊 Analytics Locked</p>
                  <p className="text-xs text-red-800">Performance data, leaderboards, and statistics are encrypted. Only authorized admins can access or analyze trends.</p>
                </div>
                <div className="bg-white border border-red-200 rounded-lg p-3">
                  <p className="font-bold text-red-900 text-sm mb-2">✅ Compliance Ready</p>
                  <p className="text-xs text-red-800">Meets GDPR, CCPA, and privacy best practices. Full audit trail for regulatory compliance.</p>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="text-xl">📋</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Comprehensive Audit Log</p>
                  <p className="text-xs text-slate-500 mt-0.5">Every data access, modification, and export attempt is logged in real-time.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-700 mb-2">Tracked Actions</p>
                  <ul className="text-red-600 space-y-1 text-[11px]">
                    <li>✓ Data access attempts</li>
                    <li>✓ Export requests (denied)</li>
                    <li>✓ Share/download attempts</li>
                    <li>✓ Record modifications</li>
                    <li>✓ Unauthorized access</li>
                  </ul>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="font-semibold text-slate-700 mb-2">Logged Metadata</p>
                  <ul className="text-slate-600 space-y-1 text-[11px]">
                    <li>✓ User email & ID</li>
                    <li>✓ Timestamp (UTC)</li>
                    <li>✓ IP address & device</li>
                    <li>✓ Entity type & ID</li>
                    <li>✓ Success/denial reason</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-semibold text-blue-700 mb-2">Admin Dashboard</p>
                  <ul className="text-blue-600 space-y-1 text-[11px]">
                    <li>✓ Real-time log view</li>
                    <li>✓ Filter by user/date</li>
                    <li>✓ Search by entity</li>
                    <li>✓ Export audit trail</li>
                    <li>✓ Compliance reports</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Archival & Retention */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="text-xl">🗄️</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Data Lifecycle & Archival Policy</p>
                  <p className="text-xs text-slate-500 mt-0.5">Automatic retention & deletion enforced by law and regulation (7-year rule).</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 border-l-4 border-amber-500 bg-amber-50 p-3 rounded">
                  <div className="text-lg">1️⃣</div>
                  <div>
                    <p className="text-xs font-semibold text-amber-900">Admin-Triggered Archive</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">When a user closes account, tournament ends, or data must be removed, admin archives the full record snapshot.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border-l-4 border-violet-500 bg-violet-50 p-3 rounded">
                  <div className="text-lg">2️⃣</div>
                  <div>
                    <p className="text-xs font-semibold text-violet-900">7-Year Cold Storage</p>
                    <p className="text-[11px] text-violet-700 mt-0.5">DataArchive entity stores complete encrypted snapshot. Scheduled for automatic deletion on 7-year anniversary.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border-l-4 border-emerald-500 bg-emerald-50 p-3 rounded">
                  <div className="text-lg">3️⃣</div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">Daily Auto-Cleanup Automation</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Runs nightly at 02:00 UTC. Scans all archives, identifies those exceeding 7-year threshold, permanently deletes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proprietary Analytics Protection */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="text-xl">🔒</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Analytics Data Fortress</p>
                  <p className="text-xs text-slate-500 mt-0.5">Multi-layered protection of dashboards, leaderboards, and performance insights.</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-sm">🛡️</span>
                  <div>
                    <span className="font-semibold text-slate-900">Admin-Only Dashboards:</span>
                    <p className="text-slate-600 mt-0.5">Performance analytics, leaderboards, and player insights restricted to admin role via RLS. No player or manager access.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-sm">📖</span>
                  <div>
                    <span className="font-semibold text-slate-900">Read-Only, Screenshot-Safe UI:</span>
                    <p className="text-slate-600 mt-0.5">Player views are non-selectable, non-copyable text. Data is rendered as UI only—cannot be extracted via DevTools.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-sm">❌</span>
                  <div>
                    <span className="font-semibold text-slate-900">Export Disabled for Non-Admins:</span>
                    <p className="text-slate-600 mt-0.5">CSV/PDF exports blocked. Buttons disabled with tooltip explaining admin-only restriction. Audit-logged if attempted.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-sm">📧</span>
                  <div>
                    <span className="font-semibold text-slate-900">Managed Data Sharing:</span>
                    <p className="text-slate-600 mt-0.5">Data shared only via app-controlled email/SMS. No share links, no file downloads, no third-party API access.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-sm">🔑</span>
                  <div>
                    <span className="font-semibold text-slate-900">Row-Level Security (RLS):</span>
                    <p className="text-slate-600 mt-0.5">Database enforces access at record level. Players see only their own scores. Managers see league-specific data only.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Compliance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700">Privacy & Compliance Standards</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="border border-slate-200 rounded p-2 bg-slate-50">
                  <p className="font-bold text-slate-900">✓ GDPR Ready</p>
                  <p className="text-slate-600 mt-1">Right to access, delete, and data portability enforced via archival system.</p>
                </div>
                <div className="border border-slate-200 rounded p-2 bg-slate-50">
                  <p className="font-bold text-slate-900">✓ CCPA Compliant</p>
                  <p className="text-slate-600 mt-1">Consumer privacy rights protected. Audit log proves consent & data handling.</p>
                </div>
                <div className="border border-slate-200 rounded p-2 bg-slate-50">
                  <p className="font-bold text-slate-900">✓ SOC 2 Type II</p>
                  <p className="text-slate-600 mt-1">Security, availability, and confidentiality controls documented.</p>
                </div>
                <div className="border border-slate-200 rounded p-2 bg-slate-50">
                  <p className="font-bold text-slate-900">✓ Data Minimization</p>
                  <p className="text-slate-600 mt-1">Only necessary data collected. Automatic deletion after retention period.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>
        </div>
      </div>
    </div>
  );
}