import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PENDING_COURSE_PAYMENT_ENROLLMENT_KEY } from '@/lib/course-checkout';
import {
  getCoursePaymentPath,
  getCourseDetailPathAfterPayment,
  waitForCourseSessionPaymentConfirmed,
} from '@/lib/course-mobile-payment';

/**
 * Legacy hosted Stripe Checkout return page — verifies payment then opens Class Details.
 */
export default function CoursePaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const result = searchParams.get('result');
  const sessionId = searchParams.get('session_id');
  const courseId = searchParams.get('course_id');
  const enrollmentIdParam = searchParams.get('enrollment_id');
  const success = result === 'success';

  const [phase, setPhase] = useState(success ? 'verifying' : 'cancelled');

  useEffect(() => {
    const enrollmentId =
      enrollmentIdParam
      || localStorage.getItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY)
      || '';

    if (!success) {
      if (courseId && enrollmentId) {
        navigate(getCoursePaymentPath(courseId, enrollmentId), { replace: true });
        return;
      }
      if (courseId) {
        navigate(`/app/courses/${courseId}`, { replace: true });
        return;
      }
      navigate('/app/courses', { replace: true });
      return;
    }

    if (!sessionId || !courseId) {
      setPhase('error');
      return;
    }

    let cancelled = false;

    (async () => {
      setPhase('verifying');
      const payment = await waitForCourseSessionPaymentConfirmed(sessionId, {
        enrollmentId,
        maxWaitMs: 45000,
        intervalMs: 1500,
      });

      if (cancelled) return;

      if (payment?.paid) {
        localStorage.removeItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY);
        navigate(
          getCourseDetailPathAfterPayment(courseId, enrollmentId || payment.enrollment_id),
          { replace: true },
        );
        return;
      }

      setPhase('error');
    })();

    return () => {
      cancelled = true;
    };
  }, [success, sessionId, courseId, enrollmentIdParam, navigate]);

  if (phase === 'verifying') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-4"
        style={{ background: '#1e2d4d', color: '#f8fafc', fontFamily: 'Georgia, serif' }}
      >
        <Loader2 className="h-12 w-12 animate-spin text-green-400" />
        <h1 className="text-xl font-semibold">Confirming payment…</h1>
        <p className="text-sm opacity-90 max-w-sm">
          Please wait while we verify your enrollment with Stripe.
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-4"
        style={{ background: '#1e2d4d', color: '#f8fafc', fontFamily: 'Georgia, serif' }}
      >
        <XCircle className="h-14 w-14 text-amber-400" strokeWidth={1.5} />
        <h1 className="text-xl font-semibold">Payment not confirmed yet</h1>
        <p className="text-sm opacity-90 max-w-sm">
          If you were charged, your enrollment will update shortly. Return to the course to check status.
        </p>
        {courseId && (
          <button
            type="button"
            className="mt-2 rounded-lg bg-[#c5a95a] px-4 py-2 text-[#1e2d4d] font-semibold"
            onClick={() => navigate(`/app/courses/${courseId}`, { replace: true })}
          >
            Back to course
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-4"
      style={{ background: '#1e2d4d', color: '#f8fafc', fontFamily: 'Georgia, serif' }}
    >
      <CheckCircle2 className="h-14 w-14 text-green-400" strokeWidth={1.5} />
      <h1 className="text-xl font-semibold">Returning to course…</h1>
    </div>
  );
}
