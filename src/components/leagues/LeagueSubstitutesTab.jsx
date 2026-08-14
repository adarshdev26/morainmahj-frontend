import React, { useState } from 'react';
import { leagueMembers as leagueMembersApi } from '@/services/resources';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, UserCheck, Search, CalendarClock, Repeat } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const EMPTY_SUB = { player_name: '', player_email: '', player_phone: '', sub_type: 'occasional' };

export default function LeagueSubstitutesTab({ league, members }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_SUB);
  const [search, setSearch] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['league-members', league.id] });

  const createMutation = useMutation({
    mutationFn: (data) => leagueMembersApi.create({
      league_id: league.id,
      active: true,
      is_regular: false,
      is_substitute: true,
      ...data,
    }),
    onSuccess: () => {
      invalidate();
      setForm(EMPTY_SUB);
      setShowAdd(false);
      toast({ title: 'Substitute added.' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => leagueMembersApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leagueMembersApi.remove(id),
    onSuccess: () => { invalidate(); toast({ title: 'Substitute removed.' }); },
  });

  const subs = members.filter(m => m.is_substitute);
  const filtered = subs.filter(m =>
    !search ||
    m.player_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.player_email?.toLowerCase().includes(search.toLowerCase())
  );

  const seasonalCount = subs.filter(m => m.sub_type === 'season').length;
  const occasionalCount = subs.filter(m => m.sub_type !== 'season').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{subs.length} substitutes</span>
          <span>·</span>
          <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5 text-blue-500" />{occasionalCount} occasional</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5 text-emerald-500" />{seasonalCount} season</span>
        </div>
        <Button size="sm" onClick={() => setShowAdd(b => !b)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Substitute
        </Button>
      </div>

      <p className="text-xs text-slate-400 -mt-2">
        Substitutes aren't regular roster spots — they're players you can call in when someone can't attend a session.
        Use <strong>Occasional</strong> for one-night fill-ins, or <strong>Season</strong> for someone available to sub throughout the season.
      </p>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">New Substitute</p>
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Full name *" value={form.player_name} onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))} />
            <Input placeholder="Email *" value={form.player_email} onChange={e => setForm(f => ({ ...f, player_email: e.target.value }))} />
            <Input placeholder="Phone (optional)" value={form.player_phone} onChange={e => setForm(f => ({ ...f, player_phone: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Availability:</span>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setForm(f => ({ ...f, sub_type: 'occasional' }))}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${form.sub_type === 'occasional' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              >
                Occasional (one night)
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, sub_type: 'season' }))}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${form.sub_type === 'season' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              >
                Season (rest of season)
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!form.player_name || !form.player_email || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? 'Adding…' : 'Add Substitute'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input className="pl-8" placeholder="Search substitutes…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-slate-400 text-sm">
            {subs.length === 0 ? 'No substitutes yet. Add a fill-in player to get started.' : 'No substitutes match your search.'}
          </p>
        )}
        {filtered.map((m, i) => (
          <div key={m.id} className={`px-4 py-3 ${i < filtered.length - 1 ? 'border-b' : ''} ${!m.active ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                {m.player_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-800">{m.player_name}</p>
                  <Badge className={m.sub_type === 'season' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                    {m.sub_type === 'season' ? 'Season' : 'Occasional'}
                  </Badge>
                  {!m.active && <Badge variant="outline" className="text-xs text-slate-400">Inactive</Badge>}
                </div>
                <p className="text-xs text-slate-400 truncate">{m.player_email}{m.player_phone ? ` · ${m.player_phone}` : ''}</p>
                {m.notes && <p className="text-xs text-slate-500 italic mt-0.5">"{m.notes}"</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Toggle sub type */}
                <button
                  title={m.sub_type === 'season' ? 'Switch to occasional' : 'Switch to season'}
                  onClick={() => updateMutation.mutate({ id: m.id, sub_type: m.sub_type === 'season' ? 'occasional' : 'season' })}
                  className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {m.sub_type === 'season' ? <CalendarClock className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
                {/* Promote to regular member */}
                <button
                  title="Promote to regular roster spot"
                  onClick={() => { if (confirm('Promote this substitute to a regular roster member?')) updateMutation.mutate({ id: m.id, is_substitute: false, is_regular: true }); }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                </button>
                {/* Remove */}
                <button
                  title="Remove substitute"
                  onClick={() => { if (confirm('Remove this substitute?')) deleteMutation.mutate(m.id); }}
                  className="p-1.5 rounded-md text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}