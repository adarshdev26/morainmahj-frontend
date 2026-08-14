import React, { useState, useEffect } from 'react';
import { tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Save } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import RulesEditor from '@/components/shared/RulesEditor';
import ImageUpload from '@/components/shared/ImageUpload';
import PayoutCalculator from '@/components/shared/PayoutCalculator';
import { useAuth } from '@/lib/AuthContext';

export default function TournamentSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isCreating = !id;
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: '',
    date: '',
    location: '',
    logo_url: null,
    flights_enabled: true,
    flights: 'A,B,C',
    status: 'setup',
    num_rounds: 4,
    registration_open_date: '',
    registration_close_date: '',
    reminder_send_at: '',
    invited_reminder_send_at: '',
    player_cap: '',
    waitlist_enabled: false,
    auto_promote_waitlist: false,
    boutique_tiles_allowed: false,
    payment_model: 'none',
    entry_fee: '',
    app_fee: '',
    sets_needed_enabled: false,
    sets_needed: '',
    set_assignment_mode: 'manual',
    set_assign_at: '',
    permanent_east_enabled: false,
    permanent_east_needed: '',
    description: '',
    hashtag: '',
    instagram_handle: '',
    facebook_handle: '',
    twitter_handle: '',
    sharing_enabled: true,
    auto_post_enabled: false,
    rules_variant: 'nmjl',
    rules_description: '',
    rsvp_list_public: true,
    discoverable: false,
    requires_player_subscription: false,
    subscriber_discount: '',
  });

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.list().then(t => t.find(x => x.id === id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (tournament) {
      setForm({
        name: tournament.name || '',
        date: tournament.date || '',
        location: tournament.location || '',
        logo_url: tournament.logo_url || null,
        flights_enabled: (tournament.flights || []).length > 0,
        flights: tournament.flights?.join(', ') || '',
        status: tournament.status || 'setup',
        num_rounds: tournament.num_rounds || 4,
        registration_open_date: tournament.registration_open_date || '',
        registration_close_date: tournament.registration_close_date || '',
        reminder_send_at: tournament.reminder_send_at || '',
        invited_reminder_send_at: tournament.invited_reminder_send_at || '',
        player_cap: tournament.player_cap || '',
        waitlist_enabled: tournament.waitlist_enabled || false,
        auto_promote_waitlist: tournament.auto_promote_waitlist || false,
        boutique_tiles_allowed: tournament.boutique_tiles_allowed || false,
        payment_model: tournament.payment_model || 'none',
        entry_fee: tournament.entry_fee ? (tournament.entry_fee / 100).toString() : '',
        app_fee: tournament.app_fee ? (tournament.app_fee / 100).toString() : '',
        sets_needed_enabled: tournament.sets_needed_enabled || false,
        sets_needed: tournament.sets_needed || '',
        set_assignment_mode: tournament.set_assignment_mode || 'manual',
        set_assign_at: tournament.set_assign_at || '',
        permanent_east_enabled: tournament.permanent_east_enabled || false,
        permanent_east_needed: tournament.permanent_east_needed || '',
        description: tournament.description || '',
        hashtag: tournament.hashtag || '',
        instagram_handle: tournament.instagram_handle || '',
        facebook_handle: tournament.facebook_handle || '',
        twitter_handle: tournament.twitter_handle || '',
        sharing_enabled: tournament.sharing_enabled !== false,
        auto_post_enabled: tournament.auto_post_enabled || false,
        rules_variant: tournament.rules_variant || 'nmjl',
        rules_description: tournament.rules_description || '',
        rsvp_list_public: tournament.rsvp_list_public !== false,
        discoverable: tournament.discoverable || false,
        requires_player_subscription: tournament.requires_player_subscription || false,
        subscriber_discount: tournament.subscriber_discount_cents ? (tournament.subscriber_discount_cents / 100).toString() : '',
      });
    }
  }, [tournament]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isCreating) {
        return await tournamentsApi.create(data);
      } else {
        return await tournamentsApi.update(id, data);
      }
    },
    onSuccess: (result) => {
      toast({ title: isCreating ? 'Tournament created!' : 'Tournament settings saved!' });
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      const tournamentId = isCreating ? result.id : id;
      navigate(`/admin/tournament/${tournamentId}`);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
   const data = {
     ...form,
     organization_id: user?.organization_id,
     flights: form.flights_enabled && form.flights ? form.flights.split(',').map(f => f.trim()).filter(f => f) : [],
     num_rounds: Number(form.num_rounds),
     player_cap: form.player_cap ? Number(form.player_cap) : null,
     registration_open_date: form.registration_open_date ? new Date(form.registration_open_date).toISOString() : null,
     registration_close_date: form.registration_close_date ? new Date(form.registration_close_date).toISOString() : null,
     reminder_send_at: form.reminder_send_at ? new Date(form.reminder_send_at).toISOString() : null,
     invited_reminder_send_at: form.invited_reminder_send_at ? new Date(form.invited_reminder_send_at).toISOString() : null,
     set_assign_at: form.set_assign_at ? new Date(form.set_assign_at).toISOString() : null,
     entry_fee: form.entry_fee ? Math.round(Number(form.entry_fee) * 100) : null,
     app_fee: form.app_fee ? Math.round(Number(form.app_fee) * 100) : null,
     sets_needed: form.sets_needed ? Number(form.sets_needed) : null,
     permanent_east_needed: form.permanent_east_needed ? Number(form.permanent_east_needed) : null,
     rules_variant: form.rules_variant,
     rules_description: form.rules_description,
     discoverable: form.discoverable,
     requires_player_subscription: form.requires_player_subscription,
     subscriber_discount_cents: form.subscriber_discount ? Math.round(Number(form.subscriber_discount) * 100) : null,
     };
     saveMutation.mutate(data);
  };

  if (!isCreating && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(isCreating ? '/admin/tournaments' : `/admin/tournament/${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tournament Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Rounds</Label>
                  <Input type="number" min={1} max={10} value={form.num_rounds} onChange={e => setForm({ ...form, num_rounds: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <ImageUpload
                value={form.logo_url}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                label="Tournament Logo"
              />
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Switch
                  checked={form.flights_enabled}
                  onCheckedChange={val => setForm({ ...form, flights_enabled: val, flights: val ? form.flights || 'A,B,C' : '' })}
                />
                <div className="flex-1">
                  <Label className="text-sm font-medium">Enable Flights</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Split the tournament into separate flights (divisions)
                  </p>
                </div>
              </div>
              {form.flights_enabled && (
                <div>
                  <Label>Flights (comma separated)</Label>
                  <Input placeholder="e.g. A, B, C" value={form.flights} onChange={e => setForm({ ...form, flights: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional tournament notes" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={val => setForm({ ...form, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setup">Setup</SelectItem>
                    <SelectItem value="registration_open">Registration Open</SelectItem>
                    <SelectItem value="registration_closed">Registration Closed</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Registration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Registration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Registration Open Date & Time</Label>
                <Input type="datetime-local" value={form.registration_open_date} onChange={e => setForm({ ...form, registration_open_date: e.target.value })} />
              </div>
              <div>
                <Label>Registration Close Date & Time</Label>
                <Input type="datetime-local" value={form.registration_close_date} onChange={e => setForm({ ...form, registration_close_date: e.target.value })} />
              </div>
              <div>
                <Label>Reminder Email to Invited Players — Send At</Label>
                <Input type="datetime-local" value={form.invited_reminder_send_at} onChange={e => setForm({ ...form, invited_reminder_send_at: e.target.value })} />
                <p className="text-xs text-slate-400 mt-1">Invited players who have not confirmed/registered will be reminded to register at this date & time.</p>
              </div>
              <div>
                <Label>Reminder Email to Confirmed Players — Send At</Label>
                <Input type="datetime-local" value={form.reminder_send_at} onChange={e => setForm({ ...form, reminder_send_at: e.target.value, reminder_sent: false })} />
                <p className="text-xs text-slate-400 mt-1">All confirmed players will be emailed a reminder at this date & time.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Player Cap (optional)</Label>
                  <Input type="number" min={1} value={form.player_cap} onChange={e => setForm({ ...form, player_cap: e.target.value })} placeholder="No limit if blank" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    checked={form.waitlist_enabled}
                    onCheckedChange={val => setForm({ ...form, waitlist_enabled: val })}
                    disabled={!form.player_cap}
                  />
                  <Label className="text-sm">Enable Waitlist</Label>
                </div>
              </div>
              {form.waitlist_enabled && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Switch
                    checked={form.auto_promote_waitlist}
                    onCheckedChange={val => setForm({ ...form, auto_promote_waitlist: val })}
                  />
                  <div>
                    <Label className="text-sm font-medium">Auto-promote from Waitlist</Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Automatically move players from waitlist to confirmed status without requiring email confirmation
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Tile Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <Switch
                  checked={form.boutique_tiles_allowed}
                  onCheckedChange={val => setForm({ ...form, boutique_tiles_allowed: val })}
                />
                <div>
                  <Label className="text-sm font-medium">Allow Boutique Tiles</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Allow players to use specialty/boutique tiles in this tournament
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

           {/* Payment Settings */}
           <Card>
            <CardHeader>
              <CardTitle className="font-heading">Payment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Model</Label>
                <Select value={form.payment_model} onValueChange={val => setForm({ ...form, payment_model: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No payment</SelectItem>
                    <SelectItem value="director_pays">Director pays</SelectItem>
                    <SelectItem value="app_fee_only">Player pays app fee only</SelectItem>
                    <SelectItem value="all_in">Player pays entry + app fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.payment_model === 'all_in' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Entry Fee ($)</Label>
                    <Input type="number" min={0} step="0.01" value={form.entry_fee} onChange={e => setForm({ ...form, entry_fee: e.target.value })} />
                  </div>
                  <div>
                    <Label>App Fee ($)</Label>
                    <Input type="number" min={0} step="0.01" value={form.app_fee} onChange={e => setForm({ ...form, app_fee: e.target.value })} />
                  </div>
                </div>
              )}
              {form.payment_model === 'app_fee_only' && (
                <div>
                  <Label>App Fee ($)</Label>
                  <Input type="number" min={0} step="0.01" value={form.app_fee} onChange={e => setForm({ ...form, app_fee: e.target.value })} />
                </div>
              )}
              <PayoutCalculator
                entryFeeDollars={form.entry_fee}
                playerCap={form.player_cap}
                paymentModel={form.payment_model}
                entityType="Tournament"
              />
            </CardContent>
          </Card>

          {/* Game Sets */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Game Sets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Switch
                  checked={form.sets_needed_enabled}
                  onCheckedChange={val => setForm({ ...form, sets_needed_enabled: val, sets_needed: val ? form.sets_needed : '' })}
                />
                <div>
                  <Label className="text-sm font-medium">Ask players to volunteer a game set</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Players will see a checkbox during sign-up asking if they can bring a set
                  </p>
                </div>
              </div>
              {form.sets_needed_enabled && (
                <>
                  <div>
                    <Label>Number of sets needed</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.sets_needed}
                      onChange={e => setForm({ ...form, sets_needed: e.target.value })}
                      placeholder="e.g. 4"
                    />
                  </div>
                  <div>
                    <Label>Set Assignment Mode</Label>
                    <Select value={form.set_assignment_mode} onValueChange={val => setForm({ ...form, set_assignment_mode: val, set_assign_at: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual — admin assigns table numbers</SelectItem>
                        <SelectItem value="auto">Auto — software assigns and notifies volunteers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.set_assignment_mode === 'auto' && (
                    <div>
                      <Label>Auto-assign at (optional)</Label>
                      <Input
                        type="datetime-local"
                        value={form.set_assign_at}
                        onChange={e => setForm({ ...form, set_assign_at: e.target.value })}
                      />
                      <p className="text-xs text-slate-400 mt-1">Leave blank to trigger manually in the Manage Sets page.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Permanent East Players */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Permanent East Player</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Switch
                  checked={form.permanent_east_enabled}
                  onCheckedChange={val => setForm({ ...form, permanent_east_enabled: val, permanent_east_needed: val ? form.permanent_east_needed : '' })}
                />
                <div>
                  <Label className="text-sm font-medium">Ask players to be a permanent East</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Players will see a checkbox during sign-up asking if they're willing to stay in the East seat and not move tables
                  </p>
                </div>
              </div>
              {form.permanent_east_enabled && (
                <div>
                  <Label>Number of permanent Easts needed</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.permanent_east_needed}
                    onChange={e => setForm({ ...form, permanent_east_needed: e.target.value })}
                    placeholder="e.g. 4"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rules & Scoring */}
          <RulesEditor
            variant={form.rules_variant}
            rulesDescription={form.rules_description}
            onChange={({ variant, description }) => {
              setForm({ ...form, rules_variant: variant, rules_description: description });
            }}
          />

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Social Media & Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <Switch
                  checked={form.discoverable}
                  onCheckedChange={val => setForm({ ...form, discoverable: val })}
                />
                <div>
                  <Label className="text-sm font-medium">Make discoverable in app search</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Show this tournament in the public discovery list so players can find and register for it.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Switch
                  checked={form.rsvp_list_public !== false}
                  onCheckedChange={val => setForm({ ...form, rsvp_list_public: val })}
                />
                <div>
                  <Label className="text-sm font-medium">Show confirmed player list publicly</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Displays a count and names of confirmed players on the public tournament page. Only names are shown — never email or phone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-sky-50 rounded-lg border border-sky-200">
                <Switch
                  checked={form.sharing_enabled}
                  onCheckedChange={val => setForm({ ...form, sharing_enabled: val })}
                />
                <div>
                  <Label className="text-sm font-medium">Enable Social Sharing</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Allow players to share the tournament on social media from the tournament page
                  </p>
                </div>
              </div>

              <div>
                <Label>Tournament Hashtag</Label>
                <Input 
                  value={form.hashtag} 
                  onChange={e => setForm({ ...form, hashtag: e.target.value })} 
                  placeholder="e.g. #SpringInvitational2026"
                />
                <p className="text-xs text-slate-400 mt-1">Will be displayed throughout the tournament page</p>
              </div>

              <div>
                <Label>Instagram Handle</Label>
                <Input 
                  value={form.instagram_handle} 
                  onChange={e => setForm({ ...form, instagram_handle: e.target.value })} 
                  placeholder="without @"
                />
              </div>

              <div>
                <Label>Facebook Page</Label>
                <Input 
                  value={form.facebook_handle} 
                  onChange={e => setForm({ ...form, facebook_handle: e.target.value })} 
                  placeholder="Page name or URL"
                />
              </div>

              <div>
                <Label>Twitter/X Handle</Label>
                <Input 
                  value={form.twitter_handle} 
                  onChange={e => setForm({ ...form, twitter_handle: e.target.value })} 
                  placeholder="without @"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Switch
                  checked={form.auto_post_enabled}
                  onCheckedChange={val => setForm({ ...form, auto_post_enabled: val })}
                />
                <div>
                  <Label className="text-sm font-medium">Auto-post Milestones</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Automatically share tournament milestones (registration open, results, etc.)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Save */}
          <div className="flex gap-3 sticky bottom-6">
            <Button
              variant="outline"
              onClick={() => navigate(isCreating ? '/admin/tournaments' : `/admin/tournament/${id}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || saveMutation.isPending}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? (isCreating ? 'Creating...' : 'Saving...') : (isCreating ? 'Create Tournament' : 'Save Changes')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}