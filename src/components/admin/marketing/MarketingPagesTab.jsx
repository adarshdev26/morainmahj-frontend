import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingPages as marketingPagesApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export default function MarketingPagesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['admin-marketing-pages'],
    queryFn: () => marketingPagesApi.list(),
  });

  const sorted = [...pages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) return marketingPagesApi.update(data.id, data);
      return marketingPagesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-pages'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-nav-pages'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-page'] });
      setEditing(null);
      toast({ title: 'Page saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingPagesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-pages'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-nav-pages'] });
      toast({ title: 'Page deleted' });
    },
  });

  if (editing) {
    return (
      <PageEditor
        page={editing === 'new' ? {} : sorted.find(p => p.id === editing)}
        onSave={(data) => saveMutation.mutate(data)}
        onCancel={() => setEditing(null)}
        saving={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} pages</p>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(page => (
            <Card key={page.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{page.title}</p>
                    {page.status === 'draft' && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Draft</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">/{page.slug} · {page.nav_label || 'no nav label'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(page.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(page.id)}>
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

function PageEditor({ page, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    slug: page?.slug || '',
    title: page?.title || '',
    nav_label: page?.nav_label || '',
    seo_title: page?.seo_title || '',
    meta_description: page?.meta_description || '',
    keywords: page?.keywords || '',
    og_image_url: page?.og_image_url || '',
    status: page?.status || 'published',
    sort_order: page?.sort_order || 0,
    show_in_nav: page?.show_in_nav ?? true,
    id: page?.id,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg">{page?.id ? 'Edit Page' : 'New Page'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Slug *</label>
        <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required placeholder="about" />
        <p className="text-xs text-muted-foreground mt-1">URL path: /{form.slug || 'slug'}</p>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Title *</label>
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Nav Label</label>
        <Input value={form.nav_label} onChange={e => setForm({ ...form, nav_label: e.target.value })} placeholder="About" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">SEO Title</label>
        <Input value={form.seo_title} onChange={e => setForm({ ...form, seo_title: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Meta Description</label>
        <Textarea value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} rows={2} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Keywords</label>
        <Input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="mah jongg, tournament, scoring" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">OG Image URL</label>
        <Input value={form.og_image_url} onChange={e => setForm({ ...form, og_image_url: e.target.value })} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="w-32">
          <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
          <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <label className="text-sm font-medium block">Show in navigation menu</label>
          <p className="text-xs text-muted-foreground mt-0.5">Display this page link in the website header</p>
        </div>
        <Switch checked={form.show_in_nav} onCheckedChange={checked => setForm({ ...form, show_in_nav: checked })} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Page'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}