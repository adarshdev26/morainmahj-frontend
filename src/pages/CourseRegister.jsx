import React, { useState, useEffect } from 'react';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi, lessons as lessonsApi, shareInvites as shareInvitesApi } from '@/services/resources';
import { me } from '@/services/authApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BookOpen, MapPin, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import BackButton from '@/components/shared/BackButton';
import { useToast } from '@/components/ui/use-toast';

const discoverBackProps = {
  fallbackPath: '/app',
};

const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

export default function CourseRegister() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('courseId');
  const refToken = params.get('ref');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!refToken) return;
    shareInvitesApi.filter({ token: refToken })
      .then(invites => {
        if (invites[0]) shareInvitesApi.update(invites[0].id, { times_used: (invites[0].times_used || 0) + 1 });
      })
      .catch(() => {});
  }, [refToken]);

  useEffect(() => {
    me()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const [form, setForm] = useState({ player_name: '', player_email: '', player_phone: '' });
  const [done, setDone] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-public', courseId],
    queryFn: () => coursesApi.filter({ id: courseId }).then(r => r[0]),
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons-public', courseId],
    queryFn: () => lessonsApi.filter({ course_id: courseId }, 'lesson_number'),
    enabled: !!courseId,
  });

  const enroll = useMutation({
    mutationFn: async () => {
      const playerName = form.player_name.trim();
      const playerEmail = normalizeEmail(form.player_email);
      const playerPhone = form.player_phone.trim();

      if (!playerName || !playerEmail) {
        throw new Error('Name and email are required.');
      }

      const allCourseEnrollments = await courseEnrollmentsApi.filter({ course_id: courseId });

      const existingEnrollment = allCourseEnrollments.find((enrollment) => {
        if (currentUser?.id && enrollment.player_id === currentUser.id) return true;
        return normalizeEmail(enrollment.player_email) === playerEmail;
      });

      const payload = {
        course_id: courseId,
        player_id: currentUser?.id || undefined,
        player_name: playerName,
        player_email: playerEmail,
        player_phone: playerPhone,
        status: 'invited',
        enrolled_at: existingEnrollment?.enrolled_at || new Date().toISOString(),
      };

      if (existingEnrollment?.id) {
        return courseEnrollmentsApi.update(existingEnrollment.id, payload);
      }

      return courseEnrollmentsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-course-enrollments'] });
      setDone(true);
    },
    onError: (err) => {
      toast({
        title: 'Registration failed',
        description: err?.message || 'Could not register for this class. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (!courseId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton {...discoverBackProps} />
            <div className="flex-1" />
          </div>

          <Card className="w-full">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-slate-500">Class not found. Please check the link you were given.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-lg w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton {...discoverBackProps} />
            <div className="flex-1" />
          </div>
          <p className="text-slate-400 text-center py-8">Loading...</p>
        </div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton {...discoverBackProps} />
            <div className="flex-1" />
          </div>

          <Card className="w-full">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-slate-500">Class not found. Please check the link you were given.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
    >
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton {...discoverBackProps} />
          <div className="flex-1" />
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-slate-800">{course.name}</h1>
          {course.description && <p className="text-slate-500 mt-2">{course.description}</p>}
        </div>

        {/* Course Info */}
        <Card>
          <CardContent className="pt-5 space-y-2 text-sm text-slate-600">
            {course.instructor_name && (
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Instructor: {course.instructor_name}</div>
            )}
            {course.location && (
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {course.location}</div>
            )}
            {course.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                {format(new Date(course.start_date), 'MMMM d, yyyy')}
                {course.end_date && ` – ${format(new Date(course.end_date), 'MMMM d, yyyy')}`}
              </div>
            )}
            {lessons.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{lessons.length} Sessions</p>
                <ul className="space-y-0.5">
                  {lessons.map((l, i) => (
                    <li key={l.id} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                      {l.title || `Session ${i + 1}`}
                      {l.date && <span className="text-slate-400 ml-auto">{format(new Date(l.date), 'MMM d')}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Form */}
        {done ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold text-slate-800">You're registered!</h2>
              <p className="text-slate-500 text-sm">We'll be in touch with details. See you in class!</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Register for this Course</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input className="mt-1" value={form.player_name} onChange={e => set('player_name', e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input className="mt-1" type="email" value={form.player_email} onChange={e => set('player_email', e.target.value)} placeholder="you@email.com" />
              </div>
              <div>
                <Label>Phone <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
                <Input className="mt-1" type="tel" value={form.player_phone} onChange={e => set('player_phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <Button
                className="w-full"
                disabled={!form.player_name || !form.player_email || enroll.isPending}
                onClick={() => enroll.mutate()}
              >
                {enroll.isPending ? 'Submitting...' : 'Register Now'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}