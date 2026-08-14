import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Send, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function LeagueBulkComms({ session, league, rsvps }) {
  const { toast } = useToast();

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  const attending = rsvps.filter((r) => r.status === 'yes');
  const attendingEmails = attending.map((r) => r.player_email);

  const sessionInfo = {
    id: league.id,
    name: league.name,
    date: format(new Date(session.date + 'T12:00:00'), 'MMM d, yyyy'),
    time: session.start_time || '',
    location: session.location || league.location || '',
  };

  const sendEmail = useMutation({
    mutationFn: () =>
      callAction('sendBulkEmails', {
        template: { subject: emailSubject, body: emailBody },
        tournament: sessionInfo,
        recipientEmails: attendingEmails,
        registrations: attending.map((r) => ({
          player_email: r.player_email,
          player_name: r.player_name,
        })),
        comm_log_id: '',
      }),
    onSuccess: (res) => {
      const sent = res?.sentCount ?? 0;
      const errors = res?.errorCount ?? 0;
      toast({
        title: `Email sent to ${sent} recipient${sent !== 1 ? 's' : ''}`,
        description: errors > 0 ? `${errors} failed` : undefined,
      });
      setEmailSubject('');
      setEmailBody('');
    },
    onError: (err) =>
      toast({ title: 'Email failed', description: err.message, variant: 'destructive' }),
  });

  const sendSMS = useMutation({
    mutationFn: () =>
      callAction('sendLeagueBulkSMS', {
        league_id: league.id,
        recipient_emails: attendingEmails,
        message: smsMessage,
      }),
    onSuccess: (res) => {
      const sent = res?.sent ?? 0;
      const failed = res?.failed ?? 0;
      toast({
        title: `SMS sent to ${sent} recipient${sent !== 1 ? 's' : ''}`,
        description: failed > 0 ? `${failed} failed` : undefined,
      });
      setSmsMessage('');
    },
    onError: (err) =>
      toast({ title: 'SMS failed', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Users className="h-4 w-4" />
        Sending to <strong className="text-slate-700">{attending.length}</strong> attending
        member{attending.length !== 1 ? 's' : ''}
      </div>

      {/* Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Attendees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Subject</label>
            <Input
              placeholder="Subject line"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Message</label>
            <Textarea
              placeholder="Write your message here..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Use <code className="bg-slate-100 px-1 rounded">{'{{player_name}}'}</code>,{' '}
              <code className="bg-slate-100 px-1 rounded">{'{{tournament_name}}'}</code>,{' '}
              <code className="bg-slate-100 px-1 rounded">{'{{location}}'}</code>
            </p>
            <Button
              onClick={() => sendEmail.mutate()}
              disabled={sendEmail.isPending || !emailSubject || !emailBody || attending.length === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendEmail.isPending ? 'Sending…' : 'Send Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> SMS Attendees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Message</label>
            <Textarea
              placeholder="Text message (160 chars recommended)..."
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              rows={3}
              maxLength={320}
              className="resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">{smsMessage.length} characters</p>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              Only members with phone numbers on file will receive SMS
            </Badge>
            <Button
              onClick={() => sendSMS.mutate()}
              disabled={sendSMS.isPending || !smsMessage || attending.length === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendSMS.isPending ? 'Sending…' : 'Send SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}