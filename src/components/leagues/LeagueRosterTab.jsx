import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { leagueMembers as leagueMembersApi } from '@/services/resources';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, UserCheck, UserX, Upload, Star, Search, SlidersHorizontal, RotateCcw, BadgeCheck, Users2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import LeagueRefundDialog from '@/components/leagues/LeagueRefundDialog';

const FILTERS = ['All', 'Active', 'Waitlist', 'Inactive', 'Regulars'];

export default function LeagueRosterTab({ league, members }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ player_name: '', player_email: '', player_phone: '', notes: '' });
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [editingNotes, setEditingNotes] = useState(null); // member id
  const [refundFor, setRefundFor] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [demoFilling, setDemoFilling] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['league-members', league.id] });

  const DEMO_PLAYERS = [
    { player_name: 'Sarah Johnson', player_email: 'sarah.johnson.demo@gmail.com', player_phone: '555-0101' },
    { player_name: 'Michael Chen', player_email: 'michael.chen.demo@gmail.com', player_phone: '555-0102' },
    { player_name: 'Jennifer Martinez', player_email: 'jennifer.martinez.demo@gmail.com', player_phone: '555-0103' },
    { player_name: 'David Park', player_email: 'david.park.demo@gmail.com', player_phone: '555-0104' },
    { player_name: 'Amanda Wilson', player_email: 'amanda.wilson.demo@gmail.com', player_phone: '555-0105' },
    { player_name: 'Robert Taylor', player_email: 'robert.taylor.demo@gmail.com', player_phone: '555-0106' },
    { player_name: 'Emily Davis', player_email: 'emily.davis.demo@gmail.com', player_phone: '555-0107' },
    { player_name: 'James Anderson', player_email: 'james.anderson.demo@gmail.com', player_phone: '555-0108' },
  ];

  const fillDemoPlayers = async () => {
    setDemoFilling(true);
    try {
      const existingEmails = new Set(members.map(m => m.player_email?.toLowerCase()));
      const toAdd = DEMO_PLAYERS.filter(p => !existingEmails.has(p.player_email.toLowerCase()));
      if (toAdd.length === 0) {
        toast({ title: 'All demo players already on roster.' });
        return;
      }
      await leagueMembersApi.bulkCreate(
        toAdd.map(p => ({ league_id: league.id, ...p, active: true, is_regular: false }))
      );
      invalidate();
      toast({ title: `${toAdd.length} demo players added.`, description: 'These are test players with fake emails — no invites will be sent to them.' });
    } catch (err) {
      toast({ title: 'Error adding demo players', description: err.message, variant: 'destructive' });
    } finally {
      setDemoFilling(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: (data) => leagueMembersApi.create({ league_id: league.id, active: true, is_regular: false, ...data }),
    onSuccess: () => {
      invalidate();
      setNewMember({ player_name: '', player_email: '', player_phone: '', notes: '' });
      setShowAdd(false);
      toast({ title: 'Member added.' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => leagueMembersApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leagueMembersApi.remove(id),
    onSuccess: () => { invalidate(); toast({ title: 'Member removed.' }); },
  });

  const markPaidMutation = useMutation({
    mutationFn: (member_id) => callAction('markLeagueMemberPaid', { member_id }),
    onSuccess: () => { invalidate(); toast({ title: 'Member marked as paid and activated.' }); },
    onError: (err) => toast({ title: 'Error', description: err?.response?.data?.error || err?.message || 'Failed to mark as paid', variant: 'destructive' }),
  });

  const handleBulkAdd = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    let added = 0;
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts[0] && parts[1]) {
        await leagueMembersApi.create({
          league_id: league.id,
          player_name: parts[0],
          player_email: parts[1],
          player_phone: parts[2] || '',
          active: true,
          is_regular: false,
        });
        added++;
      }
    }
    invalidate();
    setBulkText('');
    setShowBulk(false);
    toast({ title: `${added} members added.` });
  };

  const saveNote = (member) => {
    updateMutation.mutate({ id: member.id, notes: noteDraft });
    setEditingNotes(null);
  };

  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.player_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.player_email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Active' ? (m.active && m.waitlist_position == null) :
      filter === 'Waitlist' ? m.waitlist_position != null :
      filter === 'Inactive' ? (!m.active && m.waitlist_position == null) :
      filter === 'Regulars' ? m.is_regular : true;
    return matchSearch && matchFilter;
  });

  const counts = {
    active: members.filter(m => m.active && m.waitlist_position == null).length,
    waitlist: members.filter(m => m.waitlist_position != null).length,
    inactive: members.filter(m => !m.active && m.waitlist_position == null).length,
    regulars: members.filter(m => m.is_regular).length,
  };

  return (
    <div className="space-y-4">
      {/* Header stats + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{members.length} members</span>
          <span>·</span>
          <span>{counts.active} active</span>
          <span>·</span>
          <span className="text-amber-600">{counts.waitlist} waitlisted</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{counts.regulars} regulars</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fillDemoPlayers} disabled={demoFilling} className="gap-1">
            <Users2 className="h-3.5 w-3.5" /> {demoFilling ? 'Filling…' : 'Fill Demo Players'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowBulk(b => !b); setShowAdd(false); }} className="gap-1">
            <Upload className="h-3.5 w-3.5" /> Bulk Add
          </Button>
          <Button size="sm" onClick={() => { setShowAdd(b => !b); setShowBulk(false); }} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Member
          </Button>
        </div>
      </div>

      {/* Bulk add */}
      {showBulk && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Bulk add — one per line: <code className="bg-slate-100 px-1 rounded text-xs">Name, Email, Phone (optional)</code></p>
          <textarea
            className="w-full border rounded-lg p-3 text-sm font-mono h-36 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={"Jane Smith, jane@example.com, 555-1234\nJohn Doe, john@example.com"}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkAdd}>Add All</Button>
            <Button size="sm" variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Single add */}
      {showAdd && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">New Member</p>
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Full name *" value={newMember.player_name} onChange={e => setNewMember(m => ({ ...m, player_name: e.target.value }))} />
            <Input placeholder="Email *" value={newMember.player_email} onChange={e => setNewMember(m => ({ ...m, player_email: e.target.value }))} />
            <Input placeholder="Phone (optional)" value={newMember.player_phone} onChange={e => setNewMember(m => ({ ...m, player_phone: e.target.value }))} />
          </div>
          <Input placeholder="Notes (optional)" value={newMember.notes} onChange={e => setNewMember(m => ({ ...m, notes: e.target.value }))} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded"
                checked={newMember.is_regular || false}
                onChange={e => setNewMember(m => ({ ...m, is_regular: e.target.checked }))}
              />
              <Star className="h-3.5 w-3.5 text-amber-500" /> Mark as regular
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => { if (!newMember.player_name || !newMember.player_email) return; addMutation.mutate(newMember); }}
              disabled={addMutation.isPending}
            >
              Add Member
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === f ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f === 'Regulars' ? <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{f}</span> : f}
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-slate-400 text-sm">
            {members.length === 0 ? 'No members yet. Add players to the roster.' : 'No members match your search.'}
          </p>
        )}
        {filtered.map((m, i) => (
          <div key={m.id} className={`px-4 py-3 ${i < filtered.length - 1 ? 'border-b' : ''} ${!m.active ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                  {m.player_name?.[0]?.toUpperCase() || '?'}
                </div>
                {m.is_regular && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Star className="h-2.5 w-2.5 text-white fill-white" />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-800">{m.player_name}</p>
                  {m.is_regular && <span className="text-xs text-amber-600 font-semibold">Regular</span>}
                  {m.waitlist_position != null
                    ? <Badge className="text-xs bg-amber-100 text-amber-700">Waitlist #{m.waitlist_position}</Badge>
                    : (!m.active && <Badge variant="outline" className="text-xs text-slate-400">Inactive</Badge>)}
                </div>
                <p className="text-xs text-slate-400 truncate">{m.player_email}{m.player_phone ? ` · ${m.player_phone}` : ''}</p>
                {m.notes && editingNotes !== m.id && (
                  <p className="text-xs text-slate-500 italic mt-0.5">"{m.notes}"</p>
                )}
                {editingNotes === m.id && (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      className="h-7 text-xs"
                      value={noteDraft}
                      onChange={e => setNoteDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNote(m); if (e.key === 'Escape') setEditingNotes(null); }}
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveNote(m)}>Save</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setEditingNotes(null)}>Cancel</Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Regular toggle */}
                <button
                  title={m.is_regular ? 'Remove regular status' : 'Mark as regular'}
                  onClick={() => updateMutation.mutate({ id: m.id, is_regular: !m.is_regular })}
                  className={`p-1.5 rounded-md transition-colors ${m.is_regular ? 'text-amber-500 hover:text-amber-700' : 'text-slate-300 hover:text-amber-400'}`}
                >
                  <Star className={`h-4 w-4 ${m.is_regular ? 'fill-amber-400' : ''}`} />
                </button>

                {/* Notes toggle */}
                <button
                  title="Edit notes"
                  onClick={() => { setEditingNotes(m.id); setNoteDraft(m.notes || ''); }}
                  className="p-1.5 rounded-md text-slate-300 hover:text-slate-600 transition-colors text-xs font-bold"
                >
                  ✎
                </button>

                {/* Active toggle */}
                <button
                  title={m.active ? 'Deactivate' : 'Reactivate'}
                  onClick={() => updateMutation.mutate({ id: m.id, active: !m.active })}
                  className="p-1.5 rounded-md text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {m.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </button>

                {/* Mark as Paid (manual / cash override) */}
                {m.payment_status === 'pending' && (
                  <button
                    title="Mark as Paid"
                    onClick={() => { if (confirm('Mark this member as paid and activate their membership?')) markPaidMutation.mutate(m.id); }}
                    disabled={markPaidMutation.isPending}
                    className="p-1.5 rounded-md text-slate-300 hover:text-green-600 transition-colors"
                  >
                    <BadgeCheck className="h-4 w-4" />
                  </button>
                )}

                {/* Refund */}
                {m.payment_status === 'paid' && (
                  <button
                    title="Refund"
                    onClick={() => setRefundFor(m)}
                    className="p-1.5 rounded-md text-slate-300 hover:text-amber-600 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {/* Delete */}
                <button
                  title="Remove from roster"
                  onClick={() => { if (confirm('Remove this player from the roster?')) deleteMutation.mutate(m.id); }}
                  className="p-1.5 rounded-md text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-right">Showing {filtered.length} of {members.length} members</p>
      )}

      {refundFor && (
        <LeagueRefundDialog member={refundFor} league={league} open={!!refundFor} onClose={() => setRefundFor(null)} />
      )}
    </div>
  );
}