import React from 'react';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useOrganization } from '@/hooks/useOrganization';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  enrollment_open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  draft: 'Draft',
  enrollment_open: 'Enrollment Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AdminCourses() {
  const navigate = useNavigate();
  const { orgFilter } = useOrganization();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => coursesApi.filter(orgFilter(), '-created_date'),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-all-enrollments'],
    queryFn: () => courseEnrollmentsApi.filter(orgFilter(), '-created_date', 500),
  });

  const enrollmentCountByCourse = enrollments.reduce((acc, e) => {
    if (e.status === 'enrolled') acc[e.course_id] = (acc[e.course_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Teaching Courses</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your teaching programs and student enrollments</p>
        </div>
        <Button onClick={() => navigate('/admin/courses/new')} className="gap-2">
          <Plus className="h-4 w-4" /> New Course
        </Button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading...</p>}

      {!isLoading && courses.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No courses yet</p>
          <p className="text-sm mt-1">Create your first teaching course to get started.</p>
          <Button className="mt-4" onClick={() => navigate('/admin/courses/new')}>
            <Plus className="h-4 w-4 mr-2" /> Create Course
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {courses.map(course => (
          <Card
            key={course.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/admin/courses/${course.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-slate-800 text-lg truncate">{course.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[course.status]}`}>
                      {STATUS_LABELS[course.status]}
                    </span>
                  </div>
                  {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    {course.instructor_name && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> {course.instructor_name}
                      </span>
                    )}
                    {course.location && (
                      <span>{course.location}</span>
                    )}
                    {(course.start_date || course.end_date) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {course.start_date ? format(new Date(course.start_date), 'MMM d') : ''}
                        {course.start_date && course.end_date ? ' – ' : ''}
                        {course.end_date ? format(new Date(course.end_date), 'MMM d, yyyy') : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {enrollmentCountByCourse[course.id] || 0} student{enrollmentCountByCourse[course.id] !== 1 ? 's' : ''}
                      {course.enrollment_cap ? ` / ${course.enrollment_cap}` : ''}
                    </span>
                    {course.price > 0 && (
                      <span className="font-medium text-slate-700">${(course.price / 100).toFixed(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}