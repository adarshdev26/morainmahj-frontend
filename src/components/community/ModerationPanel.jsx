import React, { useState } from 'react';
import { contentReports as contentReportsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, Shield, Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-100 text-blue-700 border-blue-200',
  actioned: 'bg-red-100 text-red-700 border-red-200',
  dismissed: 'bg-muted text-muted-foreground',
};

export default function ModerationPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['content-reports', filter],
    queryFn: () => contentReportsApi.filter(filter === 'all' ? {} : { status: filter }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, admin_notes }) =>
      contentReportsApi.update(id, {
        status,
        admin_notes,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      toast.success('Report updated.');
    },
  });

  const filters = ['pending', 'reviewed', 'actioned', 'dismissed', 'all'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Content Moderation</h3>
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-xl">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No {filter === 'all' ? '' : filter} reports.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} onUpdate={updateMutation.mutate} isPending={updateMutation.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onUpdate, isPending }) {
  const [notes, setNotes] = useState(report.admin_notes || '');

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs border ${STATUS_COLORS[report.status]}`}>{report.status}</Badge>
            <span className="text-xs text-muted-foreground capitalize">{report.content_type} reported</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(report.created_date), { addSuffix: true })}</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            Reason: <span className="capitalize">{report.reason?.replace('_', ' ')}</span>
          </p>
          {report.reported_user_name && (
            <p className="text-xs text-muted-foreground">Reported user: <strong>{report.reported_user_name}</strong></p>
          )}
          {report.content_preview && (
            <p className="text-xs bg-muted/50 rounded-lg px-3 py-2 text-muted-foreground italic">"{report.content_preview}"</p>
          )}
          {report.details && (
            <p className="text-xs text-foreground">Details: {report.details}</p>
          )}
          <p className="text-xs text-muted-foreground">Reported by: {report.reporter_email}</p>
        </div>
      </div>

      {report.status === 'pending' && (
        <div className="space-y-2 pt-1 border-t border-border/60">
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Admin notes (optional)…"
            className="w-full bg-muted/40 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary/30"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
              disabled={isPending}
              onClick={() => onUpdate({ id: report.id, status: 'actioned', admin_notes: notes })}
            >
              <XCircle className="h-3.5 w-3.5" /> Take Action
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              disabled={isPending}
              onClick={() => onUpdate({ id: report.id, status: 'dismissed', admin_notes: notes })}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Dismiss
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              disabled={isPending}
              onClick={() => onUpdate({ id: report.id, status: 'reviewed', admin_notes: notes })}
            >
              <Eye className="h-3.5 w-3.5" /> Mark Reviewed
            </Button>
          </div>
        </div>
      )}
      {report.admin_notes && report.status !== 'pending' && (
        <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">Notes: {report.admin_notes}</p>
      )}
    </div>
  );
}