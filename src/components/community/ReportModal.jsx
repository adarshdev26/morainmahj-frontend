import React, { useState } from 'react';
import { contentReports as contentReportsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or self-promotion' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ open, onClose, currentUser, contentType, contentId, contentPreview, reportedUserId, reportedUserName }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await contentReportsApi.create({
      reporter_id: currentUser.id,
      reporter_email: currentUser.email,
      reported_user_id: reportedUserId,
      reported_user_name: reportedUserName,
      content_type: contentType,
      content_id: contentId,
      content_preview: contentPreview?.slice(0, 200),
      reason,
      details: details.trim() || undefined,
      status: 'pending',
    });
    setSubmitting(false);
    setReason('');
    setDetails('');
    onClose();
    toast.success('Report submitted. Our moderators will review it.');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" /> Report Content
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Why are you reporting this?</p>
          <div className="space-y-2">
            {REASONS.map(r => (
              <label key={r.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-primary"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
          <Textarea
            placeholder="Additional details (optional)…"
            value={details}
            onChange={e => setDetails(e.target.value)}
            className="text-sm min-h-[80px]"
          />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSubmit} disabled={!reason || submitting} className="gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Submit Report
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}