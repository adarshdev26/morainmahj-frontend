import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function WalkInDialog({ session, league, open, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const walkIn = useMutation({
    mutationFn: (payload) => callAction('createLeagueWalkIn', payload),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['session-rsvps', session.id] });
      queryClient.invalidateQueries({ queryKey: ['league-members', league.id] });
      toast({ title: d.reactivated ? 'Existing RSVP reactivated & checked in' : 'Walk-in added & checked in' });
      setName(''); setEmail(''); setPhone('');
      onClose();
    },
    onError: (err) => toast({
      title: 'Could not add walk-in',
      description: err?.response?.data?.error || err?.message,
      variant: 'destructive',
    }),
  });

  const submit = () => {
    if (!name || !email) return;
    walkIn.mutate({
      session_id: session.id,
      league_id: league.id,
      player_name: name,
      player_email: email,
      player_phone: phone,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Walk-In Player</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Full name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label className="text-xs">Phone (optional)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          {league?.payment_model === 'paid' && (
            <p className="text-xs text-slate-500">A pending membership will be created so you can collect payment later.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={walkIn.isPending || !name || !email} className="gap-1">
            {walkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add & Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}