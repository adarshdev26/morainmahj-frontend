import React, { useState } from 'react';
import { courses as coursesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Settings, BookOpen, Users, FileText, Link, AlertCircle, MessageSquare, Globe } from 'lucide-react';
import PlayerSharingToggle from '@/components/shared/PlayerSharingToggle';
import ShareInviteStats from '@/components/shared/ShareInviteStats';
import CourseLessonsTab from '@/components/courses/CourseLessonsTab';
import CourseStudentsTab from '@/components/courses/CourseStudentsTab';
import CourseMaterialsTab from '@/components/courses/CourseMaterialsTab';
import CourseRegistrationTab from '@/components/courses/CourseRegistrationTab';
import CourseWaitlistTab from '@/components/courses/CourseWaitlistTab';
import CommunityFeed from '@/components/community/CommunityFeed';
import CommunityRulesAdmin from '@/components/community/CommunityRulesAdmin';
import CourseWebsiteTab from '@/components/course-website/CourseWebsiteTab';

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

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateCourse = useMutation({
    mutationFn: (data) => coursesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', id] }),
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.filter({ id }).then(r => r[0]),
  });

  if (isLoading) return <div className="text-slate-400 text-sm p-8">Loading...</div>;
  if (!course) return <div className="text-slate-400 text-sm p-8">Course not found.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/courses')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-heading font-bold text-slate-800 truncate">{course.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[course.status]}`}>
              {STATUS_LABELS[course.status]}
            </span>
          </div>
          {course.instructor_name && (
            <p className="text-slate-500 text-sm mt-0.5">Instructor: {course.instructor_name}</p>
          )}
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={() => navigate(`/admin/courses/${id}/setup`)}>
          <Settings className="h-4 w-4" /> Edit Course
        </Button>
      </div>

      <div className="mb-4 bg-white border border-border rounded-xl px-4 py-1">
        <PlayerSharingToggle
          enabled={course.player_sharing_enabled !== false}
          onChange={(val) => updateCourse.mutate({ player_sharing_enabled: val })}
          saving={updateCourse.isPending}
        />
        <ShareInviteStats contextType="course" contextId={id} />
      </div>

      <Tabs defaultValue="lessons">
        <TabsList className="mb-6">
          <TabsTrigger value="lessons" className="gap-2"><BookOpen className="h-4 w-4" /> Lessons</TabsTrigger>
          <TabsTrigger value="students" className="gap-2"><Users className="h-4 w-4" /> Students</TabsTrigger>
          {course.waitlist_enabled && (
            <TabsTrigger value="waitlist" className="gap-2"><AlertCircle className="h-4 w-4" /> Waitlist</TabsTrigger>
          )}
          <TabsTrigger value="materials" className="gap-2"><FileText className="h-4 w-4" /> Materials</TabsTrigger>
          <TabsTrigger value="registration" className="gap-2"><Link className="h-4 w-4" /> Registration</TabsTrigger>
          <TabsTrigger value="community" className="gap-2"><MessageSquare className="h-4 w-4" /> Community</TabsTrigger>
          <TabsTrigger value="website" className="gap-2"><Globe className="h-4 w-4" /> Website</TabsTrigger>
        </TabsList>
        <TabsContent value="website"><CourseWebsiteTab course={course} updateCourse={updateCourse} /></TabsContent>
        <TabsContent value="lessons"><CourseLessonsTab courseId={id} /></TabsContent>
        <TabsContent value="students"><CourseStudentsTab courseId={id} course={course} /></TabsContent>
        {course.waitlist_enabled && (
          <TabsContent value="waitlist"><CourseWaitlistTab courseId={id} course={course} /></TabsContent>
        )}
        <TabsContent value="materials"><CourseMaterialsTab courseId={id} /></TabsContent>
        <TabsContent value="registration"><CourseRegistrationTab courseId={id} course={course} /></TabsContent>
        <TabsContent value="community">
          <div className="space-y-6">
            <CommunityRulesAdmin contextType="course" contextId={id} />
            <hr className="border-border" />
            <CommunityFeed contextType="course" contextId={id} isEnrolled={true} isAdmin={true} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}