import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  courseEnrollments as courseEnrollmentsApi,
  courses as coursesApi,
  leagueMembers as leagueMembersApi,
  leagueRsvps as leagueRsvpsApi,
  leagueSessions as leagueSessionsApi,
  leagues as leaguesApi,
  lessons as lessonsApi,
} from '@/services/resources';
import { asArray } from '@/lib/ensure-array';
import { RELATED_ROW_LIMIT } from '@/lib/query-limits';
import { PLAYER_LIST_STALE_MS } from '@/lib/tournament-registration';
import {
  buildEnrolledCourseFallbackEvents,
  buildLeagueHomeEvents,
  buildLessonHomeEvents,
  dedupeEnrollments,
  filterFullyEnrolledEnrollments,
  indexById,
  indexByKey,
} from '@/lib/home-events';

function sortByDateAsc(a, b) {
  return a.sortDate - b.sortDate;
}

export function useHomeUpcomingEvents(user) {
  const { data: memberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['home-league-memberships', user?.email],
    queryFn: () => leagueMembersApi.filter({ player_email: user.email, active: true }),
    select: asArray,
    enabled: !!user?.email,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const leagueIds = useMemo(
    () => [...new Set(memberships.map((m) => m.league_id).filter(Boolean))],
    [memberships],
  );

  // An array filter value becomes `column = ANY(...)` server-side, so each of the
  // queries below is one request for the whole id set rather than one per id.
  const { data: leagues = [], isLoading: loadingLeagues } = useQuery({
    queryKey: ['home-leagues', leagueIds.join(',')],
    queryFn: () => leaguesApi.filter({ id: leagueIds }, undefined, leagueIds.length),
    select: asArray,
    enabled: leagueIds.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const { data: leagueSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['home-league-sessions', leagueIds.join(',')],
    queryFn: () =>
      leagueSessionsApi.filter(
        { league_id: leagueIds, status: ['upcoming', 'active'] },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    select: asArray,
    enabled: leagueIds.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const sessionIds = useMemo(() => leagueSessions.map((s) => s.id), [leagueSessions]);

  const { data: leagueRsvps = [], isLoading: loadingRsvps } = useQuery({
    queryKey: ['home-league-rsvps', user?.email, sessionIds.join(',')],
    queryFn: () =>
      leagueRsvpsApi.filter(
        { session_id: sessionIds, player_email: user.email },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    select: asArray,
    enabled: !!user?.email && sessionIds.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const { data: enrollmentsById = [], isLoading: loadingEnrollmentsById } = useQuery({
    queryKey: ['home-course-enrollments-pid', user?.id],
    queryFn: () => courseEnrollmentsApi.filter({ player_id: user.id }),
    select: asArray,
    enabled: !!user?.id,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const { data: enrollmentsByEmail = [], isLoading: loadingEnrollmentsByEmail } = useQuery({
    queryKey: ['home-course-enrollments-email', user?.email],
    queryFn: () => courseEnrollmentsApi.filter({ player_email: user.email }),
    select: asArray,
    enabled: !!user?.email,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const enrollments = useMemo(
    () => dedupeEnrollments([...enrollmentsById, ...enrollmentsByEmail]),
    [enrollmentsById, enrollmentsByEmail],
  );

  const enrolledEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === 'enrolled'),
    [enrollments],
  );

  const fullyEnrolledEnrollments = useMemo(
    () => filterFullyEnrolledEnrollments(enrolledEnrollments),
    [enrolledEnrollments],
  );

  const invitedEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === 'invited'),
    [enrollments],
  );

  const courseIds = useMemo(
    () => [...new Set(fullyEnrolledEnrollments.map((e) => e.course_id).filter(Boolean))],
    [fullyEnrolledEnrollments],
  );

  const invitedCourseIds = useMemo(
    () => [...new Set(invitedEnrollments.map((e) => e.course_id).filter(Boolean))],
    [invitedEnrollments],
  );

  const allCourseIds = useMemo(
    () => [...new Set([...courseIds, ...invitedCourseIds])],
    [courseIds, invitedCourseIds],
  );

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['home-courses', allCourseIds.join(',')],
    queryFn: () =>
      coursesApi.filter({ id: allCourseIds }, undefined, allCourseIds.length),
    select: asArray,
    enabled: allCourseIds.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ['home-course-lessons', courseIds.join(',')],
    queryFn: () =>
      lessonsApi.filter(
        { course_id: courseIds, status: ['upcoming', 'active'] },
        undefined,
        RELATED_ROW_LIMIT,
      ),
    select: asArray,
    enabled: courseIds.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const upcomingLeagues = useMemo(() => {
    const leaguesById = indexById(leagues);
    const rsvpsBySessionId = indexByKey(leagueRsvps, 'session_id');
    return buildLeagueHomeEvents(leagueSessions, leaguesById, rsvpsBySessionId);
  }, [leagueSessions, leagues, leagueRsvps]);

  // Enrolled course cards — fully confirmed enrollments only (not invited / payment pending),
  // excluding courses that already have upcoming lesson events.
  const enrolledClasses = useMemo(() => {
    if (fullyEnrolledEnrollments.length === 0) return [];
    const coursesById = indexById(courses);
    const enrollmentsByCourseId = indexByKey(fullyEnrolledEnrollments, 'course_id');
    const lessonEvents = [
      ...buildLessonHomeEvents(lessons, coursesById, enrollmentsByCourseId, 'class'),
      ...buildLessonHomeEvents(lessons, coursesById, enrollmentsByCourseId, 'other'),
    ];
    return buildEnrolledCourseFallbackEvents(courses, fullyEnrolledEnrollments, lessonEvents);
  }, [lessons, courses, fullyEnrolledEnrollments]);

  // Upcoming lesson events — individual sessions from fully enrolled courses only
  const upcomingClasses = useMemo(() => {
    if (fullyEnrolledEnrollments.length === 0) return [];
    const coursesById = indexById(courses);
    const enrollmentsByCourseId = indexByKey(fullyEnrolledEnrollments, 'course_id');
    return buildLessonHomeEvents(lessons, coursesById, enrollmentsByCourseId, 'class');
  }, [lessons, courses, fullyEnrolledEnrollments]);

  // Invited course cards — courses where the player has been invited,
  // excluding any courses the player is already enrolled in
  const invitedClasses = useMemo(() => {
    if (invitedEnrollments.length === 0) return [];
    const enrolledCourseIds = new Set(fullyEnrolledEnrollments.map((e) => e.course_id));
    return invitedEnrollments
      .filter((e) => !enrolledCourseIds.has(e.course_id))
      .map((enrollment) => {
        const course = courses.find((c) => c.id === enrollment.course_id);
        if (!course) return null;
        const date = course.start_date || course.end_date || new Date().toISOString().split('T')[0];
        return {
          id: `invited:${course.id}`,
          type: 'class',
          title: course.name,
          detail: course.instructor_name ? `Instructor: ${course.instructor_name}` : null,
          date,
          startTime: null,
          location: course.location,
          statusLabel: 'Invited',
          isLive: false,
          sortDate: new Date(`${date}T12:00:00`),
          lesson: null,
          course,
          enrollment,
        };
      })
      .filter(Boolean)
      .sort(sortByDateAsc);
  }, [invitedEnrollments, courses]);

  const upcomingOther = useMemo(() => {
    if (fullyEnrolledEnrollments.length === 0) return [];
    const coursesById = indexById(courses);
    const enrollmentsByCourseId = indexByKey(fullyEnrolledEnrollments, 'course_id');
    return buildLessonHomeEvents(lessons, coursesById, enrollmentsByCourseId, 'other');
  }, [lessons, courses, fullyEnrolledEnrollments]);

  const isLoading =
    (!!user?.email && loadingMemberships) ||
    (leagueIds.length > 0 && (loadingLeagues || loadingSessions)) ||
    (!!user?.email && sessionIds.length > 0 && loadingRsvps) ||
    (!!user?.id && loadingEnrollmentsById) ||
    (!!user?.email && loadingEnrollmentsByEmail) ||
    (courseIds.length > 0 && (loadingCourses || loadingLessons));

  return {
    upcomingLeagues,
    enrolledClasses,
    upcomingClasses,
    invitedClasses,
    upcomingOther,
    isLoading,
  };
}