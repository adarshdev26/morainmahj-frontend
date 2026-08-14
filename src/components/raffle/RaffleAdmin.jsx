import React, { useState } from 'react';
import { raffleTickets as raffleTicketsApi, raffles as rafflesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ExternalLink, Ticket, Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';
import TRaffleAdminItems from './TRaffleAdminItems';
import TRaffleAdminControls from './TRaffleAdminControls';
import SilentAuctionAdmin from '@/components/auction/SilentAuctionAdmin';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-orange-100 text-orange-700',
  drawn: 'bg-purple-100 text-purple-700',
};

const EMPTY_RAFFLE = {
  name: '',
  type: 'general',
  ticket_price_cents: 0,
  bundle_qty: 1,
  bundle_price_cents: 0,
  max_tickets_per_player: null,
  prizes: [],
  show_running_total: true,
  must_be_present: true,
};

export default function RaffleAdmin({ tournamentId, leagueId }) {
  // Silent auctions are rendered below the regular raffles
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_RAFFLE);
  const [prizeInput, setPrizeInput] = useState('');

  const { data: raffles = [] } = useQuery({
    queryKey: ['raffles', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return rafflesApi.filter(filter);
    },
    refetchInterval: 5000,
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ['raffle-tickets-admin', tournamentId, leagueId],
    queryFn: () => {
      const filter = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };
      return raffleTicketsApi.filter(filter);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => rafflesApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['raffles']); setCreating(false); setForm(EMPTY_RAFFLE); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rafflesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries(['raffles']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rafflesApi.remove(id),
    onSuccess: () => qc.invalidateQueries(['raffles']),
  });

  const handleCreate = () => {
    const payload = {
      ...form,
      tournament_id: tournamentId || null,
      league_id: leagueId || null,
      status: 'draft',
      total_tickets_sold: 0,
    };
    createMutation.mutate(payload);
  };

  const addPrize = () => {
    if (!prizeInput.trim()) return;
    setForm(f => ({ ...f, prizes: [...(f.prizes || []), { name: prizeInput.trim() }] }));
    setPrizeInput('');
  };

  const removePrize = (i) => setForm(f => ({ ...f, prizes: f.prizes.filter((_, idx) => idx !== i) }));

  const [showRoster, setShowRoster] = useState({});
  const ticketsForRaffle = (raffleId) => allTickets.filter(t => t.raffle_id === raffleId);

  function ticketRangeLabel(numbers) {
    if (!numbers || numbers.length === 0) return '';
    const sorted = [...numbers].sort((a, b) => a - b);
    if (sorted.length === 1) return `#${sorted[0]}`;
    const isConsecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (isConsecutive) return `#${sorted[0]}–#${sorted[sorted.length - 1]}`;
    return sorted.map(n => `#${n}`).join(', ');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Raffles</h3>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Raffle
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader><CardTitle className="text-sm">New Raffle</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="General Raffle" />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="general">General</option>
                  <option value="fifty_fifty">50/50</option>
                  <option value="t_raffle">Prize Raffle</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-white">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pricing</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price per ticket ($)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      className="pl-6"
                      value={form.ticket_price_cents === 0 ? '' : (form.ticket_price_cents / 100).toFixed(2)}
                      placeholder="0.00 (free)"
                      onChange={e => setForm(f => ({ ...f, ticket_price_cents: e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 100) }))}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Leave blank or 0 for free tickets</p>
                </div>
                <div>
                  <Label>Max tickets per player</Label>
                  <Input
                    type="number"
                    min="1"
                    className="mt-1"
                    value={form.max_tickets_per_player || ''}
                    placeholder="Unlimited"
                    onChange={e => setForm(f => ({ ...f, max_tickets_per_player: e.target.value === '' ? null : Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-slate-500 mb-2">Optional bundle deal (e.g. 5 tickets for $20)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bundle quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      className="mt-1"
                      value={form.bundle_qty > 1 ? form.bundle_qty : ''}
                      placeholder="e.g. 5"
                      onChange={e => setForm(f => ({ ...f, bundle_qty: e.target.value === '' ? 1 : Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Bundle price ($)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        className="pl-6"
                        value={form.bundle_price_cents > 0 ? (form.bundle_price_cents / 100).toFixed(2) : ''}
                        placeholder="e.g. 20.00"
                        onChange={e => setForm(f => ({ ...f, bundle_price_cents: e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 100) }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prizes */}
            {form.type !== 'fifty_fifty' && (
              <div>
                <Label>Prizes</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={prizeInput} onChange={e => setPrizeInput(e.target.value)} placeholder="Prize name" onKeyDown={e => e.key === 'Enter' && addPrize()} />
                  <Button type="button" size="sm" onClick={addPrize}>Add</Button>
                </div>
                <ul className="mt-2 space-y-1">
                  {form.prizes.map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" /> {p.name}
                      <button onClick={() => removePrize(i)} className="ml-auto text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {form.type === 'fifty_fifty' && (
              <div className="flex items-center gap-2">
                <Switch checked={form.show_running_total} onCheckedChange={v => setForm(f => ({ ...f, show_running_total: v }))} />
                <Label>Show running pot total to players</Label>
              </div>
            )}

            {(form.bundle_qty > 1 || form.bundle_price_cents > 0) && (
              <div className="flex items-center gap-2">
                <Switch checked={!!form.bundle_only} onCheckedChange={v => setForm(f => ({ ...f, bundle_only: v }))} />
                <Label>Bundles only (no single-ticket purchases)</Label>
              </div>
            )}

            <div className="border rounded-lg p-4 bg-white space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Winner Rules</p>
              <div className="flex items-center gap-3">
                <Switch
                  checked={!!form.must_be_present}
                  onCheckedChange={v => setForm(f => ({ ...f, must_be_present: v }))}
                  id="must-be-present-new"
                />
                <div>
                  <Label htmlFor="must-be-present-new" className="cursor-pointer">Must be present to win</Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {form.must_be_present
                      ? 'Winner announced live — no push notification sent.'
                      : 'Winner notified by push notification so they know even if they\'ve left.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleCreate} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Raffle'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raffle list */}
      {raffles.length === 0 && !creating && (
        <div className="text-center py-10 text-slate-400">
          <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No raffles yet. Create one to get started.</p>
        </div>
      )}

      {raffles.map(raffle => {
        const tickets = ticketsForRaffle(raffle.id);
        const totalTickets = tickets.reduce((s, t) => s + (t.quantity || 1), 0);
        const pot = raffle.fifty_fifty_total_cents ? `$${(raffle.fifty_fifty_total_cents / 100).toFixed(2)}` : null;

        return (
          <Card key={raffle.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">{raffle.name}</h4>
                  <p className="text-xs text-slate-500 capitalize">{raffle.type === 't_raffle' ? 'Prize Raffle' : raffle.type.replace('_', '/')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[raffle.status]}>{raffle.status}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs"
                    onClick={() => {
                      const url = raffle.type === 't_raffle' ? `/t-raffle-display/${raffle.id}` : `/raffle-display/${raffle.id}`;
                      window.open(url, `raffle_${raffle.id}`, 'width=1280,height=800,toolbar=0,menubar=0');
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Display
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => { if (confirm('Delete this raffle?')) deleteMutation.mutate(raffle.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-slate-600 mb-3">
                <span><strong>{totalTickets}</strong> tickets</span>
                {pot && <span><strong>{pot}</strong> pot</span>}
                {raffle.ticket_price_cents > 0 && <span>${(raffle.ticket_price_cents / 100).toFixed(2)}/ticket</span>}
                {raffle.ticket_price_cents === 0 && <span className="text-green-600">Free</span>}
              </div>

              {raffle.winner_player_name && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-3">
                  <Trophy className="h-4 w-4 text-amber-500 inline mr-1" />
                  Winner: <strong>{raffle.winner_player_name}</strong> — Ticket #{raffle.winner_ticket_number}
                  {raffle.winner_prize_name && <> — {raffle.winner_prize_name}</>}
                </div>
              )}

              {/* T-Raffle specific UI */}
              {raffle.type === 't_raffle' && (
                <div className="mb-4 space-y-4">
                  <TRaffleAdminControls raffle={raffle} />
                  <TRaffleAdminItems raffleId={raffle.id} />
                </div>
              )}

              {/* Status controls */}
              <div className="flex gap-2 flex-wrap">
                {raffle.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: raffle.id, data: { status: 'open' } })}>
                    Open Raffle
                  </Button>
                )}
                {raffle.status === 'open' && (
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: raffle.id, data: { status: 'closed' } })}>
                    Close Sales
                  </Button>
                )}
                {(raffle.status === 'open' || raffle.status === 'closed') && raffle.type !== 't_raffle' && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                    onClick={() => window.open(`/raffle-display/${raffle.id}`, `raffle_${raffle.id}`, 'width=1280,height=800,toolbar=0,menubar=0')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Draw Winner
                  </Button>
                )}
              </div>

              {/* Ticket roster toggle */}
              {tickets.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <button
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium"
                    onClick={() => setShowRoster(s => ({ ...s, [raffle.id]: !s[raffle.id] }))}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Ticket Roster ({tickets.length} player{tickets.length !== 1 ? 's' : ''})
                    {showRoster[raffle.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showRoster[raffle.id] && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {tickets
                        .sort((a, b) => (Math.min(...(a.ticket_numbers || [0]))) - (Math.min(...(b.ticket_numbers || [0]))))
                        .map(t => (
                          <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{t.player_name}</span>
                              {t.payment_status === 'free' && <span className="text-green-600">(free)</span>}
                              {t.payment_status === 'paid' && <span className="text-blue-600">(paid)</span>}
                            </div>
                            <div className="text-amber-600 font-mono font-semibold">
                              {ticketRangeLabel(t.ticket_numbers)}
                              <span className="text-slate-400 font-normal ml-1">({t.quantity || 1} ticket{t.quantity !== 1 ? 's' : ''})</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    <div className="mt-8 border-t pt-6">
        <SilentAuctionAdmin tournamentId={tournamentId} leagueId={leagueId} />
      </div>
    </div>
  );
}