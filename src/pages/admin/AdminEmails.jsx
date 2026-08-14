import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { emailTemplates as emailTemplatesApi, registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import TournamentSelector from '@/components/shared/TournamentSelector';
import { Mail, Plus, Pencil, Trash2, Send, MessageSquare, Users, CheckCircle2, ExternalLink, X } from 'lucide-react';

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

const TEMPLATE_VARIABLES = [
  '{{player_name}}',
  '{{tournament_name}}',
  '{{tournament_date}}',
  '{{tournament_time}}',
  '{{location}}',
];

const RECIPIENT_GROUPS = [
  { value: 'all', label: 'All Players', statuses: ['pending', 'confirmed', 'waitlisted', 'declined', 'cancelled'] },
  { value: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
  { value: 'waitlisted', label: 'Waitlisted', statuses: ['waitlisted'] },
  { value: 'pending', label: 'No Response', statuses: ['pending'] },
  { value: 'declined', label: 'Declined', statuses: ['declined'] },
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

export default function AdminEmails() {
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '' });

  // Unified send state
  const [activeTab, setActiveTab] = useState('send');
  const [channel, setChannel] = useState('email'); // 'email' | 'sms' | 'both'
  const [recipientGroup, setRecipientGroup] = useState('confirmed');

  const [templateId, setTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const tournament = tournaments.find(t => t.id === selectedTournament);

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', selectedTournament],
    queryFn: () => registrationsApi.filter({ tournament_id: selectedTournament }),
    enabled: !!selectedTournament,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.list({}, { sort: '-created_date' }),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => emailTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setNewTemplate({ name: '', subject: '', body: '' });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => emailTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setEditingTemplate(null);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => emailTemplatesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (data) => callAction('sendBulkEmails', data),
  });

  const sendSMSMutation = useMutation({
    mutationFn: (data) => callAction('sendBulkSMS', data),
  });

  const allTemplates = [
    ...STANDARD_TEMPLATES.map(t => ({ ...t, type: 'standard' })),
    ...templates.map(t => ({ ...t, type: 'custom' })),
  ];

  const handleTemplateSelect = (id) => {
    setTemplateId(id);
    const tpl = allTemplates.find(t => t.id === id);
    if (tpl) {
      setEmailSubject(tpl.subject);
      setEmailBody(tpl.body);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!saveTemplateName.trim() || !emailSubject || !emailBody) return;
    createTemplateMutation.mutate(
      { name: saveTemplateName, subject: emailSubject, body: emailBody, type: 'custom', variables: TEMPLATE_VARIABLES },
      {
        onSuccess: () => {
          setShowSaveTemplate(false);
          setSaveTemplateName('');
        },
      }
    );
  };

  const selectedGroup = RECIPIENT_GROUPS.find(g => g.value === recipientGroup);
  const targetRegistrations = registrations.filter(r => selectedGroup?.statuses.includes(r.status));
  const smsEligible = targetRegistrations.filter(r => r.opt_in_text_messaging && r.player_phone);

  const isSending = sendEmailMutation.isPending || sendSMSMutation.isPending;

  const handleSend = async () => {
    const emailRegs = targetRegistrations;
    const smsRegs = smsEligible;

    if (channel === 'email' || channel === 'both') {
      if (emailSubject && emailBody && emailRegs.length > 0) {
        await sendEmailMutation.mutateAsync({
          template: { subject: emailSubject, body: emailBody },
          tournament,
          recipientEmails: emailRegs.map(r => r.player_email),
          registrations: emailRegs,
        });
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (smsMessage.trim() && smsRegs.length > 0) {
        await sendSMSMutation.mutateAsync({
          tournament_id: selectedTournament,
          recipient_player_ids: smsRegs.map(r => r.player_id),
          message: smsMessage,
        });
      }
    }

    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 4000);
  };

  const canSend = () => {
    if (!selectedTournament || targetRegistrations.length === 0) return false;
    const hasEmail = emailSubject.trim().length > 0 && emailBody.trim().length > 0;
    if (channel === 'email') return hasEmail;
    if (channel === 'sms') return smsMessage.trim().length > 0 && smsEligible.length > 0;
    if (channel === 'both') return hasEmail && smsMessage.trim().length > 0;
    return false;
  };

  return (
    <div>
      <PageHeader
        title="Communications"
        subtitle="Send emails and SMS to tournament players"
      />

      <div className="mb-6">
        <label className="text-sm font-medium">Select Tournament</label>
        <TournamentSelector
          tournaments={tournaments}
          selectedId={selectedTournament}
          onSelect={setSelectedTournament}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Send Communication</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        {/* === SEND COMMUNICATION === */}
        <TabsContent value="send">
          {!selectedTournament ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a tournament above to get started
              </CardContent>
            </Card>
          ) : (
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
                            active
                              ? 'border-primary bg-primary/5 text-primary font-medium'
                              : 'border-border hover:bg-muted'
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
                          channel === opt.value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border hover:bg-muted'
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
                        <button
                          onClick={() => setActiveTab('templates')}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Manage Templates
                        </button>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => { setTemplateId(''); setEmailSubject(''); setEmailBody(''); }}
                          >
                            <X className="h-3 w-3" /> Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                      <Input
                        placeholder="Email subject..."
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                      <Textarea
                        placeholder="Email body..."
                        rows={8}
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <span className="font-semibold">Variables: </span>
                      {TEMPLATE_VARIABLES.join(', ')}
                    </div>
                    {/* Save as template */}
                    {!showSaveTemplate ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => setShowSaveTemplate(true)}
                        disabled={!emailSubject || !emailBody}
                      >
                        <Plus className="h-3 w-3" /> Save as Template
                      </Button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Template name..."
                          className="h-8 text-sm"
                          value={saveTemplateName}
                          onChange={e => setSaveTemplateName(e.target.value)}
                        />
                        <Button size="sm" onClick={handleSaveAsTemplate} disabled={createTemplateMutation.isPending || !saveTemplateName.trim()}>
                          {createTemplateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowSaveTemplate(false); setSaveTemplateName(''); }}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
                    <Textarea
                      placeholder="Enter your text message..."
                      rows={4}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      maxLength={320}
                    />
                    <div className="text-xs text-muted-foreground mt-1">{smsMessage.length} / 320 characters</div>
                  </CardContent>
                </Card>
              )}

              {/* Send Button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSend}
                  disabled={!canSend() || isSending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSending
                    ? 'Sending...'
                    : `Send to ${targetRegistrations.length} player${targetRegistrations.length !== 1 ? 's' : ''}`}
                </Button>
                {sendSuccess && (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Sent successfully!
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* === TEMPLATES === */}
        <TabsContent value="templates" className="space-y-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
                <DialogDescription>Use variables like {`{{player_name}}`}, {`{{tournament_name}}`}, etc.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Template Name" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} />
                <Input placeholder="Email Subject" value={newTemplate.subject} onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })} />
                <Textarea placeholder="Email Body" rows={8} value={newTemplate.body} onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })} />
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <p className="font-semibold mb-1">Available Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATE_VARIABLES.map(v => <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={() => {
                    if (newTemplate.name && newTemplate.subject && newTemplate.body) {
                      createTemplateMutation.mutate({ ...newTemplate, type: 'custom', variables: TEMPLATE_VARIABLES });
                    }
                  }} disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Standard Templates</CardTitle>
              <CardDescription>Pre-built templates ready to use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {STANDARD_TEMPLATES.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.subject}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Standard</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {templates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.subject}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(template)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        {editingTemplate?.id === template.id && (
                          <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <Input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                              <Input value={editingTemplate.subject} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
                              <Textarea rows={8} value={editingTemplate.body} onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })} />
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                                <Button onClick={() => updateTemplateMutation.mutate({ id: editingTemplate.id, data: { name: editingTemplate.name, subject: editingTemplate.subject, body: editingTemplate.body } })} disabled={updateTemplateMutation.isPending}>
                                  {updateTemplateMutation.isPending ? 'Saving...' : 'Save'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                      <AlertDialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{template.name}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex gap-2 justify-end">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplateMutation.mutate(template.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}