import { callAction } from '@/services/actions';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi } from '@/services/resources';
import { format } from 'date-fns';

function invalidateCourseEnrollmentQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['course-enrollment-detail'] });
  queryClient.invalidateQueries({ queryKey: ['my-course-enrollments'] });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCourseEnrollment(courseId, playerId) {
  if (!courseId || !playerId) return null;
  const rows = await courseEnrollmentsApi.filter({
    course_id: courseId,
    player_id: playerId,
  });
  return rows[0] ?? null;
}

export async function waitForPaidEnrollment(courseId, playerId, { maxWaitMs = 12000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const enrollment = await fetchCourseEnrollment(courseId, playerId);
    if (enrollment?.payment_status === 'paid') return enrollment;
    await sleep(intervalMs);
  }
  return fetchCourseEnrollment(courseId, playerId);
}

async function waitForPushConfirmation(courseId, playerId, { maxWaitMs = 8000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const enrollment = await fetchCourseEnrollment(courseId, playerId);
    if (enrollment?.payment_confirmation_push_sent_at) return enrollment;
    if (enrollment?.payment_confirmation_push_failed) return enrollment;
    await sleep(intervalMs);
  }
  return fetchCourseEnrollment(courseId, playerId);
}

export async function trySendCourseEnrollmentPush(enrollmentId) {
  if (!enrollmentId) return false;
  try {
    const res = await callAction('notifyCourseEnrollment', { enrollment_id: enrollmentId });
    return Boolean(res?.pushSent);
  } catch (err) {
    console.warn('[course-payment] notifyCourseEnrollment failed:', err);
    return false;
  }
}

function formatCourseDate(dateStr) {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function buildEnrollmentConfirmationDescription(course, enrollment) {
  const parts = [];
  const courseName = course?.name || 'this course';
  parts.push(`You're enrolled in ${courseName}.`);

  if (course?.instructor_name) parts.push(`Instructor: ${course.instructor_name}.`);
  if (course?.location) parts.push(`Location: ${course.location}.`);

  if (course?.start_date) {
    const start = formatCourseDate(course.start_date);
    const end = course.end_date ? formatCourseDate(course.end_date) : '';
    parts.push(end && end !== start ? `Dates: ${start} – ${end}.` : `Date: ${start}.`);
  }

  const amount = enrollment?.payment_amount ?? course?.price;
  if (amount && amount > 0 && enrollment?.payment_status === 'paid') {
    parts.push(`Paid: $${(amount / 100).toFixed(2)}.`);
  }

  return parts.join(' ');
}

async function resolveCourseData(courseId, course) {
  if (course) return course;
  if (!courseId) return null;
  return coursesApi.filter({ id: courseId }).then((r) => r[0]);
}

function showEnrollmentFallbackToast({ toast, course, enrollment }) {
  toast({
    title: 'Enrollment confirmed!',
    description: buildEnrollmentConfirmationDescription(course, enrollment),
  });
}

/**
 * Try server push (webhook + client backup). Show toast only when push could not be sent.
 */
async function deliverEnrollmentConfirmation({ enrollmentId, courseId, playerId, course, toast, queryClient }) {
  invalidateCourseEnrollmentQueries(queryClient);

  let enrollment = await fetchCourseEnrollment(courseId, playerId);
  if (!enrollment && enrollmentId) {
    enrollment = await courseEnrollmentsApi.filter({ id: enrollmentId }).then((r) => r[0]);
  }
  if (!enrollment) return;

  if (!enrollment.payment_confirmation_push_sent_at) {
    enrollment = (await waitForPushConfirmation(courseId, playerId)) ?? enrollment;
  }

  if (enrollment.payment_confirmation_push_sent_at) {
    invalidateCourseEnrollmentQueries(queryClient);
    return;
  }

  const pushSent = await trySendCourseEnrollmentPush(enrollment.id);
  if (pushSent) {
    invalidateCourseEnrollmentQueries(queryClient);
    return;
  }

  const courseData = await resolveCourseData(courseId, course);
  showEnrollmentFallbackToast({ toast, course: courseData, enrollment });
}

/**
 * After Stripe checkout — wait for paid status, then push with toast fallback.
 */
export async function handleCoursePaymentSuccess({ courseId, playerId, course, toast, queryClient }) {
  invalidateCourseEnrollmentQueries(queryClient);

  const enrollment = await waitForPaidEnrollment(courseId, playerId);
  if (enrollment?.payment_status !== 'paid') return;

  await deliverEnrollmentConfirmation({
    enrollmentId: enrollment.id,
    courseId,
    playerId,
    course,
    toast,
    queryClient,
  });
}

/**
 * Free course enrollment — push first, toast fallback if push fails.
 */
export async function handleFreeCourseEnrollmentSuccess({ enrollmentId, courseId, playerId, course, toast, queryClient }) {
  await deliverEnrollmentConfirmation({
    enrollmentId,
    courseId,
    playerId,
    course,
    toast,
    queryClient,
  });
}