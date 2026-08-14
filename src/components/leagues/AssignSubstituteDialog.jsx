import React, { useState, useMemo } from 'react';
import { callAction } from '@/services/actions';
import { leagueMembers as leagueMembersApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AssignSubstituteDialog({ open, onClose, session, league, originalRsvp }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: subs = [], isLoading: subsLoading } = useQuery({
    queryKey: ['league-substitutes', league?.id],
    queryFn: () => leagueMembersApi.filter({ league_id: league.id, is_substitute: true }),
    enabled: !!league?.id && open,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['league-members-all', league?.id],
    queryFn: () => leagueMembersApi.filter({ league_id: league.id }),
    enabled: !!league?.id && open,
  });

  const candidates = useMemo(() => {
    // Substitutes first, then any active roster member who can fill in
    const all = [
      ...subs,
      ...members.filter((m) => !m.is_substitute && m.active !== false),
    ];
    const seen = new Set();
    const unique = [];
    all.forEach((m) => {
      if (m.player_email && !seen.has(m.player_email.toLowerCase())) {
        seen.add(m.player_email.toLowerCase());
        unique.push(m);
      }
    });
    if (!search) return unique;
    const q = search.toLowerCase();
    return unique.filter(
      (m) =>
        (m.player_name || '').toLowerCase().includes(q) ||
        (m.player_email || '').toLowerCase().includes(q)
    );
  }, [subs, members, search]);

  const assignMutation = useMutation({
    mutationFn: (substituteMemberId) =>
      callAction('assignLeagueSubstitute', {
        session_id: session.id,
        league_id: league.id,
        original_player_email: originalRsvp?.player_email,
        substitute_member_id: substituteMemberId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-rsvps', session.id] });
      toast({ title: 'Substitute assigned — RSVP updated' });
      onClose();
    },
    onError: (err) =>
      toast({ title: 'Error', description: err?.message || 'Failed to assign', variant: 'destructive' }),
  });

  if (!open) return null;

  const isLoading = subsLoading || membersLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-slate-700" />
            <h3 className="font-semibold text-slate-800">Assign Substitute</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <p className="text-xs text-slate-500 mb-2">
            Covering for: <span className="font-medium text-slate-700">{originalRsvp?.player_name}</span>
          </p>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search substitutes & members…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}
          {!isLoading && candidates.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No substitutes or members found.
              <br />Add substitutes in the Roster tab.
            </div>
          )}
          {!isLoading &&
            candidates.map((m) => (
              <button
                key={m.id}
                onClick={() => assignMutation.mutate(m.id)}
                disabled={assignMutation.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                  {m.player_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{m.player_name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.player_email}</p>
                </div>
                {m.is_substitute && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs shrink-0">Sub</Badge>
                )}
                {assignMutation.isPending && assignMutation.variables === m.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}