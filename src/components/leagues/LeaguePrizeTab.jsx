import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaguePrizes as leaguePrizesApi, leagueSessions as leagueSessionsApi } from '@/services/resources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaguePrizeTab({ league }) {
  const [awardingPrize, setAwardingPrize] = useState(false);
  const [formData, setFormData] = useState({
    player_email: '',
    player_name: '',
    amount: '',
    session_id: '',
  });
  const queryClient = useQueryClient();

  const { data: prizes = [] } = useQuery({
    queryKey: ['league-prizes', league.id],
    queryFn: async () => {
      // Query by creating a LeaguePrize entity - storing per-league prizes
      const allPrizes = await leaguePrizesApi.filter({ league_id: league.id });
      return allPrizes || [];
    },
    enabled: !!league.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['league-sessions', league.id],
    queryFn: () => leagueSessionsApi.filter({ league_id: league.id }),
    enabled: !!league.id,
  });

  // Award prize mutation
  const awardPrizeMutation = useMutation({
    mutationFn: async () => {
      if (!formData.player_email || !formData.amount) {
        toast.error('Please fill in all fields');
        return;
      }
      await leaguePrizesApi.create({
        league_id: league.id,
        player_email: formData.player_email,
        player_name: formData.player_name || formData.player_email.split('@')[0],
        amount: parseInt(formData.amount) * 100, // Convert to cents
        session_id: formData.session_id || null,
        paid_out: false,
      });
    },
    onSuccess: () => {
      setFormData({ player_email: '', player_name: '', amount: '', session_id: '' });
      setAwardingPrize(false);
      queryClient.invalidateQueries({ queryKey: ['league-prizes'] });
      toast.success('Prize awarded');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to award prize');
    },
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (prizeId) => {
      await leaguePrizesApi.update(prizeId, {
        paid_out: true,
        paid_out_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-prizes'] });
      toast.success('Prize marked as paid');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update prize');
    },
  });

  const totalAwarded = prizes.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
  const totalPaid = prizes.filter(p => p.paid_out).reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
  const unpaidPrizes = prizes.filter(p => !p.paid_out);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Awarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAwarded.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            {unpaidPrizes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{unpaidPrizes.length} pending</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Award Prize Form */}
      {awardingPrize ? (
        <Card>
          <CardHeader>
            <CardTitle>Award Prize</CardTitle>
            <CardDescription>Add a prize payout to a league player</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Player Email</label>
                <Input
                  placeholder="player@example.com"
                  value={formData.player_email}
                  onChange={(e) => setFormData({ ...formData, player_email: e.target.value })}
                  type="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Player Name (optional)</label>
                <Input
                  placeholder="Full name"
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Amount ($)</label>
                <Input
                  placeholder="25.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  type="number"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Session (optional)</label>
                <select
                  value={formData.session_id}
                  onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
                >
                  <option value="">--</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setAwardingPrize(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => awardPrizeMutation.mutate()}
                disabled={awardPrizeMutation.isPending}
              >
                Award Prize
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setAwardingPrize(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Award Prize
        </Button>
      )}

      {/* Prizes List */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({unpaidPrizes.length})</TabsTrigger>
          <TabsTrigger value="all">All ({prizes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {unpaidPrizes.length > 0 ? (
            unpaidPrizes.map(prize => (
              <Card key={prize.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{prize.player_name}</h3>
                      <p className="text-sm text-muted-foreground">{prize.player_email}</p>
                      {prize.session_id && (
                        <p className="text-xs text-muted-foreground mt-2">Session: {prize.session_id}</p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="text-lg font-bold">${(prize.amount / 100).toFixed(2)}</div>
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => markPaidMutation.mutate(prize.id)}
                        disabled={markPaidMutation.isPending}
                      >
                        Mark Paid
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No pending prizes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {prizes.length > 0 ? (
            prizes.map(prize => (
              <Card key={prize.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{prize.player_name}</h3>
                      <p className="text-sm text-muted-foreground">{prize.player_email}</p>
                      {prize.session_id && (
                        <p className="text-xs text-muted-foreground mt-2">Session: {prize.session_id}</p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="text-lg font-bold">${(prize.amount / 100).toFixed(2)}</div>
                      <Badge variant={prize.paid_out ? 'default' : 'secondary'} className="gap-1">
                        {prize.paid_out ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> Pending
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No prizes awarded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}