import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { me as authMe, redirectToLogin } from '@/services/authApi';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi, lessons as lessonsApi, teachingMaterials as teachingMaterialsApi } from '@/services/resources';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { isCapacitorNative, openExternalLink } from '@/lib/capacitor-utils';
import { handleCoursePaymentSuccess, handleFreeCourseEnrollmentSuccess } from '@/lib/course-payment-success';
import {
  startCourseCheckout,
  PENDING_COURSE_PAYMENT_ENROLLMENT_KEY,
} from '@/lib/course-checkout';
import { getCoursePaymentPath } from '@/lib/course-mobile-payment';
import { 
  BookOpen, Calendar, MapPin, Clock, DollarSign, FileText, ExternalLink, 
  Video, Link as LinkIcon, StickyNote, ChevronLeft, CheckCircle2, XCircle,
  User, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { navigateBackFromDetail } from '@/lib/discover-navigation';
import PdfViewer from '@/components/courses/PdfViewer';
import PaymentLegalNotice from '@/components/shared/PaymentLegalNotice';
import { resolveSecureFileUrl } from '@/lib/secure-file';

const TYPE_ICONS = { pdf: FileText, link: LinkIcon, video: Video, notes: StickyNote };
const TYPE_COLORS = { pdf: 'text-red-500', link: 'text-blue-500', video: 'text-purple-500', notes: 'text-amber-500' };
const LESSON_TYPE_COLORS = {
  instruction: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  play_day: 'bg-green-100 text-green-700',
  social: 'bg-pink-100 text-pink-700',
  mixed: 'bg-purple-100 text-purple-700',
};
const LESSON_TYPE_LABELS = { instruction: 'Instruction', review: 'Review', play_day: 'Play Day', social: 'Social', mixed: 'Mixed' };

function MaterialLink({ material, className, onOpenPdf, iconClassName = 'h-3 w-3' }) {
  const Icon = TYPE_ICONS[material.type] || FileText;
  const isPdf = material.type === 'pdf';
  const [opening, setOpening] = React.useState(false);

  const openExternalMaterial = async (e) => {
    if (!isCapacitorNative()) return;
    e.preventDefault();
    if (opening) return;
    setOpening(true);
    try {
      const signedUrl = await resolveSecureFileUrl(material.url);
      await openExternalLink(signedUrl);
    } catch {
      // fall back to raw url
      await openExternalLink(material.url);
    } finally {
      setOpening(false);
    }
  };

  const handleOpenPdf = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const signedUrl = await resolveSecureFileUrl(material.url);
      onOpenPdf({ url: signedUrl, title: material.title });
    } catch {
      alert('Unable to open this document. Please try again.');
    } finally {
      setOpening(false);
    }
  };

  if (!material.url) {
    return (
      <span className={className}>
        <Icon className={`${iconClassName} shrink-0`} />
        {material.title}
      </span>
    );
  }

  if (isPdf) {
    return (
      <button
        type="button"
        onClick={handleOpenPdf}
        className={`${className}${opening ? ' opacity-60 pointer-events-none' : ''}`}
        aria-busy={opening}
      >
        <Icon className={`${iconClassName} shrink-0`} />
        {material.title}
      </button>
    );
  }

  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openExternalMaterial}
      className={`${className}${opening ? ' opacity-60 pointer-events-none' : ''}`}
      aria-busy={opening}
    >
      <Icon className={`${iconClassName} shrink-0`} />
      {material.title}
    </a>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [comment, setComment] = useState('');
  const [paying, setPaying] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const paymentHandledRef = useRef(false);

  React.useEffect(() => {
    authMe().then(setUser).catch(() => {});
  }, []);

  const paymentResult = searchParams.get('payment');
  const paymentSuccess = searchParams.get('paymentSuccess') === 'true';
  const paymentEnrollmentId = searchParams.get('enrollment_id') || searchParams.get('enrollmentId');

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course-detail', id],
    queryFn: () => coursesApi.filter({ id }).then(r => r[0]),
    enabled: !!id,
  });

  useEffect(() => {
    const isLegacyWebSuccess = paymentResult === 'success';
    const isNativePaymentSuccess = paymentSuccess;
    if ((!isLegacyWebSuccess && !isNativePaymentSuccess) || paymentHandledRef.current) return;
    if (!user?.id) return;

    paymentHandledRef.current = true;
    localStorage.removeItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY);
    queryClient.invalidateQueries({ queryKey: ['course-enrollment-detail'] });
    queryClient.invalidateQueries({ queryKey: ['my-course-enrollments'] });

    if (user?.id) {
      handleCoursePaymentSuccess({
        courseId: id,
        playerId: user.id,
        course,
        toast,
        queryClient,
      });
    } else {
      toast({ title: 'Payment successful!', description: 'You are enrolled in this course.' });
    }

    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    next.delete('paymentSuccess');
    next.delete('enrollment_id');
    next.delete('enrollmentId');
    setSearchParams(next, { replace: true });
  }, [
    paymentResult,
    paymentSuccess,
    paymentEnrollmentId,
    searchParams,
    setSearchParams,
    toast,
    queryClient,
    id,
    user?.id,
    course,
  ]);

  useEffect(() => {
    if (!paymentResult || paymentResult === 'success' || paymentHandledRef.current) return;

    if (paymentResult === 'cancelled') {
      paymentHandledRef.current = true;
      localStorage.removeItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY);
      toast({
        title: 'Payment cancelled',
        description: 'You can complete payment anytime from this page.',
        variant: 'destructive',
      });

      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
    }
  }, [paymentResult, searchParams, setSearchParams, toast]);

  const { data: enrollment } = useQuery({
    queryKey: ['course-enrollment-detail', id, user?.id],
    queryFn: () => courseEnrollmentsApi.filter({ course_id: id, player_id: user?.id }).then(r => r[0]),
    enabled: !!id && !!user?.id,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['course-lessons-detail', id],
    queryFn: () => lessonsApi.filter({ course_id: id }, 'lesson_number'),
    enabled: !!id,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['course-materials-detail', id],
    queryFn: () => teachingMaterialsApi.filter({ course_id: id }, 'sort_order'),
    enabled: !!id,
  });

  const now = new Date();
  const isStudentVisible = (item) => {
    if (!item.visible_to_students_at) return true;
    const visibilityDate = new Date(item.visible_to_students_at);
    return visibilityDate <= now;
  };
  const visibleLessons = lessons.filter(isStudentVisible);
  const visibleMaterials = materials.filter(isStudentVisible);

  const beginCheckout = async (enrollmentId) => {
    if (isCapacitorNative()) {
      navigate(getCoursePaymentPath(id, enrollmentId));
      return;
    }
    await startCourseCheckout({ courseId: id, enrollmentId, navigate });
  };

  const enrollMutation = useMutation({
    mutationFn: async (enrollmentData) => {
      if (enrollmentData.payment_required) {
        const { payment_required: _, ...createData } = enrollmentData;
        const enrollment = await courseEnrollmentsApi.create(createData);
        if (isCapacitorNative()) {
          localStorage.setItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY, enrollment.id);
          navigate(getCoursePaymentPath(id, enrollment.id));
          return { enrollment, payment_required: true, navigatedToPayment: true };
        }
        await beginCheckout(enrollment.id);
        return { enrollment, payment_required: true };
      }
      const { payment_required: _, ...createData } = enrollmentData;
      const enrollment = await courseEnrollmentsApi.create(createData);
      return { enrollment, payment_required: false };
    },
    onSuccess: ({ enrollment, payment_required }) => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollment-detail'] });
      queryClient.invalidateQueries({ queryKey: ['my-course-enrollments'] });
      if (!payment_required && enrollment?.id && user?.id) {
        handleFreeCourseEnrollmentSuccess({
          enrollmentId: enrollment.id,
          courseId: id,
          playerId: user.id,
          course,
          toast,
          queryClient,
        });
      }
    },
    onError: (err) => {
      toast({
        title: 'Enrollment failed',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCompletePayment = async () => {
    if (!enrollment?.id) return;
    if (isCapacitorNative()) {
      navigate(getCoursePaymentPath(id, enrollment.id));
      return;
    }
    setPaying(true);
    try {
      await beginCheckout(enrollment.id);
    } catch (err) {
      const description =
        err?.response?.data?.error
        || err?.data?.error
        || err?.message
        || 'Could not start checkout. Please try again.';
      toast({
        title: 'Payment unavailable',
        description,
        variant: 'destructive',
      });
    } finally {
      setPaying(false);
    }
  };

  const handleEnroll = (status = 'enrolled') => {
    if (!user) {
      redirectToLogin(`/app/courses/${id}`);
      return;
    }
    const paymentRequired = course.price && course.price > 0 && status === 'enrolled';
    enrollMutation.mutate({
      course_id: id,
      player_id: user.id,
      player_email: user.email,
      player_name: user.full_name,
      player_phone: user.data?.phone || '',
      status,
      payment_required: paymentRequired,
      payment_status: paymentRequired ? 'pending' : 'not_required',
      payment_amount: course.price || 0,
      enrolled_at: new Date().toISOString(),
      notes: comment.trim() || undefined,
    });
  };

  if (!course) {
    return (
      <div className="flex flex-col min-h-screen native-app-shell">
        <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigateBackFromDetail(navigate, location, '/app/courses')} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading font-bold text-xl leading-tight">Course Details</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const needsPayment = enrollment?.status === 'enrolled' && enrollment?.payment_status === 'pending';
  const isEnrolled = enrollment?.status === 'enrolled' && !needsPayment;
  const isWaitlisted = enrollment?.status === 'waitlisted';
  const isInvited = !enrollment || enrollment.status === 'invited';

  return (
    <div className="flex flex-col min-h-screen native-app-shell">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateBackFromDetail(navigate, location, '/app/courses')} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-xl leading-tight truncate">{course.name}</h1>
            {course.instructor_name && (
              <p className="text-primary-foreground/60 text-xs mt-0.5 truncate">
                <User className="h-3 w-3 inline mr-1" />{course.instructor_name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 space-y-4 overflow-y-auto native-app-scroll native-bottom-scroll-pad web-bottom-scroll-pad-md">
        {/* Course Info Card */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {course.description && (
                  <p className="text-sm text-foreground mb-3">{course.description}</p>
                )}
                <div className="space-y-2 text-sm text-muted-foreground">
                  {course.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />{course.location}
                    </p>
                  )}
                  {(course.start_date || course.end_date) && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {course.start_date ? format(new Date(course.start_date), 'MMM d') : ''}
                      {course.start_date && course.end_date ? ' – ' : ''}
                      {course.end_date ? format(new Date(course.end_date), 'MMM d, yyyy') : ''}
                    </p>
                  )}
                  {course.price && course.price > 0 && (
                    <p className="flex items-center gap-2 text-green-600">
                      <DollarSign className="h-4 w-4" />{(course.price / 100).toFixed(0)}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={
                isEnrolled ? 'bg-green-100 text-green-700' :
                needsPayment ? 'bg-amber-100 text-amber-700' :
                isWaitlisted ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }>
                {isEnrolled ? 'Enrolled' : needsPayment ? 'Payment Pending' : isWaitlisted ? 'Waitlisted' : 'Invited'}
              </Badge>
            </div>

            {/* Action Buttons */}
            {isInvited && (
              <div className="space-y-2 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-2">Confirm your attendance</p>
                {course.price && course.price > 0 ? (
                  <>
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleEnroll('enrolled')}
                      disabled={enrollMutation.isPending}
                    >
                      <CreditCard className="h-4 w-4" />
                      Enroll & Pay ${(course.price / 100).toFixed(0)}
                    </Button>
                    <PaymentLegalNotice className="text-[11px] text-muted-foreground text-center leading-relaxed" />
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700" 
                      onClick={() => handleEnroll('enrolled')}
                      disabled={enrollMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" /> I'm Going
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2" 
                      onClick={() => handleEnroll('waitlisted')}
                      disabled={enrollMutation.isPending}
                    >
                      Waitlist
                    </Button>
                  </div>
                )}
                {course.rsvp_comments_enabled && (
                  <Textarea
                    placeholder="Add a comment (optional)…"
                    rows={2}
                    className="resize-none text-sm mt-2"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                )}
              </div>
            )}

            {needsPayment && (
              <div className="space-y-2 pt-3 border-t border-border">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> You will be notified when the payment is verified
                </p>
                <Button
                  className="w-full gap-2"
                  disabled
                >
                  <CreditCard className="h-4 w-4" />
                  Payment Approval Pending
                </Button>
              </div>
            )}

            {isEnrolled && (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> You're enrolled in this course!
                </p>
              </div>
            )}

            {isWaitlisted && (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> You're on the waitlist. We'll notify you if a spot opens up.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {!isEnrolled && (visibleLessons.length > 0 || visibleMaterials.length > 0) && (
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {needsPayment
                  ? 'Your payment is under review. The schedule and materials unlock after approval.'
                  : isWaitlisted
                  ? 'Course materials will be available once you are enrolled.'
                  : 'Enroll in this course to access the schedule and materials.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lessons Schedule — enrolled students only */}
        {isEnrolled && visibleLessons.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Schedule
            </h3>
            <div className="space-y-2">
              {visibleLessons.map(lesson => {
                const lessonMaterials = visibleMaterials.filter(m => m.lesson_id === lesson.id);
                return (
                  <Card key={lesson.id} className={lesson.status === 'completed' ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {lesson.lesson_number || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{lesson.title || `Lesson ${lesson.lesson_number}`}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LESSON_TYPE_COLORS[lesson.type]}`}>
                              {LESSON_TYPE_LABELS[lesson.type]}
                            </span>
                            {lesson.status === 'completed' && <Badge variant="secondary" className="text-xs">Completed</Badge>}
                            {lesson.status === 'active' && <Badge className="text-xs">Today</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-0.5">
                            {lesson.date && <span>{format(new Date(lesson.date), 'EEEE, MMM d, yyyy')}</span>}
                            {lesson.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />{lesson.start_time}{lesson.end_time ? ` – ${lesson.end_time}` : ''}
                              </span>
                            )}
                            {lesson.location && <span>{lesson.location}</span>}
                          </div>
                          {lesson.agenda && <p className="text-sm text-foreground mt-1">{lesson.agenda}</p>}
                          {lessonMaterials.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {lessonMaterials.map(m => (
                                <MaterialLink
                                  key={m.id}
                                  material={m}
                                  onOpenPdf={setSelectedPdf}
                                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border hover:bg-accent transition-colors ${TYPE_COLORS[m.type]}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Course-wide Materials — enrolled students only */}
        {isEnrolled && visibleMaterials.filter(m => !m.lesson_id).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Course Materials
            </h3>
            <div className="flex flex-wrap gap-2">
              {visibleMaterials.filter(m => !m.lesson_id).map(m => {
                if (m.url) {
                  return (
                    <MaterialLink
                      key={m.id}
                      material={m}
                      onOpenPdf={setSelectedPdf}
                      iconClassName="h-4 w-4"
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border hover:bg-accent transition-colors ${TYPE_COLORS[m.type]}`}
                    />
                  );
                }

                const Icon = TYPE_ICONS[m.type] || FileText;
                return (
                  <Card key={m.id} className="w-full">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${TYPE_COLORS[m.type]}`} />
                        <span className="font-medium text-sm text-foreground">{m.title}</span>
                      </div>
                      {m.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.content}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      {selectedPdf && (
        <PdfViewer
          url={selectedPdf.url}
          title={selectedPdf.title}
          onClose={() => setSelectedPdf(null)}
          allowDownload={!!course.allow_downloads}
        />
      )}
    </div>
  );
}