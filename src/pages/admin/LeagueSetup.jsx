import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leagues as leaguesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Calendar, Users, Trophy, Mail, MessageSquare, Grid3X3, BookOpen, DollarSign } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import TimeInput12h from '@/components/shared/TimeInput12h';
import RulesEditor from '@/components/shared/RulesEditor';
import ImageUpload from '@/components/shared/ImageUpload';
import PayoutCalculator from '@/components/shared/PayoutCalculator';
import { useAuth } from '@/lib/AuthContext';

const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const DEFAULT_FORM = {
  name: '',
  description: '',
  location: '',
  day_of_week: '',
  cadence: 'weekly',
  start_time: '11:30',
  end_time: '14:30',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
  season_start: '',
  season_end: '',
  player_cap_enabled: false,
  player_cap: '',
  member_cap_enabled: false,
  member_cap: '',
  set_volunteers_needed: '',
  waitlist_enabled: true,
  boutique_tiles_allowed: true,
  table_assignments_enabled: false,
  east_rotation: 'moves',
  num_rounds: 4,
  hands_per_round: '',
  auto_assign_tables: false,
  show_table_assignments: false,
  scoring_enabled: false,
  leaderboard_enabled: false,
  prizes_enabled: false,
  entry_fee_enabled: false,
  entry_fee: '',
  admin_deduction_pct: '20',
  payout_mode: 'percentage',
  place_1st: '50',
  place_2nd: '30',
  place_3rd: '20',
  social_enabled: true,
  auto_invite_enabled: true,
  invite_days_before: 3,
  invite_email_subject: '',
  invite_email_body: '',
  join_email_subject: '',
  join_email_body: '',
  rsvp_comments_enabled: false,
  show_attendee_list: true,
  rsvp_list_public: true,
  hashtag: '',
  notes: '',
  rules_variant: 'nmjl',
  rules_description: '',
  payment_model: 'none',
  membership_fee_enabled: false,
  membership_fee: '',
  membership_term: 'yearly',
  membership_label: '',
  logo_url: '',
};

export default function LeagueSetup() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState(DEFAULT_FORM);
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const { data: existing } = useQuery({
    queryKey: ['league', id],
    queryFn: () => leaguesApi.filter({ id }).then(r => r[0]),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        ...DEFAULT_FORM,
        ...existing,
        day_of_week: existing.day_of_week != null ? String(existing.day_of_week) : '',
        cadence: existing.cadence || 'weekly',
        player_cap_enabled: !!existing.player_cap,
        player_cap: existing.player_cap || '',
        member_cap_enabled: !!existing.member_cap,
        member_cap: existing.member_cap || '',
        invite_email_subject: existing.invite_email_subject || '',
        invite_email_body: existing.invite_email_body || '',
        join_email_subject: existing.join_email_subject || '',
        join_email_body: existing.join_email_body || '',
        set_volunteers_needed: existing.set_volunteers_needed || '',
        table_assignments_enabled: !!existing.table_assignments_enabled,
        east_rotation: existing.east_rotation || 'moves',
        num_rounds: existing.num_rounds || 4,
        hands_per_round: existing.hands_per_round != null ? String(existing.hands_per_round) : '',
        auto_assign_tables: !!existing.auto_assign_tables,
        show_table_assignments: !!existing.show_table_assignments,
        invite_days_before: existing.invite_days_before ?? 3,
        season_start: existing.season_start || '',
        season_end: existing.season_end || '',
        timezone: existing.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
        rules_variant: existing.rules_variant || 'nmjl',
        rules_description: existing.rules_description || '',
        payment_model: existing.payment_model || 'none',
        membership_fee_enabled: existing.payment_model === 'paid' && existing.membership_fee > 0,
        membership_fee: existing.membership_fee ? String(existing.membership_fee / 100) : '',
        membership_term: existing.membership_term || 'yearly',
        membership_label: existing.membership_label || '',
        logo_url: existing.logo_url || '',
        });
        }
        }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (data) => isNew
      ? leaguesApi.create(data)
      : leaguesApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast({ title: isNew ? 'League created!' : 'League saved!' });
      if (isNew) navigate(`/admin/leagues/${result.id}`);
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!form.name) { toast({ title: 'League name is required', variant: 'destructive' }); return; }
    saveMutation.mutate({
      ...form,
      organization_id: user?.organization_id,
      day_of_week: form.day_of_week !== '' ? Number(form.day_of_week) : null,
      cadence: form.cadence || 'weekly',
      player_cap: form.player_cap_enabled && form.player_cap ? Number(form.player_cap) : null,
      member_cap: form.member_cap_enabled && form.member_cap ? Number(form.member_cap) : null,
      invite_email_subject: form.invite_email_subject || null,
      invite_email_body: form.invite_email_body || null,
      join_email_subject: form.join_email_subject || null,
      join_email_body: form.join_email_body || null,
      set_volunteers_needed: form.set_volunteers_needed ? Number(form.set_volunteers_needed) : null,
      table_assignments_enabled: form.table_assignments_enabled,
      east_rotation: form.table_assignments_enabled ? form.east_rotation : null,
      num_rounds: form.table_assignments_enabled ? (Number(form.num_rounds) || 4) : null,
      hands_per_round: form.hands_per_round ? Number(form.hands_per_round) : null,
      auto_assign_tables: form.table_assignments_enabled ? form.auto_assign_tables : false,
      show_table_assignments: form.table_assignments_enabled ? form.show_table_assignments : false,
      invite_days_before: Number(form.invite_days_before) || 3,
      season_start: form.season_start || null,
      season_end: form.season_end || null,
      rules_variant: form.rules_variant,
      rules_description: form.rules_description,
      payment_model: form.membership_fee_enabled && form.membership_fee ? 'paid' : 'none',
      membership_fee: form.membership_fee_enabled && form.membership_fee ? Math.round(Number(form.membership_fee) * 100) : null,
      membership_term: form.membership_fee_enabled ? form.membership_term : null,
      membership_label: form.membership_fee_enabled ? (form.membership_label || null) : null,
      logo_url: form.logo_url || null,
    });
  };

  const ToggleRow = ({ label, desc, fieldKey }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <Switch checked={!!form[fieldKey]} onCheckedChange={v => set(fieldKey, v)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <h1 className="text-3xl font-heading font-bold">{isNew ? 'New League' : 'Edit League'}</h1>
        </div>

        {/* Basic Info */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> League Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>League Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Wednesday Morning League" />
              </div>
              <div className="shrink-0 pb-1">
                <ImageUpload
                  label="League Logo"
                  value={form.logo_url}
                  onChange={(url) => set('logo_url', url || '')}
                  previewSize={64}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue name and address" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Day of Week</Label>
                <Select value={form.day_of_week} onValueChange={v => set('day_of_week', v)}>
                  <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Time</Label>
                <TimeInput12h value={form.start_time} onChange={v => set('start_time', v)} />
              </div>
              <div>
                <Label>End Time</Label>
                <TimeInput12h value={form.end_time} onChange={v => set('end_time', v)} />
                </div>
                </div>

                <div>
                <Label>Cadence</Label>
                <Select value={form.cadence} onValueChange={v => set('cadence', v)}>
                <SelectTrigger><SelectValue placeholder="Select cadence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every other week (biweekly)</SelectItem>
                  <SelectItem value="monthly">Monthly (same date each month)</SelectItem>
                  <SelectItem value="first_weekday">First weekday of the month</SelectItem>
                  </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">Monthly generates one session per month; First weekday picks the first occurrence of your day of week each month.</p>
                </div>

                <div>
                <Label>Time Zone</Label>
              <Select value={form.timezone} onValueChange={v => set('timezone', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Season Start (optional)</Label>
                <Input type="date" value={form.season_start} onChange={e => set('season_start', e.target.value)} />
              </div>
              <div>
                <Label>Season End (optional)</Label>
                <Input type="date" value={form.season_end} onChange={e => set('season_end', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-slate-400">Leave season dates blank for an ongoing league with no end date.</p>
            <div>
              <Label>Hashtag (optional)</Label>
              <Input value={form.hashtag} onChange={e => set('hashtag', e.target.value)} placeholder="#WedMorningMJ" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="text-sm font-medium text-slate-700">Player Cap per Session</p>
                <p className="text-xs text-slate-400 mt-0.5">Limit how many players can RSVP yes per session</p>
              </div>
              <Switch checked={!!form.player_cap_enabled} onCheckedChange={v => { set('player_cap_enabled', v); if (!v) set('player_cap', ''); }} />
            </div>
            {form.player_cap_enabled && (
              <div className="flex items-center gap-3">
                <Label className="shrink-0">Cap number</Label>
                <Input type="number" min={1} value={form.player_cap} onChange={e => set('player_cap', e.target.value)} placeholder="e.g. 16" className="w-32" />
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="text-sm font-medium text-slate-700">Total Member Cap</p>
                <p className="text-xs text-slate-400 mt-0.5">Limit total number of players on the league roster</p>
              </div>
              <Switch checked={!!form.member_cap_enabled} onCheckedChange={v => { set('member_cap_enabled', v); if (!v) set('member_cap', ''); }} />
            </div>
            {form.member_cap_enabled && (
              <div className="flex items-center gap-3">
                <Label className="shrink-0">Max members</Label>
                <Input type="number" min={1} value={form.member_cap} onChange={e => set('member_cap', e.target.value)} placeholder="e.g. 30" className="w-32" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Sets Needed</Label>
                <Input type="number" value={form.set_volunteers_needed} onChange={e => set('set_volunteers_needed', e.target.value)} placeholder="e.g. 6" />
              </div>
            </div>
            <ToggleRow label="Waitlist" desc="When the session is full, overflow players go to a waitlist" fieldKey="waitlist_enabled" />
            <ToggleRow label="Boutique tiles allowed" desc="Allow players to use specialty/boutique tiles in this league" fieldKey="boutique_tiles_allowed" />
            <ToggleRow label="Show attendee list to players" desc="Players can see who else has RSVP'd yes" fieldKey="show_attendee_list" />
            <ToggleRow label="RSVP list visible publicly" desc="When enabled, the attendee list shows player names (never email or phone) on the public RSVP page. Disable to keep attendance private." fieldKey="rsvp_list_public" />
            <ToggleRow label="Allow RSVP comments" desc="Players can attach a short comment to their RSVP" fieldKey="rsvp_comments_enabled" />
          </CardContent>
        </Card>

        {/* Membership Payment */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Membership Payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 py-3 border-b">
              <div>
                <p className="text-sm font-medium text-slate-700">Require payment to join</p>
                <p className="text-xs text-slate-400 mt-0.5">Players must pay a membership fee before their registration is finalized (Gatekeeper model)</p>
              </div>
              <Switch checked={!!form.membership_fee_enabled} onCheckedChange={v => { set('membership_fee_enabled', v); if (!v) { set('membership_fee', ''); set('membership_label', ''); } }} />
            </div>
            {form.membership_fee_enabled && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0 w-20">Fee ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.membership_fee} onChange={e => set('membership_fee', e.target.value)} placeholder="50.00" className="w-32" />
                </div>
                <div>
                  <Label>Membership term</Label>
                  <Select value={form.membership_term} onValueChange={v => set('membership_term', v)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="season">Per season</SelectItem>
                      <SelectItem value="yearly">Annual (yearly)</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Membership label (optional)</Label>
                  <Input value={form.membership_label} onChange={e => set('membership_label', e.target.value)} placeholder="e.g. 2025-2026 Annual Membership" />
                  <p className="text-xs text-slate-400 mt-1">Shown to players on the join page and checkout.</p>
                </div>
                <PayoutCalculator
                  entryFeeDollars={form.membership_fee}
                  playerCap={form.member_cap_enabled ? form.member_cap : form.player_cap}
                  paymentModel={form.membership_fee_enabled ? 'paid' : 'none'}
                  entityType="League"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table Assignments */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5" /> Table Assignments</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 py-3 border-b">
              <div>
                <p className="text-sm font-medium text-slate-700">Table assignments enabled</p>
                <p className="text-xs text-slate-400 mt-0.5">Generate seating assignments for each session</p>
              </div>
              <Switch checked={!!form.table_assignments_enabled} onCheckedChange={v => set('table_assignments_enabled', v)} />
            </div>
            {form.table_assignments_enabled && (
              <>
                <div>
                  <Label>Number of rounds per session</Label>
                  <Input type="number" min={1} max={8} value={form.num_rounds} onChange={e => set('num_rounds', e.target.value)} className="w-32 mt-1" />
                </div>
                <div>
                  <Label>Hands per round (optional)</Label>
                  <Input type="number" min={1} value={form.hands_per_round} onChange={e => set('hands_per_round', e.target.value)} placeholder="e.g. 8" className="w-32 mt-1" />
                  <p className="text-xs text-slate-400 mt-1">How many hands are played per round. Used for session structure and scoring context.</p>
                </div>
                <div>
                  <Label className="mb-2 block">East seat rotation</Label>
                  <div className="flex gap-3">
                    <button
                       type="button"
                       onClick={() => set('east_rotation', 'moves')}
                       className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${form.east_rotation === 'moves' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                     >
                       <p className="font-semibold">East moves</p>
                       <p className="text-xs mt-0.5 opacity-70">All four players rotate to new tables each round</p>
                     </button>
                     <button
                       type="button"
                       onClick={() => set('east_rotation', 'stays')}
                       className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${form.east_rotation === 'stays' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                     >
                       <p className="font-semibold">East stays</p>
                       <p className="text-xs mt-0.5 opacity-70">East remains at their table; South, West, North rotate in</p>
                     </button>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 border-t">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Auto-generate assignments</p>
                    <p className="text-xs text-slate-400 mt-0.5">Automatically generate table seating ~24 hours before each session (but no sooner than 15 min before start)</p>
                  </div>
                  <Switch checked={!!form.auto_assign_tables} onCheckedChange={v => set('auto_assign_tables', v)} />
                </div>
                <div className="flex items-start justify-between gap-4 py-3 border-t">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Show assignments to players</p>
                    <p className="text-xs text-slate-400 mt-0.5">Players can see their table, wind, and set info in the app</p>
                  </div>
                  <Switch checked={!!form.show_table_assignments} onCheckedChange={v => set('show_table_assignments', v)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invites & Automation */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Invites & Automation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow label="Auto-invite enabled" desc="Automatically email league members before each session" fieldKey="auto_invite_enabled" />
            {form.auto_invite_enabled && (
              <div>
                <Label>Days before session to send invite</Label>
                <Input type="number" min={1} max={14} value={form.invite_days_before} onChange={e => set('invite_days_before', e.target.value)} className="w-32" />
              </div>
            )}
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-slate-700">Session Invite Email (optional)</p>
              <p className="text-xs text-slate-400">Customize the email sent before each session. Available variables: <code className="bg-slate-100 px-1 rounded">{'{{player_name}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{league_name}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{date}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{time}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{location}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{rsvp_url}}'}</code></p>
              <div>
                <Label>Subject</Label>
                <Input value={form.invite_email_subject} onChange={e => set('invite_email_subject', e.target.value)} placeholder={`RSVP: {{league_name}} — {{date}}`} />
              </div>
              <div>
                <Label>Body (HTML)</Label>
                <Textarea value={form.invite_email_body} onChange={e => set('invite_email_body', e.target.value)} placeholder="Leave blank to use the default invite email." className="min-h-[120px] font-mono text-xs" />
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-slate-700">Welcome Email (when someone joins)</p>
              <p className="text-xs text-slate-400">Sent automatically when a new player joins via the sign-up link. Variables: <code className="bg-slate-100 px-1 rounded">{'{{player_name}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{league_name}}'}</code></p>
              <div>
                <Label>Subject</Label>
                <Input value={form.join_email_subject} onChange={e => set('join_email_subject', e.target.value)} placeholder={`Welcome to {{league_name}}!`} />
              </div>
              <div>
                <Label>Body (HTML)</Label>
                <Textarea value={form.join_email_body} onChange={e => set('join_email_body', e.target.value)} placeholder="Leave blank to use the default welcome email." className="min-h-[120px] font-mono text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoring & Prizes */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Scoring & Prizes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow label="Scoring enabled" desc="Track scores across sessions for a season leaderboard" fieldKey="scoring_enabled" />
            {form.scoring_enabled && (
              <>
                <ToggleRow label="Season leaderboard" desc="Show cumulative standings to players" fieldKey="leaderboard_enabled" />
                <div className="border-t pt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Prize Payouts</p>
                    <p className="text-xs text-slate-400 mt-0.5">Enable prize management with entry fees and payout structure</p>
                  </div>
                  <Switch checked={!!form.prizes_enabled} onCheckedChange={v => set('prizes_enabled', v)} />
                </div>
                {form.prizes_enabled && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-start justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Per-session entry fee</p>
                        <p className="text-xs text-slate-400 mt-0.5">Optional: charge players per session to build prize pool</p>
                      </div>
                      <Switch checked={!!form.entry_fee_enabled} onCheckedChange={v => { set('entry_fee_enabled', v); if (!v) set('entry_fee', ''); }} />
                    </div>
                    {form.entry_fee_enabled && (
                      <div className="flex items-center gap-3">
                        <Label className="shrink-0 w-20">Entry fee ($)</Label>
                        <Input type="number" step="0.01" min="0" value={form.entry_fee} onChange={e => set('entry_fee', e.target.value)} placeholder="25.00" className="w-32" />
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                      <p className="text-sm font-medium text-slate-700">Prize Breakdown</p>
                      <div>
                        <Label>Admin overhead %</Label>
                        <Input type="number" step="1" min="0" max="100" value={form.admin_deduction_pct} onChange={e => set('admin_deduction_pct', e.target.value)} className="w-32 mt-1" />
                        <p className="text-xs text-slate-400 mt-1">Percentage for venue, organizing, fees, etc.</p>
                      </div>
                      <div>
                        <Label className="mb-2 block">Payout mode</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => set('payout_mode', 'percentage')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${form.payout_mode === 'percentage' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                          >
                            % of pool
                          </button>
                          <button
                            type="button"
                            onClick={() => set('payout_mode', 'fixed')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${form.payout_mode === 'fixed' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                          >
                            Fixed $
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>1st place</Label>
                          <Input type="number" step="0.01" min="0" value={form.place_1st} onChange={e => set('place_1st', e.target.value)} placeholder="50" className="mt-1" />
                          {form.payout_mode === 'percentage' ? (
                            <p className="text-xs text-slate-400 mt-0.5">%</p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">$</p>
                          )}
                        </div>
                        <div>
                          <Label>2nd place</Label>
                          <Input type="number" step="0.01" min="0" value={form.place_2nd} onChange={e => set('place_2nd', e.target.value)} placeholder="30" className="mt-1" />
                          {form.payout_mode === 'percentage' ? (
                            <p className="text-xs text-slate-400 mt-0.5">%</p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">$</p>
                          )}
                        </div>
                        <div>
                          <Label>3rd place</Label>
                          <Input type="number" step="0.01" min="0" value={form.place_3rd} onChange={e => set('place_3rd', e.target.value)} placeholder="20" className="mt-1" />
                          {form.payout_mode === 'percentage' ? (
                            <p className="text-xs text-slate-400 mt-0.5">%</p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">$</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Rules & Scoring */}
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Rules & Scoring</CardTitle></CardHeader>
          <CardContent>
            <RulesEditor
              variant={form.rules_variant}
              rulesDescription={form.rules_description}
              onChange={({ variant, description }) => {
                set('rules_variant', variant);
                set('rules_description', description);
              }}
            />
          </CardContent>
        </Card>

        {/* Social */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Social</CardTitle></CardHeader>
          <CardContent>
            <ToggleRow label="Social board enabled" desc="League members can post messages, photos, and comments" fieldKey="social_enabled" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" /> {isNew ? 'Create League' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/leagues')}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}