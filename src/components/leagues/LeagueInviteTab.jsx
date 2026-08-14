import React, { useState } from 'react';
import { sendEmail } from '@/services/integrationsApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link2, Mail, Copy, CheckCircle2, Plus, X, Send, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { appParams } from '@/lib/app-params';
import PlayerPicker from '@/components/shared/PlayerPicker';

export default function LeagueInviteTab({ league, members }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const joinUrl = `${(appParams.appBaseUrl || window.location.origin).replace(/\/$/, '')}/league-join?league=${league.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInviteEmails = async () => {
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));

    if (emails.length === 0) {
      toast({ title: 'Enter at least one email address', variant: 'destructive' });
      return;
    }

    setSending(true);
    let sent = 0;
    for (const email of emails) {
      try {
        const subject = `You're invited to join ${league.name}`;
        const body = `
<div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #faf9f7;">
  <h1 style="font-size: 26px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${league.name}</h1>
  <p style="color: #64748b; font-size: 14px; margin-top: 0;">You've been invited to join!</p>

  ${league.description ? `<p style="font-size: 15px; color: #334155;">${league.description}</p>` : ''}

  <div style="background: #fff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
    ${league.day_of_week != null ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>📅 Day:</strong> ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][league.day_of_week]}s</p>` : ''}
    ${league.start_time ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>⏰ Time:</strong> ${league.start_time}${league.end_time ? '–' + league.end_time : ''}</p>` : ''}
    ${league.location ? `<p style="margin: 0; font-size: 15px;"><strong>📍 Location:</strong> ${league.location}</p>` : ''}
  </div>

  <p style="font-size: 15px; color: #334155;">Click below to sign up and join the roster. You'll receive an email before each session to RSVP.</p>

  <a href="${joinUrl}" style="display: inline-block; background: #1e293b; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: bold; margin: 16px 0;">Join the League →</a>

  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Questions? Reply to this email to reach the organizer.</p>
</div>
        `.trim();

        await sendEmail({ to: email, subject, body, from_name: league.name });
        sent++;
      } catch (err) {
        console.error('Failed to send to', email, err);
      }
    }
    setSending(false);
    setInviteEmails('');
    toast({ title: `Invitation${sent !== 1 ? 's' : ''} sent to ${sent} email${sent !== 1 ? 's' : ''}` });
  };

  const activeMembers = members.filter(m => m.active !== false);
  const isFull = league.member_cap && activeMembers.length >= league.member_cap;

  return (
    <div className="space-y-5">
      {/* Share link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Public Sign-Up Link</CardTitle>
          <p className="text-sm text-slate-400">Share this link so people can sign themselves up to the league roster.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isFull && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              ⚠️ League is full ({activeMembers.length}/{league.member_cap} members). New sign-ups will be rejected until a spot opens.
            </div>
          )}
          <div className="flex gap-2">
            <Input readOnly value={joinUrl} className="font-mono text-xs bg-slate-50" />
            <Button variant="outline" className="shrink-0 gap-2" onClick={copyLink}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{activeMembers.length} current member{activeMembers.length !== 1 ? 's' : ''}</span>
            {league.member_cap && <span>· Cap: {league.member_cap}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Email invites */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Send Invitations by Email</CardTitle>
          <p className="text-sm text-slate-400">Enter email addresses and we'll send them a personal invitation with the sign-up link.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Email addresses</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y"
              placeholder="Enter email addresses, one per line or comma-separated"
              value={inviteEmails}
              onChange={e => setInviteEmails(e.target.value)}
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
      </Card>

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
    </div>
  );
}