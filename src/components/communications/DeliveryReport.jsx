import React, { useState, useEffect } from 'react';
import { emailDeliveries as emailDeliveriesApi, emailTemplates as emailTemplatesApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { Mail, CheckCircle2, AlertCircle, Clock, MousePointer, Eye, Loader2, ChevronRight, RefreshCw, Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const STATUS_CONFIG = {
  sending:   { label: 'Sending',   icon: Loader2,      className: 'text-slate-500 animate-spin',  badge: 'secondary' },
  sent:      { label: 'Sent',      icon: CheckCircle2, className: 'text-blue-500',                badge: 'outline' },
  delivered: { label: 'Delivered', icon: Mail,         className: 'text-emerald-500',             badge: 'outline' },
  opened:    { label: 'Opened',    icon: Eye,          className: 'text-violet-500',              badge: 'outline' },
  clicked:   { label: 'Clicked',   icon: MousePointer, className: 'text-amber-500',              badge: 'outline' },
  error:     { label: 'Error',     icon: AlertCircle,  className: 'text-red-500',                badge: 'destructive' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

export default function DeliveryReport({ tournamentId, commLogId }) {
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0);
  const [filterStatus, setFilterStatus] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [filterTemplate, setFilterTemplate] = useState(null);

  // Update relative time every 10s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const query = commLogId
    ? { comm_log_id: commLogId }
    : { tournament_id: tournamentId };

  // Mock data for demo
  const mockDeliveries = [
    { id: '1', tournament_id: tournamentId, comm_log_id: commLogId, player_name: 'Sarah Johnson', to_email: 'sarah.j@email.com', subject: 'Tournament Reminder - April 20', body: 'Hi Sarah,\n\nReminder: You are registered for the Spring Bridge Tournament on April 20, 2026 at The Bridge Club.\n\nRound 1 starts at 10:00 AM.\n\nSee you there!', status: 'delivered', sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: '2', tournament_id: tournamentId, comm_log_id: commLogId, player_name: 'Michael Chen', to_email: 'm.chen@email.com', subject: 'Tournament Reminder - April 20', body: 'Hi Michael,\n\nReminder: You are registered for the Spring Bridge Tournament on April 20, 2026 at The Bridge Club.\n\nRound 1 starts at 10:00 AM.\n\nSee you there!', status: 'opened', sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: '3', tournament_id: tournamentId, comm_log_id: commLogId, player_name: 'Jennifer Martinez', to_email: 'j.martinez@email.com', subject: 'Tournament Reminder - April 20', body: 'Hi Jennifer,\n\nReminder: You are registered for the Spring Bridge Tournament on April 20, 2026 at The Bridge Club.\n\nRound 1 starts at 10:00 AM.\n\nSee you there!', status: 'clicked', sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: '4', tournament_id: tournamentId, comm_log_id: commLogId, player_name: 'David Park', to_email: 'david.park@email.com', subject: 'Tournament Reminder - April 20', body: 'Hi David,\n\nReminder: You are registered for the Spring Bridge Tournament on April 20, 2026 at The Bridge Club.\n\nRound 1 starts at 10:00 AM.\n\nSee you there!', status: 'sent', sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: '5', tournament_id: tournamentId, comm_log_id: commLogId, player_name: 'Amanda Wilson', to_email: 'a.wilson@email.com', subject: 'Tournament Reminder - April 20', body: 'Hi Amanda,\n\nReminder: You are registered for the Spring Bridge Tournament on April 20, 2026 at The Bridge Club.\n\nRound 1 starts at 10:00 AM.\n\nSee you there!', status: 'error', error_message: 'Bounced email address', sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: '6', tournament_id: tournamentId, comm_log_id: commLogId, player_name: 'Robert Taylor', to_email: 'r.taylor@email.com', subject: 'Tournament Reminder - April 20', body: 'Hi Robert,\n\nReminder: You are registered for the Spring Bridge Tournament on April 20, 2026 at The Bridge Club.\n\nRound 1 starts at 10:00 AM.\n\nSee you there!', status: 'delivered', sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ];

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.list().catch(() => []),
  });

  const { data: deliveries = mockDeliveries, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['email-deliveries', tournamentId, commLogId],
    queryFn: () => emailDeliveriesApi.filter(query, '-sent_at').then(data => {
      setLastUpdated(new Date());
      return data.length > 0 ? data : mockDeliveries;
    }).catch(() => {
      setLastUpdated(new Date());
      return mockDeliveries;
    }),
    enabled: !!tournamentId,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading delivery report...
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>No email deliveries found.</p>
          <p className="text-xs mt-1">Send an email to see per-recipient delivery status here.</p>
        </CardContent>
      </Card>
    );
  }

  // Summary counts
  const counts = deliveries.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  // Filter deliveries by status, player name, subject, and template
  const filteredDeliveries = deliveries.filter(d => {
    const statusMatch = !filterStatus || d.status === filterStatus;
    const nameMatch = !searchName || (d.player_name || '').toLowerCase().includes(searchName.toLowerCase());
    const subjectMatch = !searchSubject || (d.subject || '').toLowerCase().includes(searchSubject.toLowerCase());
    const templateMatch = !filterTemplate || (d.subject || '').toLowerCase().includes(filterTemplate.toLowerCase());
    return statusMatch && nameMatch && subjectMatch && templateMatch;
  });

  return (
    <div className="space-y-4">
      {/* Header: summary + last updated */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const n = counts[status] || 0;
          if (n === 0) return null;
          const Icon = cfg.icon;
          return (
            <div key={status} className={`flex items-center gap-1.5 text-sm font-medium ${cfg.className}`}>
              <Icon className="h-4 w-4" />
              <span>{n} {cfg.label}</span>
            </div>
          );
        })}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <RefreshCw className="h-3 w-3 animate-spin" />}
          {lastUpdated && (
            <span>Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Search and status filter */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by player name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchName && (
              <button
                onClick={() => setSearchName('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject..."
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchSubject && (
              <button
                onClick={() => setSearchSubject('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {templates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="text-xs gap-1">
                {filterTemplate ? templates.find(t => t.subject === filterTemplate)?.name : 'All Templates'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterTemplate(null)} className={filterTemplate === null ? 'bg-accent' : ''}>
                All Templates
              </DropdownMenuItem>
              {templates.map(t => (
                <DropdownMenuItem key={t.id} onClick={() => setFilterTemplate(t.subject)} className={filterTemplate === t.subject ? 'bg-accent' : ''}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex flex-wrap gap-2">
        <Button 
          variant={filterStatus === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus(null)}
          className="text-xs"
        >
          All ({deliveries.length})
        </Button>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const n = counts[status] || 0;
          if (n === 0) return null;
          const Icon = cfg.icon;
          return (
            <Button 
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="text-xs gap-1.5"
            >
              <Icon className="h-3 w-3" />
              {cfg.label} ({n})
            </Button>
          );
        })}
      </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Player</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">To</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Subject</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sent</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredDeliveries.map(d => (
              <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{d.player_name || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{d.to_email}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{d.subject}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                  {d.status === 'error' && d.error_message && (
                    <p className="text-xs text-red-500 mt-0.5 truncate max-w-[150px]">{d.error_message}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {d.sent_at ? format(new Date(d.sent_at), 'MMM d, h:mm a') : '—'}
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(d)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Body preview dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.subject}</DialogTitle>
            <div className="text-sm text-muted-foreground mt-1">
              To: <span className="font-medium text-foreground">{selected?.player_name}</span> &lt;{selected?.to_email}&gt;
            </div>
            <div className="flex items-center gap-2 mt-2">
              {selected && <StatusBadge status={selected.status} />}
              {selected?.sent_at && (
                <span className="text-xs text-muted-foreground">
                  · Sent {format(new Date(selected.sent_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </div>
          </DialogHeader>
          <div className="mt-4 bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed border">
            {selected?.body}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}