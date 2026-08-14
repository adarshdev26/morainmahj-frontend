import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { me as authMe } from '@/services/authApi';
import { inviteUser } from '@/services/usersApi';
import { leagues as leaguesApi, managers as managersApi, organizations as organizationsApi, registrations as registrationsApi, tournaments as tournamentsApi, users as usersApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { RELATED_ROW_LIMIT } from '@/lib/query-limits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Calendar, Trophy, Users, DollarSign, TrendingUp,
  Plus, Mail, CheckCircle, Clock, AlertCircle, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import OrganizationBrandingCard from '@/components/organization/OrganizationBrandingCard';

export default function OrganizationDashboard() {
  const [orgData, setOrgData] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingManagerEmail, setInvitingManagerEmail] = useState('');
  const [invitingAdminEmail, setInvitingAdminEmail] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, organizationId: authOrgId } = useAuth();

  // Fallback: fetch the full User entity record to reliably get organization_id
  // (authMe() doesn't always include custom fields like organization_id)
  const { data: fullUser, isLoading: loadingFullUser } = useQuery({
    queryKey: ['user-full', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const users = await usersApi.filter({ id: user.id });
      return users?.[0] || null;
    },
    enabled: !!user?.id,
  });

  const organizationId = fullUser?.organization_id || authOrgId || user?.organization_id || user?.data?.organization_id || null;

  const { data: organization = null, isLoading: loadingOrg } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const orgs = await organizationsApi.filter({ id: organizationId });
      return orgs?.[0] || null;
    },
    enabled: !!organizationId,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['org-tournaments', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return tournamentsApi.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['org-leagues', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return leaguesApi.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['org-managers', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return managersApi.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['org-registrations', tournaments],
    queryFn: () => {
      const tournamentIds = tournaments.map(t => t.id).filter(Boolean);
      if (!tournamentIds.length) return [];
      return registrationsApi.filter(
        { tournament_id: tournamentIds },
        undefined,
        RELATED_ROW_LIMIT,
      );
    },
    enabled: tournaments.length > 0,
  });

  // Invite manager mutation
  const inviteManagerMutation = useMutation({
    mutationFn: async () => {
      if (!invitingManagerEmail) {
        toast.error('Please enter an email address');
        return;
      }
      await managersApi.create({
        organization_id: organization.id,
        user_email: invitingManagerEmail,
        role: 'manager',
        status: 'invited',
        invited_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setInvitingManagerEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-managers'] });
      toast.success('Manager invitation sent');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to invite manager');
    },
  });

  // Invite organizer_admin mutation
  const inviteAdminMutation = useMutation({
    mutationFn: async () => {
      if (!invitingAdminEmail) {
        toast.error('Please enter an email address');
        return;
      }
      await inviteUser(invitingAdminEmail, 'organizer_admin');
      // Also create a Manager record linking them to this org
      await managersApi.create({
        organization_id: organization.id,
        user_email: invitingAdminEmail,
        role: 'admin',
        status: 'invited',
        invited_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setInvitingAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-managers'] });
      toast.success('Organizer admin invitation sent');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to invite organizer admin');
    },
  });

  if (loadingOrg || loadingFullUser) {
    return <div className="p-6 text-center text-muted-foreground">Loading organization...</div>;
  }

  if (!organization) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground mb-4">You don't have an organization assigned yet.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }

  // Calculate metrics
  const totalTournaments = tournaments.length;
  const totalLeagues = leagues.length;
  const totalPlayers = registrations.length;
  const totalRevenue = registrations.reduce((sum, r) => sum + (Number(r.payment_amount) || 0), 0) / 100; // Convert from cents

  const activeManagers = managers.filter(m => m.status === 'active').length;
  const pendingInvites = managers.filter(m => m.status === 'invited').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold">{organization.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{organization.description}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTournaments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Leagues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeagues}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlayers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Managers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeManagers}</div>
              {pendingInvites > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{pendingInvites} pending</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Organization Branding */}
        <OrganizationBrandingCard organization={organization} />

        {/* Tabs */}
        <Tabs defaultValue="tournaments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="leagues">Leagues</TabsTrigger>
            <TabsTrigger value="managers">Managers</TabsTrigger>
          </TabsList>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Tournaments</h2>
              <Button size="sm" className="gap-2" onClick={() => navigate('/admin/tournament/new/setup')}>
                <Plus className="h-4 w-4" /> New Tournament
              </Button>
            </div>
            {tournaments.length > 0 ? (
              <div className="grid gap-4">
                {tournaments.map(t => (
                  <Card key={t.id} className="hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{t.name}</h3>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(t.date).toLocaleDateString()}
                          </div>
                          {t.location && (
                            <p className="text-sm text-muted-foreground mt-1">{t.location}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className="mb-2">
                            {t.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{t.num_rounds} rounds</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No tournaments yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leagues Tab */}
          <TabsContent value="leagues" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Leagues</h2>
              <Button size="sm" className="gap-2" onClick={() => navigate('/admin/leagues/new')}>
                <Plus className="h-4 w-4" /> New League
              </Button>
            </div>
            {leagues.length > 0 ? (
              <div className="grid gap-4">
                {leagues.map(l => (
                  <Card key={l.id} className="hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{l.name}</h3>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][l.day_of_week]} at {l.start_time}
                          </div>
                          {l.location && (
                            <p className="text-sm text-muted-foreground mt-1">{l.location}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className="mb-2">
                            {l.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{l.num_rounds} rounds</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No leagues yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Managers Tab */}
          <TabsContent value="managers" className="space-y-4">
            <div className="space-y-4">
              {/* Invite Organizer Admin */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Invite Organizer Admin
                  </CardTitle>
                  <CardDescription>Give a co-director full org-level access to manage all tournaments, leagues, and courses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="director@example.com"
                      value={invitingAdminEmail}
                      onChange={(e) => setInvitingAdminEmail(e.target.value)}
                      type="email"
                    />
                    <Button
                      onClick={() => inviteAdminMutation.mutate()}
                      disabled={inviteAdminMutation.isPending}
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4" /> Invite Admin
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Invite Co-Manager */}
              <Card>
                <CardHeader>
                  <CardTitle>Invite Co-Manager</CardTitle>
                  <CardDescription>Add a manager to help run specific tournaments and leagues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="manager@example.com"
                      value={invitingManagerEmail}
                      onChange={(e) => setInvitingManagerEmail(e.target.value)}
                      type="email"
                    />
                    <Button
                      onClick={() => inviteManagerMutation.mutate()}
                      disabled={inviteManagerMutation.isPending}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" /> Invite
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {managers.length > 0 ? (
                <div className="grid gap-4">
                  {managers.map(m => (
                    <Card key={m.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold">{m.user_name || m.user_email}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{m.user_email}</p>
                            {m.tournament_id && (
                              <p className="text-xs text-muted-foreground mt-2">Tournament: {m.tournament_id}</p>
                            )}
                            {m.league_id && (
                              <p className="text-xs text-muted-foreground">League: {m.league_id}</p>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <Badge
                              variant={m.status === 'active' ? 'default' : 'secondary'}
                              className="gap-1"
                            >
                              {m.status === 'active' ? (
                                <>
                                  <CheckCircle className="h-3 w-3" /> Active
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" /> Invited
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {m.role}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No managers yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}