import { callAction } from '@/services/actions';
import { isCapacitorNative, isCapacitorShellContext, getStripeReturnUrls } from '@/lib/capacitor-utils';
import { getCoursePaymentPath } from '@/lib/course-mobile-payment';

export const PENDING_COURSE_PAYMENT_ENROLLMENT_KEY = 'mm_pending_course_payment_enrollment_id';

export function getCourseCheckoutUrls(courseId) {
  return getStripeReturnUrls({
    successPath: `/app/courses/${courseId}?paymentSuccess=true`,
    cancelPath: `/app/courses/${courseId}?payment=cancelled`,
  });
}

export function invalidateCourseEnrollmentQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['course-enrollment-detail'] });
  queryClient.invalidateQueries({ queryKey: ['my-course-enrollments'] });
}

export function formatCoursePrice(cents) {
  if (!cents || cents <= 0) return null;
  return `$${(cents / 100).toFixed(0)}`;
}

export function courseRequiresPayment(course) {
  return Boolean(course?.price && course.price > 0);
}

/**
 * Start course payment — native apps use PaymentSheet; web uses Stripe Hosted Checkout redirect.
 */
export async function startCourseCheckout({ courseId, enrollmentId, navigate }) {
  if (window.self !== window.top) {
    throw new Error('Please open the app directly to complete payment.');
  }

  if (enrollmentId) {
    localStorage.setItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY, enrollmentId);
  }

  if (isCapacitorNative() && typeof navigate === 'function') {
    navigate(getCoursePaymentPath(courseId, enrollmentId));
    return { mobileFlow: true };
  }

  const { success_url, cancel_url } = getCourseCheckoutUrls(courseId);
  const data = await callAction('courseCheckout', {
    course_id: courseId,
    enrollment_id: enrollmentId,
    success_url,
    cancel_url,
    native_checkout: isCapacitorShellContext(),
    mobile: false,
  });

  // Subscription fully covered the course fee — no Stripe redirect needed
  if (data?.subscription_covered) {
    return { mobileFlow: false, session_id: null, subscription_covered: true };
  }

  if (!data?.url) {
    throw new Error(data?.error || 'Could not start checkout. Please try again.');
  }

  window.location.href = data.url;
  return { mobileFlow: false, session_id: data.session_id };
}