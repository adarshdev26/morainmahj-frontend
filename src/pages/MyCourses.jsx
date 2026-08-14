import React, { useState } from 'react';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi, lessons as lessonsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, MapPin, Clock, ChevronRight, DollarSign, CheckCircle2, User, Share2 } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import EventShareSheet from '@/components/shared/EventShareSheet';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import { useAuth } from '@/lib/AuthContext';
import { RELATED_ROW_LIMIT } from '@/lib/query-limits';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const STATUS_COLORS = {
  enrolled: 'bg-green-100 text-green-700',
  payment_pending: 'bg-amber-100 text-amber-700',
  waitlisted: 'bg-amber-100 text-amber-700',
  invited: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  enrolled: 'Enrolled',
  payment_pending: 'Payment Pending',
  waitlisted: 'Waitlisted',
  invited: 'Invited',
  cancelled: 'Cancelled',
};

function getEnrollmentDisplayKey(enrollment) {
  if (!enrollment) return 'invited';
  if (enrollment.status === 'enrolled' && enrollment.payment_status === 'pending') {
    return 'payment_pending';
  }
  return enrollment.status || 'invited';
}

function safeFormatDate(dateValue, pattern) {
  if (!dateValue) return null;
  try {
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return null;
    return format(dt, pattern);
  } catch {
    return null;
  }
}

export default function MyCourses() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [showShare, setShowShare] = useState(null); // course object when sharing
  const [shareTooltip, setShareTooltip] = useState(null); // course id showing tooltip

  const { data: enrollmentsByPlayerId = [], isLoading: isLoadingByPid } = useQuery({
    queryKey: ['my-course-enrollments-pid', user?.id],
    queryFn: () => courseEnrollmentsApi.filter({ player_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: enrollmentsByEmail = [], isLoading: isLoadingByEmail } = useQuery({
    queryKey: ['my-course-enrollments-email', user?.email],
    queryFn: () => courseEnrollmentsApi.filter({ player_email: user?.email }),
    enabled: !!user?.email,
  });

  const enrollments = React.useMemo(() => {
    const byId = new Map();
    const currentEmail = normalizeEmail(user?.email);

    for (const enrollment of [...enrollmentsByPlayerId, ...enrollmentsByEmail]) {
      if (!enrollment?.id) continue;
      const samePlayer = user?.id && enrollment.player_id === user.id;
      const sameEmail = currentEmail && normalizeEmail(enrollment.player_email) === currentEmail;
      if (!samePlayer && !sameEmail) continue;
      if (!byId.has(enrollment.id)) byId.set(enrollment.id, enrollment);
    }

    return Array.from(byId.values());
  }, [enrollmentsByPlayerId, enrollmentsByEmail, user?.email, user?.id]);

  const courseIds = [...new Set(enrollments.map(e => e.course_id).filter(Boolean))];

  const { data: allCourses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['my-courses-list', courseIds.join(',')],
    queryFn: () => coursesApi.filter({ id: courseIds }, undefined, courseIds.length),
    enabled: courseIds.length > 0,
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ['my-courses-lessons', courseIds.join(',')],
    queryFn: async () => {
      const lessons = await lessonsApi.filter(
        { course_id: courseIds, status: 'upcoming' },
        undefined,
        RELATED_ROW_LIMIT,
      );
      return lessons.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    },
    enabled: courseIds.length > 0,
  });

  const isNative = isCapacitorNative();

  const coursesWithNextLesson = allCourses.map(course => {
    const enrollment = enrollments.find(e => e.course_id === course.id);
    const nextLesson = allLessons
      .filter(l => l.course_id === course.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    return { course, enrollment, nextLesson };
  });

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col min-h-screen native-app-shell">
        <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
          <div className="flex items-center gap-3">
            <BackButton to="/app" onPrimary={isNative} />
            <h1 className="font-heading font-bold text-xl leading-tight">My Courses</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen native-app-shell">
      {showShare && (
        <EventShareSheet
          contextType="course"
          contextId={showShare.id}
          contextName={showShare.name}
          onClose={() => setShowShare(null)}
        />
      )}
      <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
        <div className="flex items-center gap-3">
          <BackButton to="/app" onPrimary={isNative} />
          <div>
            <h1 className="font-heading font-bold text-xl leading-tight">My Courses</h1>
            <p className="text-primary-foreground/60 text-xs mt-0.5">{coursesWithNextLesson.length} course{coursesWithNextLesson.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 space-y-3 overflow-y-auto native-app-scroll native-bottom-scroll-pad web-bottom-scroll-pad-lg">
        {coursesWithNextLesson.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">You're not enrolled in any courses yet</p>
            <p className="text-sm mt-1">Check your email for course invitations!</p>
          </div>
        ) : (
          coursesWithNextLesson.map(({ course, enrollment, nextLesson }) => (
            <Card
              key={course.id}
              className="active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => {
                if (shareTooltip === course.id) {
                  setShareTooltip(null);
                  return;
                }
                navigate(`/app/courses/${course.id}`);
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (shareTooltip === course.id) {
                          // second tap — open share sheet
                          setShareTooltip(null);
                          setShowShare(course);
                        } else {
                          setShareTooltip(course.id);
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {shareTooltip === course.id && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-foreground text-background text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg z-10 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareTooltip(null);
                          setShowShare(course);
                        }}
                      >
                        Share this course
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-base">{course.name}</p>
                    {course.instructor_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />{course.instructor_name}
                      </p>
                    )}
                    {course.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{course.location}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {course.start_date && course.end_date && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {safeFormatDate(course.start_date, 'MMM d') || 'TBD'} – {safeFormatDate(course.end_date, 'MMM d, yyyy') || 'TBD'}
                        </span>
                      )}
                      {course.price && course.price > 0 && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />{(course.price / 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={STATUS_COLORS[getEnrollmentDisplayKey(enrollment)]}>
                      {STATUS_LABELS[getEnrollmentDisplayKey(enrollment)]}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                </div>

                {nextLesson && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Next session</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {safeFormatDate(nextLesson.date, 'EEE, MMM d') || 'Date TBD'}
                      </span>
                      {nextLesson.start_time && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{nextLesson.start_time}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}