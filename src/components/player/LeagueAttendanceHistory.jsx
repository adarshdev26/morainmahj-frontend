import { useQuery } from '@tanstack/react-query';
import { leagueMembers as leagueMembersApi, leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi, leagues as leaguesApi } from '@/services/resources';
import { RELATED_ROW_LIMIT } from '@/lib/query-limits';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Briefcase, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 text-center">
      <Icon className={`h-5 w-5 mb-1 ${color}`} />
      <span className="text-2xl font-bold text-slate-800">{value}</span>
      <span className="text-xs text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}

export default function LeagueAttendanceHistory({ userEmail }) {
  const { data: memberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['attendance-memberships', userEmail],
    queryFn: () => leagueMembersApi.filter({ player_email: userEmail }),
    enabled: !!userEmail,
  });

  const leagueIds = [...new Set(memberships.map(m => m.league_id))];

  const { data: allLeagues = [] } = useQuery({
    queryKey: ['attendance-leagues', leagueIds.join(',')],
    queryFn: () => leaguesApi.filter({ id: leagueIds }, undefined, leagueIds.length),
    enabled: leagueIds.length > 0,
  });

  const { data: allSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['attendance-sessions', leagueIds.join(',')],
    queryFn: () =>
      leagueSessionsApi.filter({ league_id: leagueIds }, undefined, RELATED_ROW_LIMIT),
    enabled: leagueIds.length > 0,
  });

  const pastSessionIds = allSessions
    .filter(s => s.date < new Date().toISOString().slice(0, 10))
    .map(s => s.id);

  const { data: myRsvps = [], isLoading: loadingRsvps } = useQuery({
    queryKey: ['attendance-rsvps', userEmail, pastSessionIds.join(',')],
    queryFn: () =>
      leagueRsvpsApi.filter(
        { session_id: pastSessionIds, player_email: userEmail },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    enabled: !!userEmail && pastSessionIds.length > 0,
  });

  const isLoading = loadingMemberships || loadingSessions || loadingRsvps;

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400 text-sm">Loading attendance history…</div>;
  }

  if (memberships.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No league memberships found.</p>
      </div>
    );
  }

  const leagueMap = Object.fromEntries(allLeagues.map(l => [l.id, l]));
  const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]));
  const rsvpBySession = Object.fromEntries(myRsvps.map(r => [r.session_id, r]));

  // Global stats
  const pastSessions = allSessions.filter(s => s.date < new Date().toISOString().slice(0, 10));
  const attended = myRsvps.filter(r => r.status === 'yes').length;
  const missed = myRsvps.filter(r => r.status === 'no').length;
  const noResponse = pastSessions.length - myRsvps.length;
  const hosted = myRsvps.filter(r => r.volunteering_set).length;
  const attendanceRate = pastSessions.length > 0 ? Math.round((attended / pastSessions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Global Summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Overall Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={CheckCircle2} label="Sessions Attended" value={attended} color="text-green-500" />
          <StatCard icon={XCircle} label="Sessions Missed" value={missed + noResponse} color="text-red-400" />
          <StatCard icon={Briefcase} label="Sets Hosted" value={hosted} color="text-blue-500" />
          <StatCard icon={TrendingUp} label="Attendance Rate" value={`${attendanceRate}%`} color="text-amber-500" />
        </div>
      </div>

      {/* Per-league breakdown */}
      {leagueIds.map(leagueId => {
        const league = leagueMap[leagueId];
        if (!league) return null;

        const leaguePastSessions = pastSessions
          .filter(s => s.league_id === leagueId)
          .sort((a, b) => b.date.localeCompare(a.date));

        if (leaguePastSessions.length === 0) return null;

        const leagueAttended = leaguePastSessions.filter(s => rsvpBySession[s.id]?.status === 'yes').length;
        const leagueMissed = leaguePastSessions.length - leagueAttended;

        return (
          <div key={leagueId}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800">{league.name}</h3>
              <span className="text-xs text-slate-400">{leagueAttended}/{leaguePastSessions.length} attended</span>
            </div>

            {/* Attendance bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${leaguePastSessions.length > 0 ? (leagueAttended / leaguePastSessions.length) * 100 : 0}%` }}
              />
            </div>

            {/* Session list */}
            <div className="space-y-1.5">
              {leaguePastSessions.map(session => {
                const rsvp = rsvpBySession[session.id];
                const status = rsvp?.status;
                const didHost = rsvp?.volunteering_set;

                return (
                  <div key={session.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50 text-sm">
                    {status === 'yes' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : status === 'no' ? (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-300 shrink-0" />
                    )}
                    <span className="text-slate-600 flex-1">
                      {format(new Date(session.date + 'T12:00:00'), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {didHost && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0 h-5">
                          <Briefcase className="h-3 w-3 mr-0.5" /> Hosted Set
                        </Badge>
                      )}
                      {!status && <span className="text-xs text-slate-300">No response</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}