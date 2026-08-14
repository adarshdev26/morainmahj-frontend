import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { communicationLogs as communicationLogsApi, emailTemplates as emailTemplatesApi, registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Mail, Plus, Send, MessageSquare, Users, CheckCircle2, X, Clock, History, BarChart2, ChevronLeft, Zap } from 'lucide-react';
import { format } from 'date-fns';
import DeliveryReport from '@/components/communications/DeliveryReport';
import AutoEmailsTab from '@/components/communications/AutoEmailsTab';

const STANDARD_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome to Tournament',
    subject: 'Welcome to {{tournament_name}}',
    body: 'Hi {{player_name}},\n\nWelcome to {{tournament_name}}! We\'re excited to have you participate.\n\nTournament Details:\nDate: {{tournament_date}}\nLocation: {{location}}\n\nLooking forward to seeing you there!\n\nBest regards,\nTournament Director',
  },
  {
    id: 'reminder',
    name: 'Tournament Reminder',
    subject: 'Reminder: {{tournament_name}} is coming up',
    body: 'Hi {{player_name}},\n\nThis is a reminder that {{tournament_name}} is coming up soon!\n\nDate: {{tournament_date}}\nLocation: {{location}}\n\nPlease confirm your attendance if you haven\'t already.\n\nBest regards,\nTournament Director',
  },
  {
    id: 'day-before',
    name: 'Day Before Reminder',
    subject: 'See you tomorrow at {{tournament_name}}!',
    body: 'Hi {{player_name}},\n\nJust a reminder that {{tournament_name}} is happening tomorrow!\n\nTime: {{tournament_time}}\nLocation: {{location}}\n\nPlease arrive a few minutes early. We look forward to seeing you!\n\nBest regards,\nTournament Director',
  },
  {
    id: 'thank-you',
    name: 'Post-Tournament Thank You',
    subject: 'Thank you for participating in {{tournament_name}}',
    body: 'Hi {{player_name}},\n\nThank you for participating in {{tournament_name}}! We appreciate your participation and sportsmanship.\n\nFinal standings and results are available at [insert link].\n\nWe hope to see you at our next event!\n\nBest regards,\nTournament Director',
  },
];

const TEMPLATE_VARIABLES = ['{{player_name}}', '{{tournament_name}}', '{{tournament_date}}', '{{tournament_time}}', '{{location}}'];

const RECIPIENT_GROUPS = [
  { value: 'all', label: 'All Players', statuses: ['pending', 'confirmed', 'waitlisted', 'declined', 'cancelled'] },
  { value: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
  { value: 'waitlisted', label: 'Waitlisted', statuses: ['waitlisted'] },
  { value: 'pending', label: 'No Response', statuses: ['pending'] },
  { value: 'declined', label: 'Declined', statuses: ['declined'] },
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

export default function TournamentCommunications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [channel, setChannel] = useState('email');
  const [recipientGroup, setRecipientGroup] = useState('confirmed');
  const [templateId, setTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('send');
  const [lastCommLogId, setLastCommLogId] = useState(null);

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.list().then(ts => ts.find(t => t.id === id)),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => registrationsApi.filter({ tournament_id: id }),
    enabled: !!id,
  });

  const { data: customTemplates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.list({}, { sort: '-created_date' }),
  });

  const { data: commLogs = [] } = useQuery({
    queryKey: ['comm-logs', id],
    queryFn: () => communicationLogsApi.filter({ tournament_id: id }, '-created_date'),
    enabled: !!id,
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => communicationLogsApi.create(data),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['comm-logs', id] });
      setLastCommLogId(record.id);
    },
  });

  const allTemplates = [
    ...STANDARD_TEMPLATES.map(t => ({ ...t, type: 'standard' })),
    ...customTemplates.map(t => ({ ...t, type: 'custom' })),
  ];

  const createTemplateMutation = useMutation({
    mutationFn: (data) => emailTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setShowSaveTemplate(false);
      setSaveTemplateName('');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: (data) => callAction('sendBulkEmails', data),
  });

  const sendSMSMutation = useMutation({
    mutationFn: (data) => callAction('sendBulkSMS', data),
  });

  const handleTemplateSelect = (tid) => {
    setTemplateId(tid);
    const tpl = allTemplates.find(t => t.id === tid);
    if (tpl) { setEmailSubject(tpl.subject); setEmailBody(tpl.body); }
  };

  const clearTemplate = () => { setTemplateId(''); setEmailSubject(''); setEmailBody(''); };

  const selectedGroup = RECIPIENT_GROUPS.find(g => g.value === recipientGroup);
  const targetRegistrations = registrations.filter(r => selectedGroup?.statuses.includes(r.status));
  const smsEligible = targetRegistrations.filter(r => r.opt_in_text_messaging && r.player_phone);
  const isSending = sendEmailMutation.isPending || sendSMSMutation.isPending;

  const canSend = () => {
    if (targetRegistrations.length === 0) return false;
    const hasEmail = emailSubject.trim().length > 0 && emailBody.trim().length > 0;
    if (channel === 'email') return hasEmail;
    if (channel === 'sms') return smsMessage.trim().length > 0 && smsEligible.length > 0;
    if (channel === 'both') return hasEmail && smsMessage.trim().length > 0;
    return false;
  };

  const handleSend = async () => {
    // Create the log first so we have the ID for delivery records
    let newLogId = null;
    if (channel === 'email' || channel === 'both') {
      const logRecord = await communicationLogsApi.create({
        tournament_id: id,
        channel,
        recipient_group: selectedGroup?.label || recipientGroup,
        recipient_count: targetRegistrations.length,
        subject: emailSubject || '',
        body: emailBody || '',
        sms_message: smsMessage || '',
        status: 'sent',
      });
      newLogId = logRecord.id;
      setLastCommLogId(newLogId);
      queryClient.invalidateQueries({ queryKey: ['comm-logs', id] });
    }

    if (channel === 'email' || channel === 'both') {
      if (emailSubject && emailBody && targetRegistrations.length > 0) {
        await sendEmailMutation.mutateAsync({
          template: { subject: emailSubject, body: emailBody },
          tournament,
          recipientEmails: targetRegistrations.map(r => r.player_email),
          registrations: targetRegistrations,
          comm_log_id: newLogId,
        });
      }
    }
    if (channel === 'sms' || channel === 'both') {
      if (smsMessage.trim() && smsEligible.length > 0) {
        await sendSMSMutation.mutateAsync({
          tournament_id: id,
          recipient_player_ids: smsEligible.map(r => r.player_id),
          message: smsMessage,
        });
      }
    }
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 4000);
    // Switch to delivery report
    setActiveTab('report');
  };

  const channelLabel = { email: 'Email', sms: 'SMS', both: 'Email + SMS' };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="outline" onClick={() => navigate(`/admin/tournament/${id}`)} className="gap-2">
           <ChevronLeft className="h-4 w-4" /> Back to Tournament
         </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Manage Tournament Communications</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tournament?.name}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="send" className="gap-2"><Send className="h-4 w-4" /> Send</TabsTrigger>
          <TabsTrigger value="report" className="gap-2"><BarChart2 className="h-4 w-4" /> Delivery Report</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="auto" className="gap-2"><Zap className="h-4 w-4" /> Auto-Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
      <div className="space-y-5 max-w-2xl">
        {/* Step 1: Recipients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Step 1: Who are you sending to?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {RECIPIENT_GROUPS.map(group => {
                const count = registrations.filter(r => group.statuses.includes(r.status)).length;
                const active = recipientGroup === group.value;
                return (
                  <button
                    key={group.value}
                    onClick={() => setRecipientGroup(group.value)}
                    className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                      active ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div>{group.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{count} player{count !== 1 ? 's' : ''}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Channel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4" /> Step 2: How do you want to send it?
            </CardTitle>
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

        {/* Step 3: Email Content */}
        {(channel === 'email' || channel === 'both') && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Content
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={templateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Load a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.type === 'standard' ? '(Standard)' : '(Custom)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templateId && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={clearTemplate}>
                      <X className="h-3 w-3" /> Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input placeholder="Email subject..." value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                <Textarea placeholder="Email body..." rows={8} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <span className="font-semibold">Variables: </span>{TEMPLATE_VARIABLES.join(', ')}
              </div>
              {!showSaveTemplate ? (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowSaveTemplate(true)} disabled={!emailSubject || !emailBody}>
                  <Plus className="h-3 w-3" /> Save as Template
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input placeholder="Template name..." className="h-8 text-sm" value={saveTemplateName} onChange={e => setSaveTemplateName(e.target.value)} />
                  <Button size="sm" onClick={() => createTemplateMutation.mutate({ name: saveTemplateName, subject: emailSubject, body: emailBody, type: 'custom', variables: TEMPLATE_VARIABLES })} disabled={createTemplateMutation.isPending || !saveTemplateName.trim()}>
                    {createTemplateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSaveTemplate(false); setSaveTemplateName(''); }}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SMS Content */}
        {(channel === 'sms' || channel === 'both') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> SMS Content
              </CardTitle>
              <CardDescription className="text-xs">
                {smsEligible.length} of {targetRegistrations.length} selected players have SMS opt-in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Enter your text message..." rows={4} value={smsMessage} onChange={e => setSmsMessage(e.target.value)} maxLength={320} />
              <div className="text-xs text-muted-foreground mt-1">{smsMessage.length} / 320 characters</div>
            </CardContent>
          </Card>
        )}

        {/* Send Button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSend} disabled={!canSend() || isSending} className="gap-2">
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : `Send to ${targetRegistrations.length} player${targetRegistrations.length !== 1 ? 's' : ''}`}
          </Button>
          {sendSuccess && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Sent successfully!
            </div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="report">
          <DeliveryReport tournamentId={id} commLogId={lastCommLogId} />
        </TabsContent>

        <TabsContent value="auto">
          <AutoEmailsTab />
        </TabsContent>

        <TabsContent value="history">
           {commLogs.length === 0 ? (
             <div className="space-y-3 max-w-2xl">
               <Card className="border-dashed opacity-60">
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between gap-4">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant="outline" className="text-xs">Email</Badge>
                         <span className="text-xs text-muted-foreground">→ Confirmed</span>
                         <span className="text-xs text-muted-foreground">· 24 recipients</span>
                       </div>
                       <p className="font-medium text-sm truncate">Tournament Reminder - April 20</p>
                       <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Hi {'{{player_name}}'}, reminder that you are registered for the Spring Bridge Tournament on April 20, 2026.</p>
                     </div>
                     <div className="text-xs text-muted-foreground whitespace-nowrap text-right">
                       <div>Apr 10, 2026</div>
                       <div>2:30 pm</div>
                       <div className="mt-1 opacity-60">admin@tournament.com</div>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               <Card className="border-dashed opacity-60">
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between gap-4">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant="outline" className="text-xs">Email + Text</Badge>
                         <span className="text-xs text-muted-foreground">→ All Players</span>
                         <span className="text-xs text-muted-foreground">· 32 recipients</span>
                       </div>
                       <p className="font-medium text-sm truncate">Welcome to the Spring Bridge Tournament</p>
                       <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Welcome to the Spring Bridge Tournament! We're excited to have you participate. Tournament details, date and location included.</p>
                     </div>
                     <div className="text-xs text-muted-foreground whitespace-nowrap text-right">
                       <div>Mar 28, 2026</div>
                       <div>10:15 am</div>
                       <div className="mt-1 opacity-60">admin@tournament.com</div>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               {commLogs.length > 0 && (
                 <>
                   <div className="h-px bg-border my-2"></div>
                   <p className="text-sm text-muted-foreground font-medium">Actual communications:</p>
                 </>
               )}
             </div>
           ) : null}
           {commLogs.length > 0 && (
             <div className="space-y-3 max-w-2xl">
               {commLogs.map(log => (
                 <Card key={log.id}>
                   <CardContent className="p-4">
                     <div className="flex items-start justify-between gap-4">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <Badge variant="outline" className="text-xs">{channelLabel[log.channel] || log.channel}</Badge>
                           <span className="text-xs text-muted-foreground">→ {log.recipient_group}</span>
                           <span className="text-xs text-muted-foreground">· {log.recipient_count} recipient{log.recipient_count !== 1 ? 's' : ''}</span>
                         </div>
                         {log.subject && <p className="font-medium text-sm truncate">{log.subject}</p>}
                         {log.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.body}</p>}
                         {log.sms_message && !log.subject && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.sms_message}</p>}
                       </div>
                       <div className="text-xs text-muted-foreground whitespace-nowrap text-right">
                         <div>{format(new Date(log.created_date), 'MMM d, yyyy')}</div>
                         <div>{format(new Date(log.created_date), 'h:mm a')}</div>
                         {log.created_by && <div className="mt-1 opacity-60">{log.created_by}</div>}
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
         </TabsContent>
      </Tabs>
    </div>
  );
}