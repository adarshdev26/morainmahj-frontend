import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { courseEnrollments as courseEnrollmentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowUp, Trash2 } from 'lucide-react';

export default function CourseWaitlistTab({ courseId, course }) {
  const queryClient = useQueryClient();
  const [promoting, setPromoting] = useState(null);

  const { data: waitlisted = [] } = useQuery({
    queryKey: ['course-waitlist', courseId],
    queryFn: () => courseEnrollmentsApi.filter(
      { course_id: courseId, status: 'waitlisted' },
      'enrolled_at'
    ),
  });

  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ['course-enrollment-count', courseId],
    queryFn: async () => {
      const enrolled = await courseEnrollmentsApi.filter({
        course_id: courseId,
        status: 'enrolled'
      });
      return enrolled.length;
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (enrollmentId) =>
      callAction('promoteFromWaitlistCourse', {
        courseId,
        enrollmentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-waitlist', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollment-count', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      setPromoting(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (enrollmentId) =>
      courseEnrollmentsApi.remove(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-waitlist', courseId] });
    },
  });

  const spotsAvailable = course.enrollment_cap
    ? Math.max(0, course.enrollment_cap - enrollmentCount)
    : null;

  if (!course.waitlist_enabled) {
    return (
      <div className="flex items-center gap-3 p-6 bg-slate-50 rounded-lg border border-slate-200">
        <AlertCircle className="h-5 w-5 text-slate-400" />
        <p className="text-sm text-slate-600">Waitlist is not enabled for this course.</p>
      </div>
    );
  }

  if (waitlisted.length === 0) {
    return (
      <div className="flex items-center gap-3 p-6 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">No students on the waitlist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {spotsAvailable !== null && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">{spotsAvailable}</span> spot{spotsAvailable !== 1 ? 's' : ''} available
              {course.enrollment_cap && ` out of ${course.enrollment_cap}`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {waitlisted.map((student, idx) => (
          <Card key={student.id}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{student.player_name}</p>
                <p className="text-xs text-slate-500">{student.player_email}</p>
                {student.player_phone && (
                  <p className="text-xs text-slate-500 mt-1">{student.player_phone}</p>
                )}
                <Badge variant="outline" className="mt-2">Position #{idx + 1}</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setPromoting(student.id);
                    promoteMutation.mutate(student.id);
                  }}
                  disabled={promoting === student.id || promoteMutation.isPending}
                >
                  <ArrowUp className="h-4 w-4" />
                  {promoting === student.id ? 'Promoting...' : 'Promote'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(student.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}