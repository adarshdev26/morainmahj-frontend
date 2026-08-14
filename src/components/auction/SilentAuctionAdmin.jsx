import React, { useState } from 'react';
import { silentAuctions as silentAuctionsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ExternalLink, Gavel, Trophy, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import SilentAuctionItemAdmin from './SilentAuctionItemAdmin';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-orange-100 text-orange-700',
  revealed: 'bg-purple-100 text-purple-700',
};

const EMPTY = { name: '', description: '', confidential_bidders: false };

export default function SilentAuctionAdmin({ tournamentId, leagueId }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [expandedId, setExpandedId] = useState(null);

  const { data: auctions = [] } = useQuery({
    queryKey: ['silent-auctions', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return silentAuctionsApi.filter(filter);
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => silentAuctionsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['silent-auctions']); setCreating(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => silentAuctionsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries(['silent-auctions']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => silentAuctionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries(['silent-auctions']),
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createMutation.mutate({
      ...form,
      tournament_id: tournamentId || null,
      league_id: leagueId || null,
      status: 'draft',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Gavel className="h-4 w-4 text-amber-500" /> Silent Auctions
        </h3>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Auction
        </Button>
      </div>

      {creating && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label>Auction Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Charity Silent Auction" className="mt-1" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.confidential_bidders} onCheckedChange={v => setForm(f => ({ ...f, confidential_bidders: v }))} />
              <div>
                <Label className="flex items-center gap-1">
                  {form.confidential_bidders ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  Confidential bidders
                </Label>
                <p className="text-xs text-slate-400">Hide bidder names — players only see the current bid amount</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleCreate} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Auction'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {auctions.length === 0 && !creating && (
        <div className="text-center py-10 text-slate-400">
          <Gavel className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No silent auctions yet.</p>
        </div>
      )}

      {auctions.map(auction => (
        <Card key={auction.id}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-semibold text-slate-800">{auction.name}</h4>
                {auction.description && <p className="text-xs text-slate-400 mt-0.5">{auction.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={STATUS_COLORS[auction.status]}>{auction.status}</Badge>
                  {auction.confidential_bidders && (
                    <span className="flex items-center gap-1 text-xs text-slate-500"><EyeOff className="h-3 w-3" /> Confidential</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(auction.status === 'closed' || auction.status === 'open') && (
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs"
                    onClick={() => window.open(`/silent-auction-display/${auction.id}`, `auction_${auction.id}`, 'width=1280,height=800,toolbar=0,menubar=0')}>
                    <Trophy className="h-3.5 w-3.5" /> Reveal
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1 text-xs"
                  onClick={() => window.open(`/silent-auction-display/${auction.id}`, `auction_${auction.id}`, 'width=1280,height=800,toolbar=0,menubar=0')}>
                  <ExternalLink className="h-3.5 w-3.5" /> Display
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600"
                  onClick={() => { if (confirm('Delete this auction?')) deleteMutation.mutate(auction.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Status controls */}
            <div className="flex gap-2 flex-wrap mb-3">
              {auction.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: auction.id, data: { status: 'open' } })}>
                  Open Bidding
                </Button>
              )}
              {auction.status === 'open' && (
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: auction.id, data: { status: 'closed' } })}>
                  Close Bidding
                </Button>
              )}
            </div>

            {/* Items toggle */}
            <button
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium border-t pt-3 w-full"
              onClick={() => setExpandedId(expandedId === auction.id ? null : auction.id)}
            >
              <Gavel className="h-3.5 w-3.5" />
              Auction Items
              {(expandedId === auction.id || auction.status === 'revealed') ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
            </button>

            {(expandedId === auction.id || auction.status === 'revealed') && (
              <div className="mt-3">
                <SilentAuctionItemAdmin auctionId={auction.id} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}