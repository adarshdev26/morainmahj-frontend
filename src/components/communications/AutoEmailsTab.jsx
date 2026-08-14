import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap } from 'lucide-react';

const AUTO_EMAILS = [
  {
    trigger: 'Registration Confirmed',
    when: 'When a player\'s status is set to "Confirmed"',
    subject: 'You\'re confirmed for [Tournament Name]!',
    includes: ['Player name', 'Tournament name', 'Date & location', 'Special commitments (set/permanent east)'],
    status: 'active',
  },
  {
    trigger: 'Added to Waitlist',
    when: 'When a player\'s status is set to "Waitlisted"',
    subject: 'You\'re on the waitlist for [Tournament Name]',
    includes: ['Player name', 'Tournament name', 'Date & location', 'Waitlist position'],
    status: 'active',
  },
  {
    trigger: 'Promoted from Waitlist',
    when: 'When a waitlisted player is moved to pending (spot opens up)',
    subject: 'You\'re off the waitlist! — [Tournament Name]',
    includes: ['Player name', 'Tournament name', 'Date & location', 'Action required (confirm/pay)', 'Deadline reminder'],
    status: 'active',
  },
  {
    trigger: 'Registration Declined',
    when: 'When a player\'s status is set to "Declined"',
    subject: 'Registration update for [Tournament Name]',
    includes: ['Player name', 'Tournament name', 'Date & location'],
    status: 'active',
  },
  {
    trigger: 'Registration Cancelled',
    when: 'When a player\'s status is set to "Cancelled"',
    subject: 'Your registration for [Tournament Name] has been cancelled',
    includes: ['Player name', 'Tournament name', 'Date & location'],
    status: 'active',
  },
  {
    trigger: 'Tournament Reminder',
    when: 'Sent at the date/time you configure in Tournament Setup → Registration Settings',
    subject: 'Reminder: [Tournament Name] is coming up!',
    includes: ['Player name', 'Tournament name', 'Date & location', 'Encouragement to check the app'],
    status: 'active',
  },
  {
    trigger: 'Table Assignment',
    when: 'When a player is assigned to a table for a round',
    subject: 'Your table assignment for [Tournament Name]',
    includes: ['Player name', 'Table number', 'Seat (East/South/West/North)', 'Round number'],
    status: 'active',
  },
];

export default function AutoEmailsTab() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm text-emerald-800">
          These emails are sent <strong>automatically</strong> when the triggering event happens — no action needed from you.
        </p>
      </div>

      {AUTO_EMAILS.map((email) => (
        <Card key={email.trigger} className="border border-slate-200">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-slate-800">{email.trigger}</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">{email.when}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Subject: </span>
              <span className="text-slate-700 italic">{email.subject}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Includes: </span>
              <span className="text-slate-600">{email.includes.join(' · ')}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground pt-2">
        To customize the content of auto-emails, contact your app administrator. All emails are sent from <strong>Morain Mahj</strong>.
      </p>
    </div>
  );
}