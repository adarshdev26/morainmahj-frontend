/**
 * Home page upcoming events for leagues, classes, and other activities.
 * Tournaments remain handled separately in Home.jsx.
 */

export const LESSON_CLASS_TYPES = new Set(['instruction', 'review']);
export const LESSON_OTHER_TYPES = new Set(['play_day', 'social', 'mixed']);

const UPCOMING_SESSION_STATUSES = new Set(['upcoming', 'active']);
const ACTIVE_ENROLLMENT_STATUSES = new Set(['enrolled', 'waitlisted']);

export function isUpcomingDate(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  } catch {
    return false;
  }
}

/** Returns true if a course (by date range) is currently active or upcoming. */
export function isCourseActiveOrUpcoming(course) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = course.start_date
    ? new Date(course.start_date.includes('T') ? course.start_date : `${course.start_date}T12:00:00`)
    : null;
  const end = course.end_date
    ? new Date(course.end_date.includes('T') ? course.end_date : `${course.end_date}T12:00:00`)
    : null;

  // No dates at all — can't determine, treat as inactive
  if (!start && !end) return false;

  // Ongoing: started and hasn't ended yet (or no end date)
  if (start && start <= today && (!end || end >= today)) return true;

  // Upcoming: starts in the future
  if (start && start >= today) return true;

  // Only has end date and it hasn't passed yet
  if (!start && end && end >= today) return true;

  return false;
}

export function getLeagueRsvpLabel(rsvp) {
  if (!rsvp) return 'No response';
  if (rsvp.status === 'yes') return 'Going';
  if (rsvp.status === 'waitlist') return 'Waitlisted';
  return "Can't go";
}

/** Confirmed enrollment — matches CourseDetail isEnrolled (not invited, not awaiting payment). */
export function isFullyEnrolledEnrollment(enrollment) {
  return enrollment?.status === 'enrolled' && enrollment.payment_status !== 'pending';
}

export function filterFullyEnrolledEnrollments(enrollments) {
  return enrollments.filter(isFullyEnrolledEnrollment);
}

export function getEnrollmentLabel(enrollment) {
  if (!enrollment) return 'Enrolled';
  if (enrollment.status === 'enrolled' && enrollment.payment_status === 'pending') {
    return 'Payment Pending';
  }
  if (enrollment.status === 'enrolled') return 'Enrolled';
  if (enrollment.status === 'waitlisted') return 'Waitlisted';
  if (enrollment.status === 'invited') return 'Invited';
  return enrollment.status || 'Enrolled';
}

export function getLessonTypeLabel(type) {
  const labels = {
    instruction: 'Instruction',
    review: 'Review',
    play_day: 'Play Day',
    social: 'Social',
    mixed: 'Mixed',
  };
  return labels[type] || 'Activity';
}

function sortByDateAsc(a, b) {
  return a.sortDate - b.sortDate;
}

export function buildLeagueHomeEvents(sessions, leaguesById, rsvpsBySessionId) {
  // Group sessions by league_id and keep only the earliest upcoming session per league
  const byLeague = {};
  sessions
    .filter((s) => UPCOMING_SESSION_STATUSES.has(s.status) && isUpcomingDate(s.date))
    .forEach((session) => {
      const league = leaguesById[session.league_id];
      if (!league) return;
      const sortDate = new Date(`${session.date}T12:00:00`);
      const existing = byLeague[session.league_id];
      if (!existing || sortDate < existing.sortDate) {
        byLeague[session.league_id] = { session, league, sortDate };
      }
    });

  return Object.values(byLeague)
    .map(({ session, league, sortDate }) => {
      const rsvp = rsvpsBySessionId[session.id];
      return {
        id: `league:${league.id}`,
        type: 'league',
        title: league.name,
        detail: session.date,
        date: session.date,
        startTime: session.start_time,
        location: session.location || league?.location,
        statusLabel: session.status === 'active' ? 'Live' : getLeagueRsvpLabel(rsvp),
        isLive: session.status === 'active',
        sortDate,
        session,
        league,
        rsvp,
      };
    })
    .sort(sortByDateAsc);
}

export function buildLessonHomeEvents(lessons, coursesById, enrollmentsByCourseId, lessonCategory) {
  const typeFilter =
    lessonCategory === 'class'
      ? (type) => LESSON_CLASS_TYPES.has(type) || !type
      : (type) => LESSON_OTHER_TYPES.has(type);

  return lessons
    .filter(
      (lesson) =>
        lesson.status !== 'cancelled' &&
        lesson.status !== 'completed' &&
        isUpcomingDate(lesson.date) &&
        typeFilter(lesson.type) &&
        isFullyEnrolledEnrollment(enrollmentsByCourseId[lesson.course_id]),
    )
    .map((lesson) => {
      const course = coursesById[lesson.course_id];
      const enrollment = enrollmentsByCourseId[lesson.course_id];
      const eventType = lessonCategory === 'class' ? 'class' : 'other';
      return {
        id: `lesson:${lesson.id}`,
        type: eventType,
        title: lesson.title || course?.name || 'Class session',
        detail: course?.name,
        date: lesson.date,
        startTime: lesson.start_time,
        location: lesson.location || course?.location,
        statusLabel: lesson.status === 'active' ? 'Live' : getEnrollmentLabel(enrollment),
        lessonTypeLabel: getLessonTypeLabel(lesson.type),
        isLive: lesson.status === 'active',
        sortDate: new Date(`${lesson.date}T12:00:00`),
        lesson,
        course,
        enrollment,
      };
    })
    .sort(sortByDateAsc);
}

export function indexById(items) {
  const map = {};
  for (const item of items) {
    if (item?.id) map[item.id] = item;
  }
  return map;
}

export function indexByKey(items, key) {
  const map = {};
  for (const item of items) {
    const k = item?.[key];
    if (k) map[k] = item;
  }
  return map;
}

export function filterActiveEnrollments(enrollments) {
  return enrollments.filter((e) => ACTIVE_ENROLLMENT_STATUSES.has(e.status));
}

/** Merge enrollments from player_id and player_email queries (same pattern as Registration). */
export function dedupeEnrollments(enrollments) {
  const seen = new Set();
  return enrollments.filter((e) => {
    if (!e?.id || seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/**
 * Course-level cards when the player is enrolled but has no upcoming lesson rows yet.
 * Mirrors league membership + session showing even before RSVP.
 */
export function buildEnrolledCourseFallbackEvents(courses, activeEnrollments, lessonsWithEvents) {
  const courseIdsWithLessons = new Set(lessonsWithEvents.map((e) => e.course?.id).filter(Boolean));

  return activeEnrollments
    .filter((e) => !courseIdsWithLessons.has(e.course_id))
    .map((enrollment) => {
      const course = courses.find((c) => c.id === enrollment.course_id);
      if (!course) return null;

      // Show all enrolled courses regardless of date — similar to how
      // tournaments display past/completed events alongside upcoming ones.
      const date = course.start_date || course.end_date || new Date().toISOString().split('T')[0];

      return {
        id: `course:${course.id}`,
        type: 'class',
        title: course.name,
        detail: course.instructor_name ? `Instructor: ${course.instructor_name}` : null,
        date,
        startTime: null,
        location: course.location,
        statusLabel: getEnrollmentLabel(enrollment),
        isLive: false,
        sortDate: new Date(`${date}T12:00:00`),
        lesson: null,
        course,
        enrollment,
      };
    })
    .filter(Boolean)
    .sort(sortByDateAsc);
}