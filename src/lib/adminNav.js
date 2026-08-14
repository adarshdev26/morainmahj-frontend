import {
  LayoutDashboard, Users, Trophy, UserCog, Database,
  Power, Mail, BarChart2, TrendingUp, Palette, Radio,
  GraduationCap, Shield, Globe, Layers, Gavel
} from 'lucide-react';

// Plan hierarchy: starter < pro < club
export const PLAN_LEVELS = { individual: 1, starter: 1, pro: 2, club: 3, unlimited: 4 };

// Nav groups — items tagged with minPlan are hidden from lower tiers
export const ADMIN_NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin' },
      { label: 'Players', icon: Users, path: '/admin/players' },
      { label: 'Registrations', icon: Database, path: '/admin/registrations' },
    ],
  },
  {
    label: 'Tournaments',
    items: [
      { label: 'Tournaments', icon: Trophy, path: '/admin/tournaments' },
      { label: 'Match Results', icon: Gavel, path: '/admin/match-results' },
      { label: 'Leaderboard', icon: Trophy, path: '/admin/leaderboard', minPlan: 'pro' },
      { label: 'Analytics', icon: BarChart2, path: '/admin/analytics', minPlan: 'pro' },
      { label: 'Analytics Dashboard', icon: TrendingUp, path: '/admin/analytics-dashboard', minPlan: 'pro' },
      { label: 'Player Performance', icon: TrendingUp, path: '/admin/performance', minPlan: 'pro' },
    ],
  },
  {
    label: 'Leagues',
    items: [
      { label: 'All Leagues', icon: Users, path: '/admin/leagues' },
      { label: 'Analytics', icon: BarChart2, path: '/admin/analytics', minPlan: 'pro' },
      { label: 'Analytics Dashboard', icon: TrendingUp, path: '/admin/analytics-dashboard', minPlan: 'pro' },
      { label: 'Player Performance', icon: TrendingUp, path: '/admin/performance', minPlan: 'pro' },
    ],
  },
  {
    label: 'Education',
    items: [
      { label: 'Courses', icon: GraduationCap, path: '/admin/courses', minPlan: 'pro' },
      { label: 'Analytics', icon: BarChart2, path: '/admin/analytics', minPlan: 'pro' },
      { label: 'Analytics Dashboard', icon: TrendingUp, path: '/admin/analytics-dashboard', minPlan: 'pro' },
      { label: 'Player Performance', icon: TrendingUp, path: '/admin/performance', minPlan: 'pro' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Communications', icon: Mail, path: '/admin/emails' },
      { label: 'Broadcast', icon: Radio, path: '/admin/broadcast', minPlan: 'pro' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Marketing Website', icon: Globe, path: '/admin/marketing', minPlan: 'admin' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Director Control', icon: Power, path: '/admin/director', minPlan: 'admin' },
      { label: 'User Management', icon: UserCog, path: '/admin/users', minPlan: 'admin' },
      { label: 'Audit Log', icon: Shield, path: '/admin/audit-log', minPlan: 'admin' },
      { label: 'Brand Guide', icon: Palette, path: '/admin/brand-guide', minPlan: 'admin' },
      { label: 'Card Setup', icon: Layers, path: '/admin/card-setup', minPlan: 'admin' },
      { label: 'Hand Logs', icon: Layers, path: '/admin/hand-logs', minPlan: 'admin' },
      { label: 'System Overview', icon: Database, path: '/admin/system-overview', minPlan: 'admin' },
    ],
  },
];

export function filterNavGroupsForPlan(plan, isSuperAdmin) {
  if (isSuperAdmin) return ADMIN_NAV_GROUPS;
  const level = PLAN_LEVELS[plan] || 0;
  if (level === 0) return [];
  return ADMIN_NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.minPlan || level >= PLAN_LEVELS[item.minPlan]),
    }))
    .filter(group => group.items.length > 0);
}

// Paths restricted to higher tiers — checked for route guarding
const RESTRICTED_PATHS = [
  { prefix: '/admin/marketing', minPlan: 'admin' },
  { prefix: '/admin/brand-guide', minPlan: 'admin' },
  { prefix: '/admin/system-overview', minPlan: 'admin' },
  { prefix: '/admin/users', minPlan: 'admin' },
  { prefix: '/admin/audit-log', minPlan: 'admin' },
  { prefix: '/admin/director', minPlan: 'admin' },
  { prefix: '/admin/card-setup', minPlan: 'admin' },
  { prefix: '/admin/hand-logs', minPlan: 'admin' },
  { prefix: '/admin/competitor-comparison', minPlan: 'club' },
  { prefix: '/admin/workflow-chart', minPlan: 'club' },
  { prefix: '/admin/analytics-dashboard', minPlan: 'pro' },
  { prefix: '/admin/analytics', minPlan: 'pro' },
  { prefix: '/admin/performance', minPlan: 'pro' },
  { prefix: '/admin/courses', minPlan: 'pro' },
  { prefix: '/admin/broadcast', minPlan: 'pro' },
  { prefix: '/admin/leaderboard', minPlan: 'pro' },
];

export function isPathAllowedForPlan(pathname, plan, isSuperAdmin) {
  if (isSuperAdmin) return true;
  const level = PLAN_LEVELS[plan] || 0;
  if (level === 0) return false;
  for (const { prefix, minPlan } of RESTRICTED_PATHS) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return level >= PLAN_LEVELS[minPlan];
    }
  }
  return true;
}