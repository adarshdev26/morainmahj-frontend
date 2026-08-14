import React, { useState, useMemo } from 'react';
import { callAction } from '@/services/actions';
import { emailTemplates as emailTemplatesApi, leagueMembers as leagueMembersApi, leagues as leaguesApi, registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Send, Users, Filter, ChevronDown, ChevronUp, CheckCircle2, X, Search } from 'lucide-react';

// ── Audience filter config ───────────────────────────────────────────────────

const SCOPE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', desc: 'All players who ever registered or joined a league' },
  { value: 'tournament_only', label: 'Tournament players only', desc: 'Players who registered for at least one tournament' },
  { value: 'league_only', label: 'League members only', desc: 'Players who joined at least one league' },
  { value: 'specific_tournaments', label: 'Specific tournament(s)', desc: 'Target one or more tournaments' },
  { value: 'specific_leagues', label: 'Specific league(s)', desc: 'Target one or more leagues' },
];

const REGISTRATION_STATUS_FILTERS = [
  { value: 'pending', label: 'Invited — no response', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  { value: 'waitlisted', label: 'Waitlisted', color: 'bg-orange-100 text-orange-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
];

const ACTIVITY_FILTERS = [
  { value: 'checked_in', label: 'Actually played (checked in)', desc: 'Players who were checked in on tournament day' },
  { value: 'not_checked_in', label: 'Confirmed but did not play', desc: 'Confirmed but never checked in' },
  { value: 'paid', label: 'Paid entry fee', desc: 'Players with payment_status = paid' },
  { value: 'not_paid', label: 'Not yet paid', desc: 'Players with pending or no payment' },
  { value: 'vip', label: 'VIP players', desc: 'Players flagged as VIP' },
  { value: 'waitlist_only', label: 'Waitlisted only — never confirmed', desc: 'Players who never made it off the waitlist' },
];

const TEMPLATE_VARIABLES = ['{{player_name}}', '{{tournament_name}}', '{{league_name}}', '{{date}}', '{{location}}'];

// ────────────────────────────────────────────────────────────────────────────

function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 border-t space-y-3">{children}</div>}
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const toggle = (val) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-left hover:bg-muted/30 transition-colors"
      >
        <span className={selected.length ? 'text-foreground' : 'text-muted-foreground'}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map(v => {
            const opt = options.find(o => o.value === v);
            return (
              <Badge key={v} variant="secondary" className="gap-1 text-xs pr-1">
                {opt?.label || v}
                <button onClick={() => toggle(v)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            );
          })}
        </div>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-muted/50">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="flex-1 text-sm bg-transparent outline-none"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors ${selected.includes(opt.value) ? 'bg-primary/5' : ''}`}
              >
                <Checkbox checked={selected.includes(opt.value)} readOnly />
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>}
          </div>
          <div className="p-2 border-t">
            <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function BroadcastComms() {
  // Scope
  const [scope, setScope] = useState('everyone');
  const [selectedTournamentIds, setSelectedTournamentIds] = useState([]);
  const [selectedLeagueIds, setSelectedLeagueIds] = useState([]);

  // Activity filters
  const [registrationStatuses, setRegistrationStatuses] = useState([]); // empty = all
  const [activityFilters, setActivityFilters] = useState([]);

  // Channel + content
  const [channel, setChannel] = useState('email');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // UI state
  const [openSections, setOpenSections] = useState({ scope: true, activity: false, channel: false });
  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  const [sendSuccess, setSendSuccess] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-all'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date' }),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues-all'],
    queryFn: () => leaguesApi.list({}, { sort: '-created_date' }),
  });

  const { data: allRegistrations = [] } = useQuery({
    queryKey: ['all-registrations'],
    queryFn: () => registrationsApi.list({}, { sort: '-created_date', limit: 5000 }),
  });

  const { data: allLeagueMembers = [] } = useQuery({
    queryKey: ['all-league-members'],
    queryFn: () => leagueMembersApi.filter({ active: true }),
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.list({}, { sort: '-created_date' }),
  });

  // ── Audience computation ──────────────────────────────────────────────────

  const audience = useMemo(() => {
    let regs = allRegistrations;
    let members = allLeagueMembers;

    // 1. Scope filter
    if (scope === 'tournament_only') {
      members = [];
    } else if (scope === 'league_only') {
      regs = [];
    } else if (scope === 'specific_tournaments') {
      regs = regs.filter(r => selectedTournamentIds.includes(r.tournament_id));
      members = [];
    } else if (scope === 'specific_leagues') {
      members = members.filter(m => selectedLeagueIds.includes(m.league_id));
      regs = [];
    }

    // 2. Registration status filter (only applies to tournament regs)
    if (registrationStatuses.length > 0) {
      regs = regs.filter(r => registrationStatuses.includes(r.status));
    }

    // 3. Activity filters
    if (activityFilters.includes('checked_in')) regs = regs.filter(r => r.checked_in);
    if (activityFilters.includes('not_checked_in')) regs = regs.filter(r => r.status === 'confirmed' && !r.checked_in);
    if (activityFilters.includes('paid')) regs = regs.filter(r => r.payment_status === 'paid');
    if (activityFilters.includes('not_paid')) regs = regs.filter(r => ['pending', 'not_required'].includes(r.payment_status) || !r.payment_status);
    if (activityFilters.includes('vip')) regs = regs.filter(r => r.vip);
    if (activityFilters.includes('waitlist_only')) regs = regs.filter(r => r.status === 'waitlisted');

    // Merge emails — deduplicate across tournament regs + league members
    const emailMap = new Map();

    regs.forEach(r => {
      if (r.player_email) {
        const existing = emailMap.get(r.player_email);
        if (!existing) {
          emailMap.set(r.player_email, { email: r.player_email, name: r.player_name, phone: r.player_phone, opt_in_sms: r.opt_in_text_messaging, sources: ['tournament'] });
        } else {
          if (!existing.sources.includes('tournament')) existing.sources.push('tournament');
        }
      }
    });

    members.forEach(m => {
      if (m.player_email) {
        const existing = emailMap.get(m.player_email);
        if (!existing) {
          emailMap.set(m.player_email, { email: m.player_email, name: m.player_name, phone: m.player_phone, opt_in_sms: false, sources: ['league'] });
        } else {
          if (!existing.sources.includes('league')) existing.sources.push('league');
        }
      }
    });

    const list = Array.from(emailMap.values());
    const smsEligible = list.filter(p => p.opt_in_sms && p.phone);
    return { list, smsEligible };
  }, [scope, selectedTournamentIds, selectedLeagueIds, registrationStatuses, activityFilters, allRegistrations, allLeagueMembers]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendEmailMutation = useMutation({
    mutationFn: (data) => callAction('sendBulkEmails', data),
  });

  const isSending = sendEmailMutation.isPending;

  const canSend = () => {
    if (audience.list.length === 0) return false;
    if (channel === 'email' || channel === 'both') {
      if (!emailSubject.trim() || !emailBody.trim()) return false;
    }
    if (channel === 'sms' || channel === 'both') {
      if (!smsMessage.trim() || audience.smsEligible.length === 0) return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (channel === 'email' || channel === 'both') {
      await sendEmailMutation.mutateAsync({
        template: { subject: emailSubject, body: emailBody },
        recipientEmails: audience.list.map(p => p.email),
        registrations: audience.list.map(p => ({ player_email: p.email, player_name: p.name })),
        broadcast: true,
      });
    }
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 5000);
  };

  const toggleActivity = (val) =>
    setActivityFilters(f => f.includes(val) ? f.filter(v => v !== val) : [...f, val]);

  const toggleStatus = (val) =>
    setRegistrationStatuses(f => f.includes(val) ? f.filter(v => v !== val) : [...f, val]);

  const [templateId, setTemplateId] = useState('');
  const handleTemplateSelect = (tid) => {
    setTemplateId(tid);
    const tpl = emailTemplates.find(t => t.id === tid);
    if (tpl) { setEmailSubject(tpl.subject); setEmailBody(tpl.body); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Broadcast Communications</h1>
        <p className="text-muted-foreground text-sm mt-1">Send a message to your entire community or a targeted segment.</p>
      </div>

      {/* ── Step 1: Audience ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Step 1: Choose your audience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Scope */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setScope(opt.value); setSelectedTournamentIds([]); setSelectedLeagueIds([]); }}
                  className={`text-left p-3 rounded-lg border text-sm transition-colors ${scope === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                >
                  <p className={`font-medium ${scope === opt.value ? 'text-primary' : ''}`}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Specific tournament picker */}
          {scope === 'specific_tournaments' && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Tournaments</p>
              <MultiSelect
                options={tournaments.map(t => ({ value: t.id, label: `${t.name} (${t.date || 'no date'})` }))}
                selected={selectedTournamentIds}
                onChange={setSelectedTournamentIds}
                placeholder="Pick tournaments…"
              />
            </div>
          )}

          {/* Specific league picker */}
          {scope === 'specific_leagues' && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Leagues</p>
              <MultiSelect
                options={leagues.map(l => ({ value: l.id, label: l.name }))}
                selected={selectedLeagueIds}
                onChange={setSelectedLeagueIds}
                placeholder="Pick leagues…"
              />
            </div>
          )}

          {/* Registration status filter — only for tournament scopes */}
          {(scope === 'everyone' || scope === 'tournament_only' || scope === 'specific_tournaments') && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Registration Status <span className="normal-case font-normal">(leave blank = all)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {REGISTRATION_STATUS_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => toggleStatus(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      registrationStatuses.includes(f.value)
                        ? `${f.color} border-current`
                        : 'border-border text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity filters — only for tournament scopes */}
          {(scope === 'everyone' || scope === 'tournament_only' || scope === 'specific_tournaments') && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity Criteria <span className="normal-case font-normal">(optional)</span></p>
              <div className="space-y-2">
                {ACTIVITY_FILTERS.map(f => (
                  <label key={f.value} className="flex items-start gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={activityFilters.includes(f.value)}
                      onCheckedChange={() => toggleActivity(f.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium leading-tight">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Audience preview pill */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${audience.list.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-muted/30'}`}>
            <Users className={`h-4 w-4 shrink-0 ${audience.list.length > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-semibold ${audience.list.length > 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
              {audience.list.length} unique recipient{audience.list.length !== 1 ? 's' : ''}
            </span>
            {audience.smsEligible.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">· {audience.smsEligible.length} SMS-eligible</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Step 2: Channel ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Step 2: Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'email', label: 'Email Only', icon: <Mail className="h-4 w-4" /> },
              { value: 'sms', label: 'Text Only', icon: <MessageSquare className="h-4 w-4" /> },
              { value: 'both', label: 'Email + Text', icon: <><Mail className="h-4 w-4" /><MessageSquare className="h-4 w-4" /></> },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setChannel(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-colors ${
                  channel === opt.value ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex gap-1">{opt.icon}</div>
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3: Content ─────────────────────────────────────────────────── */}
      {(channel === 'email' || channel === 'both') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Email Content</CardTitle>
              {emailTemplates.length > 0 && (
                <Select value={templateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="Load template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Subject…" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            <Textarea placeholder="Email body…" rows={8} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <span className="font-semibold">Variables: </span>{TEMPLATE_VARIABLES.join(', ')}
            </div>
          </CardContent>
        </Card>
      )}

      {(channel === 'sms' || channel === 'both') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> SMS Content</CardTitle>
            <CardDescription className="text-xs">{audience.smsEligible.length} of {audience.list.length} recipients have SMS opt-in</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea placeholder="Enter your text message…" rows={4} value={smsMessage} onChange={e => setSmsMessage(e.target.value)} maxLength={320} />
            <div className="text-xs text-muted-foreground mt-1">{smsMessage.length} / 320 characters</div>
          </CardContent>
        </Card>
      )}

      {/* ── Send ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-10">
        <Button onClick={handleSend} disabled={!canSend() || isSending} className="gap-2">
          <Send className="h-4 w-4" />
          {isSending
            ? 'Sending…'
            : `Send to ${audience.list.length} recipient${audience.list.length !== 1 ? 's' : ''}`}
        </Button>
        {sendSuccess && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Broadcast sent!
          </div>
        )}
      </div>
    </div>
  );
}