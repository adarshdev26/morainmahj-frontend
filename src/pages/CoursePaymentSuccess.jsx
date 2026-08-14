import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getCourseDetailPathAfterPayment } from '@/lib/course-mobile-payment';

/**
 * Legacy route — immediately redirects to Class Details after payment.
 */
export default function CoursePaymentSuccess() {
  const { id: courseId } = useParams();
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get('enrollment_id') || searchParams.get('enrollmentId');
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) {
      navigate('/app/courses', { replace: true });
      return;
    }
    navigate(getCourseDetailPathAfterPayment(courseId, enrollmentId), { replace: true });
  }, [courseId, enrollmentId, navigate]);

  return null;
}
