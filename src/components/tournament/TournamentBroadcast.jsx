import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, AlertCircle, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TournamentBroadcast({ tournament }) {
  const { toast } = useToast();
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState(`Join us for ${tournament.name}!`);
  const [message, setMessage] = useState('');
  const [emails, setEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const landingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/tournament/${tournament.id}`;

  const tileInfo = tournament.boutique_tiles_allowed ? 'Boutique & traditional tiles' : 'Traditional tiles only';

  const defaultMessage = `
You're invited to ${tournament.name}!

📍 Location: ${tournament.location}
📅 Date: ${new Date(tournament.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
🎯 Format: ${tournament.num_rounds} rounds
🎲 Tiles: ${tileInfo}

Register here: ${landingUrl}

Looking forward to seeing you there!
  `.trim();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(landingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: 'Error', description: 'Message cannot be empty', variant: 'destructive' });
      return;
    }

    const recipientList = emails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (!recipientList.length) {
      toast({ title: 'Error', description: 'No valid email addresses provided', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tournament.id,
          channel,
          subject: channel === 'email' ? subject : undefined,
          message,
          recipients: recipientList,
        }),
      });

      if (!res.ok) throw new Error('Failed to send broadcast');

      toast({ title: 'Success', description: `Message sent to ${recipientList.length} recipient${recipientList.length !== 1 ? 's' : ''}` });
      setEmails('');
      setMessage(defaultMessage);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Broadcast Tournament Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tournament Link */}
        <div>
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
            Shareable Landing Page
          </label>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={landingUrl}
              className="text-xs bg-slate-50"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopyLink}
              className="gap-1 shrink-0"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Channel */}
        <div>
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
            Channel
          </label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subject (Email only) */}
        {channel === 'email' && (
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
              Subject Line
            </label>
            <Input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="text-sm"
            />
          </div>
        )}

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Message
            </label>
            <button
              onClick={() => setMessage(defaultMessage)}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Use template
            </button>
          </div>
          <Textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your tournament invitation message..."
            rows={6}
            className="text-sm font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            {message.length} characters • Include the landing page link above
          </p>
        </div>

        {/* Recipients */}
        <div>
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
            Recipients (one email per line)
          </label>
          <Textarea 
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="john@example.com&#10;jane@example.com&#10;..."
            rows={4}
            className="text-sm font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            {emails.split('\n').filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length} valid email address{emails.split('\n').filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length !== 1 ? 'es' : ''}
          </p>
        </div>

        {/* Info */}
        <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Recipients can register directly from the tournament landing page. You can send multiple broadcast waves.
          </p>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || !emails.trim() || sending}
          className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Sending...' : 'Send Broadcast'}
        </Button>
      </CardContent>
    </Card>
  );
}