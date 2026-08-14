import React, { useState, useEffect } from 'react';
import { courses as coursesApi, lessons as lessonsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Save, Plus, Trash2, Link2, ExternalLink, Copy } from 'lucide-react';
import RulesEditor from '@/components/shared/RulesEditor';
import ImageUpload from '@/components/shared/ImageUpload';
import PayoutCalculator from '@/components/shared/PayoutCalculator';
import { useAuth } from '@/lib/AuthContext';

const DEFAULTS = {
  name: '',
  description: '',
  logo_url: null,
  instructor_name: '',
  instructor_email: '',
  location: '',
  start_date: '',
  end_date: '',
  status: 'draft',
  enrollment_cap: '',
  waitlist_enabled: false,
  price: 0,
  payment_model: 'none',
  auto_invite_enabled: false,
  invite_days_before: 3,
  invite_email_subject: '',
  invite_email_body: '',
  enrollment_email_subject: '',
  enrollment_email_body: '',
  notes: '',
  allow_downloads: false,
  rules_variant: 'nmjl',
  rules_description: '',
};

const EMPTY_LESSON = { title: '', type: 'instruction', date: '', start_time: '', end_time: '', location: '' };
const LESSON_TYPES = [
  { value: 'instruction', label: 'Instruction' },
  { value: 'review', label: 'Review' },
  { value: 'play_day', label: 'Play Day' },
  { value: 'social', label: 'Social' },
  { value: 'mixed', label: 'Mixed' },
];

export default function CourseSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';
  const { user } = useAuth();

  const [form, setForm] = useState(DEFAULTS);
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const DEFAULT_LESSONS = [
    { title: 'Lesson 1 – Introduction', type: 'instruction', date: '', start_time: '', end_time: '', location: '' },
    { title: 'Lesson 2 – Intermediate Skills', type: 'instruction', date: '', start_time: '', end_time: '', location: '' },
    { title: 'Lesson 3 – Advanced Techniques', type: 'instruction', date: '', start_time: '', end_time: '', location: '' },
    { title: 'Practice Round 1', type: 'play_day', date: '', start_time: '', end_time: '', location: '' },
    { title: 'Practice Round 2', type: 'play_day', date: '', start_time: '', end_time: '', location: '' },
    { title: 'Practice Round 3', type: 'play_day', date: '', start_time: '', end_time: '', location: '' },
    { title: 'Graduation 🎓', type: 'social', date: '', start_time: '', end_time: '', location: '' },
  ];

  const [lessons, setLessons] = useState(isNew ? DEFAULT_LESSONS : []);

  const { data: existing } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.filter({ id }).then(r => r[0]),
    enabled: !isNew,
  });

  const { data: existingLessons = [] } = useQuery({
    queryKey: ['lessons', id],
    queryFn: () => lessonsApi.filter({ course_id: id }, 'lesson_number'),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing) {
      setForm({ 
        ...DEFAULTS, 
        ...existing,
        rules_variant: existing.rules_variant || 'nmjl',
        rules_description: existing.rules_description || '',
      });
    }
  }, [existing]);

  useEffect(() => {
    if (existingLessons.length > 0) setLessons(existingLessons.map(l => ({ ...l })));
  }, [existingLessons]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const course = isNew
        ? await coursesApi.create(data)
        : await coursesApi.update(id, data);

      const courseId = isNew ? course.id : id;

      // Save lessons: create new ones, update existing ones
      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        const payload = { ...l, course_id: courseId, lesson_number: i + 1 };
        if (l.id) {
          await lessonsApi.update(l.id, payload);
        } else {
          await lessonsApi.create(payload);
        }
      }

      return course;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      navigate(`/admin/courses/${isNew ? result.id : id}`);
    },
  });

  const handleSave = () => {
    const data = { ...form, organization_id: user?.organization_id };
    if (data.enrollment_cap === '') data.enrollment_cap = null;
    if (data.price === '') data.price = 0;
    saveMutation.mutate(data);
  };

  const addLesson = () => setLessons(prev => [...prev, { ...EMPTY_LESSON }]);
  const removeLesson = (i) => setLessons(prev => prev.filter((_, idx) => idx !== i));
  const setLesson = (i, field, value) => setLessons(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/courses')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">
            {isNew ? 'New Course' : 'Edit Course'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure your teaching course</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Course Name *</Label>
                <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Beginner Mahjong — Spring 2026" />
              </div>
              <div className="shrink-0 pb-1">
                <ImageUpload
                  label="Course Logo"
                  value={form.logo_url}
                  onChange={(url) => set('logo_url', url || null)}
                  previewSize={64}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What students will learn..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Instructor Name</Label>
                <Input className="mt-1" value={form.instructor_name} onChange={e => set('instructor_name', e.target.value)} />
              </div>
              <div>
                <Label>Instructor Email</Label>
                <Input className="mt-1" type="email" value={form.instructor_email} onChange={e => set('instructor_email', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input className="mt-1" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue or online" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input className="mt-1" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input className="mt-1" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="enrollment_open">Enrollment Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment */}
        <Card>
          <CardHeader><CardTitle className="text-base">Enrollment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Student Cap</Label>
                <Input className="mt-1" type="number" value={form.enrollment_cap} onChange={e => set('enrollment_cap', e.target.value)} placeholder="No cap" />
              </div>
              <div>
                <Label>Payment</Label>
                <Select value={form.payment_model} onValueChange={v => set('payment_model', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.payment_model === 'paid' && (
              <div>
                <Label>Price (dollars)</Label>
                <Input className="mt-1" type="number" value={form.price ? form.price / 100 : ''} onChange={e => set('price', Math.round(parseFloat(e.target.value || 0) * 100))} placeholder="0.00" />
              </div>
            )}
            <PayoutCalculator
              entryFeeDollars={form.price ? form.price / 100 : 0}
              playerCap={form.enrollment_cap}
              paymentModel={form.payment_model}
              entityType="Course"
            />
            <div className="flex items-center gap-3">
              <Switch checked={form.waitlist_enabled} onCheckedChange={v => set('waitlist_enabled', v)} />
              <Label>Enable waitlist</Label>
            </div>
          </CardContent>
        </Card>

        {/* Download Control */}
        <Card>
          <CardHeader><CardTitle className="text-base">Material Downloads</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={form.allow_downloads} onCheckedChange={v => set('allow_downloads', v)} />
              <Label>Allow students to download course materials</Label>
            </div>
            <p className="text-sm text-slate-500">
              {form.allow_downloads
                ? 'Students can download PDFs and documents to their device.'
                : 'Students can view materials in-app only — download buttons are hidden. Instructors and admins can always download.'}
            </p>
          </CardContent>
        </Card>

        {/* Automated Emails */}
        <Card>
          <CardHeader><CardTitle className="text-base">Automated Emails</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={form.auto_invite_enabled} onCheckedChange={v => set('auto_invite_enabled', v)} />
              <Label>Send lesson reminders automatically</Label>
            </div>
            {form.auto_invite_enabled && (
              <div>
                <Label>Days before lesson</Label>
                <Input className="mt-1 w-24" type="number" value={form.invite_days_before} onChange={e => set('invite_days_before', parseInt(e.target.value))} />
              </div>
            )}
            <div>
              <Label className="text-slate-600 font-medium">Enrollment Confirmation Email</Label>
              <Input className="mt-1" placeholder="Subject" value={form.enrollment_email_subject} onChange={e => set('enrollment_email_subject', e.target.value)} />
              <Textarea className="mt-2" rows={3} placeholder="Body — use {{student_name}}, {{course_name}}" value={form.enrollment_email_body} onChange={e => set('enrollment_email_body', e.target.value)} />
            </div>
            <div>
              <Label className="text-slate-600 font-medium">Lesson Reminder Email</Label>
              <Input className="mt-1" placeholder="Subject" value={form.invite_email_subject} onChange={e => set('invite_email_subject', e.target.value)} />
              <Textarea className="mt-2" rows={3} placeholder="Body — use {{student_name}}, {{course_name}}, {{date}}, {{time}}, {{location}}" value={form.invite_email_body} onChange={e => set('invite_email_body', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sessions / Lessons</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={addLesson}>
                <Plus className="h-4 w-4" /> Add Session
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lessons.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No sessions yet — click "Add Session" to schedule lessons.</p>
            )}
            {lessons.map((l, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-600">Session {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeLesson(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input className="mt-1 h-8 text-sm" value={l.title} onChange={e => setLesson(i, 'title', e.target.value)} placeholder={`Session ${i + 1}`} />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={l.type} onValueChange={v => setLesson(i, 'type', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LESSON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input className="mt-1 h-8 text-sm" type="date" value={l.date} onChange={e => setLesson(i, 'date', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input className="mt-1 h-8 text-sm" type="time" value={l.start_time} onChange={e => setLesson(i, 'start_time', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input className="mt-1 h-8 text-sm" type="time" value={l.end_time} onChange={e => setLesson(i, 'end_time', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Location <span className="text-slate-400 font-normal">(leave blank to use course location)</span></Label>
                  <Input className="mt-1 h-8 text-sm" value={l.location} onChange={e => setLesson(i, 'location', e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Registration Link */}
        <Card>
          <CardHeader><CardTitle className="text-base">Registration</CardTitle></CardHeader>
          <CardContent>
            {isNew ? (
              <p className="text-sm text-slate-500">Save the course first to get a shareable registration link for students.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Share this link so students can self-enroll in the course.</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/course-register?courseId=${id}`}
                    className="text-sm font-mono bg-slate-50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/course-register?courseId=${id}`)}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(`/course-register?courseId=${id}`, '_blank')}
                    title="Open registration page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rules & Scoring */}
         <Card>
           <CardHeader><CardTitle className="text-base">Rules & Scoring</CardTitle></CardHeader>
           <CardContent>
             <RulesEditor
               variant={form.rules_variant}
               rulesDescription={form.rules_description}
               onChange={({ variant, description }) => {
                 set('rules_variant', variant);
                 set('rules_description', description);
               }}
             />
           </CardContent>
         </Card>

        {/* Notes */}
         <Card>
           <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
           <CardContent>
             <Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Admin-only notes..." />
           </CardContent>
         </Card>

         <div className="flex gap-3 pb-10">
           <Button onClick={handleSave} disabled={!form.name || saveMutation.isPending} className="gap-2">
             <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Course'}
           </Button>
           <Button variant="outline" onClick={() => navigate('/admin/courses')}>Cancel</Button>
         </div>
      </div>
    </div>
  );
}