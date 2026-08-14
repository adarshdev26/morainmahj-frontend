import React, { useState } from 'react';
import { sendEmail } from '@/services/integrationsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Send, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PlayerPicker from '@/components/shared/PlayerPicker';

export default function CourseInviteSection({ course, courseId }) {
  const { toast } = useToast();
  const [inviteEmails, setInviteEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const registerUrl = `${window.location.origin}/course-register?courseId=${courseId}`;

  const sendInviteEmails = async () => {
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));

    if (emails.length === 0) {
      toast({ title: 'Enter at least one email address', variant: 'destructive' });
      return;
    }

    setSending(true);
    let sent = 0;
    for (const email of emails) {
      try {
        const subject = `You're invited to join ${course?.name || 'this course'}`;
        const body = `
<div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #faf9f7;">
  <h1 style="font-size: 26px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${course?.name || 'Course Invitation'}</h1>
  <p style="color: #64748b; font-size: 14px; margin-top: 0;">You've been invited to enroll!</p>

  ${course?.description ? `<p style="font-size: 15px; color: #334155;">${course.description}</p>` : ''}

  <div style="background: #fff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
    ${course?.start_date ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>📅 Starts:</strong> ${new Date(course.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
    ${course?.location ? `<p style="margin: 0; font-size: 15px;"><strong>📍 Location:</strong> ${course.location}</p>` : ''}
  </div>

  <p style="font-size: 15px; color: #334155;">Click below to register and secure your spot.</p>

  <a href="${registerUrl}" style="display: inline-block; background: #1e293b; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: bold; margin: 16px 0;">Register for the Course →</a>

  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Questions? Reply to this email to reach the instructor.</p>
</div>
        `.trim();

        await sendEmail({ to: email, subject, body, from_name: course?.name });
        sent++;
      } catch (err) {
        console.error('Failed to send to', email, err);
      }
    }
    setSending(false);
    setInviteEmails('');
    toast({ title: `Invitation${sent !== 1 ? 's' : ''} sent to ${sent} email${sent !== 1 ? 's' : ''}` });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Send Invitations by Email</CardTitle>
        <p className="text-sm text-slate-400">Pull players from your repository and invite them to enroll in this course.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Email addresses</Label>
          <textarea
            className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y"
            placeholder="Enter email addresses, one per line or comma-separated"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" onClick={sendInviteEmails} disabled={sending || !inviteEmails.trim()}>
            <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Invitations'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setPickerOpen(true)}>
            <Users className="h-4 w-4" /> Browse Player Repository
          </Button>
        </div>
      </CardContent>

      <PlayerPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelected={(picked) => {
          const emails = picked.map((p) => p.email).filter(Boolean);
          if (emails.length === 0) return;
          setInviteEmails((prev) => {
            const existing = prev.split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
            const merged = [...existing];
            emails.forEach((e) => { if (!merged.includes(e.toLowerCase())) merged.push(e); });
            return merged.join('\n');
          });
          toast({ title: `${emails.length} player${emails.length !== 1 ? 's' : ''} added to invitation list` });
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}