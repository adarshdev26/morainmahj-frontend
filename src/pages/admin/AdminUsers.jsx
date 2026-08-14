import React, { useState } from 'react';
import { inviteUser } from '@/services/usersApi';
import { users as usersApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, UserCog, ShieldCheck, User } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'user' });
  const [inviteStatus, setInviteStatus] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.list({}, { sort: '-created_date', limit: 200 }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => usersApi.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const handleInvite = async () => {
    setInviteStatus('sending');
    await inviteUser(inviteForm.email, inviteForm.role);
    setInviteStatus('sent');
    setTimeout(() => {
      setInviteOpen(false);
      setInviteStatus(null);
      setInviteForm({ email: '', role: 'user' });
    }, 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Invite users and manage roles</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2">
          <UserPlus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-32">Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>}
                {!isLoading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <UserCog className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">No users found.</p>
                    </TableCell>
                  </TableRow>
                )}
                {users.map(u => (
                  <TableRow key={u.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-700 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0">
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      {u.full_name || '—'}
                      {u.id === currentUser?.id && (
                        <Badge className="bg-blue-100 text-blue-600 text-[10px]">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}>
                        {u.role === 'admin' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                        {u.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {u.created_date ? format(new Date(u.created_date), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {u.id !== currentUser?.id ? (
                        <Select
                          value={u.role || 'user'}
                          onValueChange={val => updateRoleMutation.mutate({ id: u.id, role: val })}
                        >
                          <SelectTrigger className="h-8 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-slate-400">Cannot edit own role</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={val => setInviteForm({ ...inviteForm, role: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteStatus === 'sent' && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">
                <ShieldCheck className="h-4 w-4" /> Invitation sent successfully!
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900"
                onClick={handleInvite}
                disabled={!inviteForm.email || inviteStatus === 'sending' || inviteStatus === 'sent'}
              >
                {inviteStatus === 'sending' ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}