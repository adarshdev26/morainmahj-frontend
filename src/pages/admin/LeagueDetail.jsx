import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueMembers as leagueMembersApi, leagues as leaguesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, Users, Calendar, MessageSquare, Link2, Trophy, Map, Globe, Sparkles, Ticket, UserPlus } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import PlayerSharingToggle from '@/components/shared/PlayerSharingToggle';
import ShareInviteStats from '@/components/shared/ShareInviteStats';
import LeagueRosterTab from '@/components/leagues/LeagueRosterTab';
import LeagueLeaderboard from '@/components/leagues/LeagueLeaderboard';
import LeagueSubstitutesTab from '@/components/leagues/LeagueSubstitutesTab';
import LeagueSessionsTab from '@/components/leagues/LeagueSessionsTab';
import LeagueSocialTab from '@/components/leagues/LeagueSocialTab';
import LeagueInviteTab from '@/components/leagues/LeagueInviteTab';
import LeaguePrizeTab from '@/components/leagues/LeaguePrizeTab';
import RoomMapEditor from '@/components/roommap/RoomMapEditor';
import CommunityFeed from '@/components/community/CommunityFeed';
import CommunityRulesAdmin from '@/components/community/CommunityRulesAdmin';
import LeagueWebsiteTab from '@/components/leagues/LeagueWebsiteTab';
import SpecialHandsCardManager from '@/components/admin/SpecialHandsCardManager';
import RaffleAdmin from '@/components/raffle/RaffleAdmin';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function LeagueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateLeague = useMutation({
    mutationFn: (data) => leaguesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['league', id] }),
  });

  const { data: league, isLoading } = useQuery({
    queryKey: ['league', id],
    queryFn: () => leaguesApi.filter({ id }).then(r => r[0]),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['league-members', id],
    queryFn: () => leagueMembersApi.filter({ league_id: id }),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!league) return <div className="p-8 text-slate-400">League not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BackButton to="/admin/leagues" />
          {league.logo_url && (
            <img
              src={league.logo_url}
              alt={league.name}
              className="h-12 w-12 rounded-xl object-cover border border-border shrink-0"
            />
          )}
          <h1 className="text-3xl font-heading font-bold text-slate-900">{league.name}</h1>
        </div>
        <div className="flex items-center justify-between mb-6 text-sm text-slate-500">
          <div>
            {league.day_of_week != null ? DAY_NAMES[league.day_of_week] + 's' : ''}
            {league.start_time ? ` · ${league.start_time}` : ''}
            {league.end_time ? `–${league.end_time}` : ''}
            {league.location ? ` · ${league.location}` : ''}
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/admin/leagues/${id}/setup`)}>
            <Settings className="h-4 w-4" /> Edit Settings
          </Button>
        </div>
        <div className="mb-4 bg-white border border-border rounded-xl px-4 py-1">
          <PlayerSharingToggle
            enabled={league.player_sharing_enabled !== false}
            onChange={(val) => updateLeague.mutate({ player_sharing_enabled: val })}
            saving={updateLeague.isPending}
          />
          <ShareInviteStats contextType="league" contextId={id} />
        </div>

        <Tabs defaultValue="sessions">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="sessions" className="gap-2"><Calendar className="h-4 w-4" /> Sessions</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2"><Trophy className="h-4 w-4" /> Leaderboard</TabsTrigger>
            <TabsTrigger value="roster" className="gap-2"><Users className="h-4 w-4" /> Roster ({members.length})</TabsTrigger>
            <TabsTrigger value="subs" className="gap-2"><UserPlus className="h-4 w-4" /> Substitutes</TabsTrigger>
            <TabsTrigger value="invite" className="gap-2"><Link2 className="h-4 w-4" /> Invite & Share</TabsTrigger>
            {league.prizes_enabled && (
              <TabsTrigger value="prizes" className="gap-2"><Trophy className="h-4 w-4" /> Prizes</TabsTrigger>
            )}
            <TabsTrigger value="raffle" className="gap-2"><Ticket className="h-4 w-4" /> Raffle</TabsTrigger>
            {league.social_enabled && (
              <TabsTrigger value="social" className="gap-2"><MessageSquare className="h-4 w-4" /> Social</TabsTrigger>
            )}
            <TabsTrigger value="room_map" className="gap-2"><Map className="h-4 w-4" /> Room Map</TabsTrigger>
            <TabsTrigger value="website" className="gap-2"><Globe className="h-4 w-4" /> Website</TabsTrigger>
            <TabsTrigger value="community" className="gap-2"><MessageSquare className="h-4 w-4" /> Community</TabsTrigger>
            <TabsTrigger value="special" className="gap-2"><Sparkles className="h-4 w-4" /> Special Hands</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <LeagueSessionsTab league={league} />
          </TabsContent>
          <TabsContent value="leaderboard">
            <LeagueLeaderboard league={league} />
          </TabsContent>
          <TabsContent value="roster">
            <LeagueRosterTab league={league} members={members} />
          </TabsContent>
          <TabsContent value="subs">
            <LeagueSubstitutesTab league={league} members={members} />
          </TabsContent>
          <TabsContent value="invite">
            <LeagueInviteTab league={league} members={members} />
          </TabsContent>
          {league.prizes_enabled && (
            <TabsContent value="prizes">
              <LeaguePrizeTab league={league} />
            </TabsContent>
          )}
          <TabsContent value="raffle">
            <RaffleAdmin leagueId={id} />
          </TabsContent>
          {league.social_enabled && (
            <TabsContent value="social">
              <LeagueSocialTab league={league} />
            </TabsContent>
          )}
          <TabsContent value="special">
            <SpecialHandsCardManager contextType="league" contextId={id} contextName={league.name} />
          </TabsContent>
          <TabsContent value="room_map">
            <RoomMapEditor leagueId={id} numTables={Math.ceil(members.length / 4)} />
          </TabsContent>
          <TabsContent value="website">
            <LeagueWebsiteTab league={league} updateLeague={updateLeague} />
          </TabsContent>
          <TabsContent value="community">
            <div className="space-y-6">
              <CommunityRulesAdmin contextType="league" contextId={id} />
              <hr className="border-border" />
              <CommunityFeed contextType="league" contextId={id} isEnrolled={true} isAdmin={true} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}