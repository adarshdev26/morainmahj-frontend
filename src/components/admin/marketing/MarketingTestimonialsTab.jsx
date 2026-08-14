import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testimonials as testimonialsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit, X, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export default function MarketingTestimonialsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-marketing-testimonials'],
    queryFn: () => testimonialsApi.list(),
  });

  const sorted = [...testimonials].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { id, ...payload } = data;
      if (id) return testimonialsApi.update(id, payload);
      return testimonialsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-testimonials'] });
      setEditing(null);
      toast({ title: 'Testimonial saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => testimonialsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-testimonials'] });
      toast({ title: 'Testimonial deleted' });
    },
  });

  if (editing) {
    return (
      <TestimonialEditor
        testimonial={editing === 'new' ? {} : sorted.find(t => t.id === editing)}
        onSave={(data) => saveMutation.mutate(data)}
        onCancel={() => setEditing(null)}
        saving={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} testimonials</p>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New Testimonial
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{t.name}</p>
                    {t.role && <span className="text-xs text-muted-foreground">{t.role}</span>}
                    {!t.published && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">"{t.review}"</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TestimonialEditor({ testimonial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    id: testimonial?.id,
    name: testimonial?.name || '',
    role: testimonial?.role || '',
    company: testimonial?.company || '',
    photo_url: testimonial?.photo_url || '',
    rating: testimonial?.rating || 5,
    review: testimonial?.review || '',
    sort_order: testimonial?.sort_order || 0,
    published: testimonial?.published ?? true,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg">{testimonial?.id ? 'Edit Testimonial' : 'New Testimonial'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Name *</label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Role</label>
          <Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Company</label>
          <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Photo URL</label>
          <Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Review *</label>
        <Textarea value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} rows={3} required />
      </div>
      <div className="flex gap-4">
        <div className="w-32">
          <label className="text-sm font-medium mb-1.5 block">Rating (1-5)</label>
          <Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} />
        </div>
        <div className="w-32">
          <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
          <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <label className="text-sm font-medium block">Published</label>
          <p className="text-xs text-muted-foreground mt-0.5">Display this testimonial on the website</p>
        </div>
        <Switch checked={form.published} onCheckedChange={checked => setForm({ ...form, published: checked })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Testimonial'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}