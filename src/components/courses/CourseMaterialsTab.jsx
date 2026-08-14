import React, { useState } from 'react';
import { uploadPrivateFile } from '@/services/integrationsApi';
import { lessons as lessonsApi, teachingMaterials as teachingMaterialsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, FileText, Link, Video, StickyNote, Upload, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { resolveSecureFileUrl } from '@/lib/secure-file';

const TYPE_ICONS = { pdf: FileText, link: Link, video: Video, notes: StickyNote };
const TYPE_LABELS = { pdf: 'PDF', link: 'Link', video: 'Video', notes: 'Notes' };
const TYPE_COLORS = { pdf: 'text-red-500', link: 'text-blue-500', video: 'text-purple-500', notes: 'text-amber-500' };

const EMPTY = { title: '', description: '', type: 'link', url: '', content: '', lesson_id: '', visible_to_students_at: '' };

function toDatetimeLocal(iso) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

export default function CourseMaterialsTab({ courseId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [restrictVisibility, setRestrictVisibility] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const { data: materials = [] } = useQuery({
    queryKey: ['materials', courseId],
    queryFn: () => teachingMaterialsApi.filter({ course_id: courseId }, 'sort_order'),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => lessonsApi.filter({ course_id: courseId }, 'lesson_number'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, course_id: courseId, sort_order: materials.length };
      if (!restrictVisibility) payload.visible_to_students_at = null;
      else if (payload.visible_to_students_at) payload.visible_to_students_at = new Date(payload.visible_to_students_at).toISOString();
      return teachingMaterialsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', courseId] });
      setShowForm(false);
      setForm(EMPTY);
      setRestrictVisibility(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => teachingMaterialsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials', courseId] }),
  });

  const toggleVisibility = (material) => {
    // If already has visibility restriction, clear it (make always visible); otherwise set to now
    const newVal = material.visible_to_students_at ? null : new Date().toISOString();
    teachingMaterialsApi.update(material.id, { visible_to_students_at: newVal })
      .then(() => queryClient.invalidateQueries({ queryKey: ['materials', courseId] }));
  };

  const updateVisibleAt = (material, val) => {
    teachingMaterialsApi.update(material.id, { visible_to_students_at: val ? new Date(val).toISOString() : null })
      .then(() => queryClient.invalidateQueries({ queryKey: ['materials', courseId] }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Store in PRIVATE storage so the file is never publicly accessible.
    // A short-lived signed URL is minted on demand when a student opens it.
    const { file_uri } = await uploadPrivateFile({ file });
    set('url', file_uri);
    if (!form.title) set('title', file.name.replace(/\.[^.]+$/, ''));
    setUploading(false);
  };

  const openMaterial = async (material) => {
    try {
      const signedUrl = await resolveSecureFileUrl(material.url);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Unable to open this file. Please try again.');
    }
  };

  const now = new Date();
  const isVisible = (m) => !m.visible_to_students_at || new Date(m.visible_to_students_at) <= now;
  const lessonForMaterial = (m) => lessons.find(l => l.id === m.lesson_id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">{materials.length} material{materials.length !== 1 ? 's' : ''}</h2>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Material</Button>
      </div>

      {showForm && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="pdf">PDF Upload</SelectItem>
                    <SelectItem value="video">Video Link</SelectItem>
                    <SelectItem value="notes">Written Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Attach to Session (optional)</Label>
                <Select value={form.lesson_id} onValueChange={v => set('lesson_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Course-wide" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Course-wide</SelectItem>
                    {lessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>#{l.lesson_number}: {l.title || `Session ${l.lesson_number}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Title *</Label>
              <Input className="mt-1" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Suit Reference Sheet" />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            {form.type === 'pdf' && (
              <div>
                <Label>Upload File</Label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-input rounded-md text-sm hover:bg-accent transition-colors">
                    <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Choose file'}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                  {form.url && <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>}
                </div>
              </div>
            )}
            {(form.type === 'link' || form.type === 'video') && (
              <div>
                <Label>URL</Label>
                <Input className="mt-1" type="url" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
              </div>
            )}
            {form.type === 'notes' && (
              <div>
                <Label>Content</Label>
                <Textarea className="mt-1" rows={5} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Write your lesson notes here..." />
              </div>
            )}

            {/* Visibility */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Switch checked={restrictVisibility} onCheckedChange={setRestrictVisibility} id="mat-vis" />
                <Label htmlFor="mat-vis" className="cursor-pointer">Restrict when students can see this</Label>
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
                  <p className="text-xs text-slate-400 mt-1">Students won't see this material until then.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY); setRestrictVisibility(false); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {materials.map(m => {
          const Icon = TYPE_ICONS[m.type] || FileText;
          const lesson = lessonForMaterial(m);
          const visible = isVisible(m);

          return (
            <Card key={m.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${TYPE_COLORS[m.type]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800">{m.title}</span>
                        <span className="text-xs text-slate-400 font-medium">{TYPE_LABELS[m.type]}</span>
                        {lesson && <span className="text-xs text-slate-400">#{lesson.lesson_number}</span>}
                      </div>
                      {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
                      {m.url && (
                        <button
                          type="button"
                          onClick={() => openMaterial(m)}
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" /> Open
                        </button>
                      )}
                      {m.content && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.content}</p>}

                      {/* Inline visibility editor */}
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        {visible && !m.visible_to_students_at && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><Eye className="h-3 w-3" /> Always visible</span>
                        )}
                        {visible && m.visible_to_students_at && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><Eye className="h-3 w-3" /> Visible since {format(new Date(m.visible_to_students_at), 'MMM d')}</span>
                        )}
                        {!visible && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600"><EyeOff className="h-3 w-3" /> Hidden until {format(new Date(m.visible_to_students_at), 'MMM d, h:mm a')}</span>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            className="text-xs border border-slate-200 rounded px-1.5 py-0.5 h-6 text-slate-600"
                            value={toDatetimeLocal(m.visible_to_students_at)}
                            onChange={e => updateVisibleAt(m, e.target.value)}
                            title="Set when students can see this"
                          />
                          {m.visible_to_students_at && (
                            <button
                              className="text-xs text-slate-400 hover:text-slate-600 underline"
                              onClick={() => updateVisibleAt(m, '')}
                            >
                              Clear (always show)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0" onClick={() => {
                    if (confirm('Delete this material?')) deleteMutation.mutate(m.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {materials.length === 0 && !showForm && (
          <div className="text-center py-12 text-slate-400">
            <p>No materials yet. Add PDFs, links, videos, or notes for your students.</p>
          </div>
        )}
      </div>
    </div>
  );
}