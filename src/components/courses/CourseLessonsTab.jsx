import React, { useState } from 'react';
import { lessons as lessonsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Pencil, BookOpen, ChevronDown, ChevronUp, Shuffle, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import LessonFlightingPanel from '@/components/courses/LessonFlightingPanel';

const TYPE_COLORS = {
  instruction: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  play_day: 'bg-green-100 text-green-700',
  social: 'bg-pink-100 text-pink-700',
  mixed: 'bg-purple-100 text-purple-700',
};
const TYPE_LABELS = {
  instruction: 'Instruction',
  review: 'Review',
  play_day: 'Play Day',
  social: 'Social',
  mixed: 'Mixed',
};
const STATUS_COLORS = { upcoming: 'outline', active: 'default', completed: 'secondary', cancelled: 'destructive' };

const EMPTY = {
  title: '',
  lesson_number: '',
  type: 'instruction',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  agenda: '',
  instructor_notes: '',
  status: 'upcoming',
  visible_to_students_at: '',
};

function toDatetimeLocal(iso) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function fromDatetimeLocal(val) {
  if (!val) return '';
  return new Date(val).toISOString();
}

export default function CourseLessonsTab({ courseId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expandedFlighting, setExpandedFlighting] = useState(null);
  const [restrictVisibility, setRestrictVisibility] = useState(false);

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => lessonsApi.filter({ course_id: courseId }, 'lesson_number'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (!restrictVisibility) payload.visible_to_students_at = null;
      if (editingId) return lessonsApi.update(editingId, payload);
      return lessonsApi.create({ ...payload, course_id: courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY);
      setRestrictVisibility(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => lessonsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons', courseId] }),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY, lesson_number: lessons.length + 1 });
    setRestrictVisibility(false);
    setShowForm(true);
  };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({ ...EMPTY, ...l, visible_to_students_at: toDatetimeLocal(l.visible_to_students_at) });
    setRestrictVisibility(!!l.visible_to_students_at);
    setShowForm(true);
  };

  const now = new Date();
  const isVisible = (lesson) => !lesson.visible_to_students_at || new Date(lesson.visible_to_students_at) <= now;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-slate-700">{lessons.length} session{lessons.length !== 1 ? 's' : ''}</h2>
        <Button size="sm" className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Add Session</Button>
      </div>

      {showForm && (
        <Card className="mb-5 border-primary/30 shadow-sm">
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Session #</Label>
                <Input className="mt-1" type="number" value={form.lesson_number} onChange={e => set('lesson_number', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instruction">Instruction</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="play_day">Play Day</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Introduction to Suits" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date *</Label>
                <Input className="mt-1" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input className="mt-1" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input className="mt-1" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Location <span className="text-slate-400 font-normal">(leave blank to use course location)</span></Label>
              <Input className="mt-1" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>

            <div>
              <Label>Agenda <span className="text-slate-400 font-normal">(visible to students)</span></Label>
              <Textarea className="mt-1" rows={2} value={form.agenda} onChange={e => set('agenda', e.target.value)} />
            </div>

            <div>
              <Label>Instructor Notes <span className="text-slate-400 font-normal">(private)</span></Label>
              <Textarea className="mt-1" rows={2} value={form.instructor_notes} onChange={e => set('instructor_notes', e.target.value)} />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visibility control */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Switch checked={restrictVisibility} onCheckedChange={setRestrictVisibility} id="restrict-vis" />
                <Label htmlFor="restrict-vis" className="cursor-pointer">
                  Restrict when students can see this session
                </Label>
              </div>
              {restrictVisibility && (
                <div>
                  <Label className="text-slate-600">Visible to students from</Label>
                  <Input
                    className="mt-1 w-60"
                    type="datetime-local"
                    value={form.visible_to_students_at}
                    onChange={e => set('visible_to_students_at', e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">Students won't see this session until this date/time.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={!form.date || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Session'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {lessons.map(lesson => {
          const visible = isVisible(lesson);
          const isPlayDay = lesson.type === 'play_day' || lesson.type === 'mixed';
          const flightOpen = expandedFlighting === lesson.id;

          return (
            <Card key={lesson.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {lesson.lesson_number || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800">{lesson.title || `Session ${lesson.lesson_number}`}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[lesson.type]}`}>
                          {TYPE_LABELS[lesson.type]}
                        </span>
                        <Badge variant={STATUS_COLORS[lesson.status]} className="text-xs">{lesson.status}</Badge>
                        {!visible && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <EyeOff className="h-3 w-3" /> Hidden until {format(new Date(lesson.visible_to_students_at), 'MMM d')}
                          </span>
                        )}
                        {visible && lesson.visible_to_students_at && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Eye className="h-3 w-3" /> Visible
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5 flex flex-wrap gap-3">
                        {lesson.date && <span>{format(new Date(lesson.date), 'EEEE, MMM d, yyyy')}</span>}
                        {lesson.start_time && <span>{lesson.start_time}{lesson.end_time ? ` – ${lesson.end_time}` : ''}</span>}
                        {lesson.location && <span>{lesson.location}</span>}
                      </div>
                      {lesson.agenda && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{lesson.agenda}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isPlayDay && (
                      <Button
                        variant="ghost" size="sm"
                        className={`h-8 gap-1.5 text-xs font-medium ${flightOpen ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
                        onClick={() => setExpandedFlighting(flightOpen ? null : lesson.id)}
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                        Flighting
                        {flightOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(lesson)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                      if (confirm('Delete this session?')) deleteMutation.mutate(lesson.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {flightOpen && isPlayDay && (
                  <div className="mt-4 pt-4 border-t">
                    <LessonFlightingPanel lesson={lesson} courseId={courseId} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {lessons.length === 0 && !showForm && (
          <div className="text-center py-12 text-slate-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No sessions yet. Add your first session above.</p>
          </div>
        )}
      </div>
    </div>
  );
}