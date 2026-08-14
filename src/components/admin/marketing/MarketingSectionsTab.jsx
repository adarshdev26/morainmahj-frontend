import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingPages as marketingPagesApi, marketingSections as marketingSectionsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit, X, Eye, EyeOff, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SectionItemsEditor from './SectionItemsEditor';

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero — Large banner with title, image & button' },
  { value: 'text', label: 'Text — Simple paragraph or rich text block' },
  { value: 'cards', label: 'Cards — Grid of content cards with items' },
  { value: 'features', label: 'Features — Icon + title + description list' },
  { value: 'benefits', label: 'Benefits — Highlighted value propositions' },
  { value: 'timeline', label: 'Timeline — Sequential steps or milestones' },
  { value: 'stats', label: 'Stats — Key numbers / metrics row' },
  { value: 'gallery', label: 'Gallery — Image grid' },
  { value: 'faq', label: 'FAQ — Question & answer accordion' },
  { value: 'cta', label: 'Call to Action — Button-focused banner' },
  { value: 'testimonials', label: 'Testimonials — Pull from Testimonials entity' },
];

// Section types that support the items array in config
const ITEM_TYPES = ['cards', 'features', 'benefits', 'timeline', 'stats', 'gallery'];

function typeLabel(typeVal) {
  return SECTION_TYPES.find(t => t.value === typeVal)?.label || typeVal;
}

export default function MarketingSectionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [filterSlug, setFilterSlug] = useState('');

  const { data: pages = [] } = useQuery({
    queryKey: ['admin-marketing-pages'],
    queryFn: () => marketingPagesApi.list(),
  });

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['admin-marketing-sections', filterSlug],
    queryFn: () => filterSlug
      ? marketingSectionsApi.filter({ page_slug: filterSlug })
      : marketingSectionsApi.list(),
  });

  const sorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { id, ...payload } = data;
      if (id) return marketingSectionsApi.update(id, payload);
      return marketingSectionsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-sections'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-sections'] });
      setEditing(null);
      toast({ title: 'Section saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingSectionsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-sections'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-sections'] });
      toast({ title: 'Section deleted' });
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, visible }) => marketingSectionsApi.update(id, { visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-sections'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-sections'] });
    },
  });

  if (editing) {
    return (
      <SectionEditor
        section={editing === 'new' ? { page_slug: filterSlug } : sorted.find(s => s.id === editing)}
        pages={pages}
        onSave={(data) => saveMutation.mutate(data)}
        onCancel={() => setEditing(null)}
        saving={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Filter by page:</label>
          <select
            value={filterSlug}
            onChange={e => setFilterSlug(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">All Pages</option>
            {pages.map(p => <option key={p.id} value={p.slug}>{p.title}</option>)}
          </select>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New Section
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">No sections yet.</p>
          <p className="text-xs text-muted-foreground">Click "New Section" to add a hero, cards, FAQ, or other content block to your page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(section => (
            <Card key={section.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{section.section_type}</span>
                    <p className="font-medium text-foreground truncate">{section.title || '(untitled)'}</p>
                    {!section.visible && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">/{section.page_slug} · order: {section.sort_order}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleVisibility.mutate({ id: section.id, visible: !section.visible })}>
                    {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(section.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(section.id)}>
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

function SectionEditor({ section, pages, onSave, onCancel, saving }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    id: section?.id,
    page_slug: section?.page_slug || '',
    section_type: section?.section_type || 'text',
    title: section?.title || '',
    subtitle: section?.subtitle || '',
    description: section?.description || '',
    button_text: section?.button_text || '',
    button_url: section?.button_url || '',
    background_color: section?.background_color || '',
    image_url: section?.image_url || '',
    icon: section?.icon || '',
    sort_order: section?.sort_order || 0,
    visible: section?.visible ?? true,
    config: section?.config || {},
  });

  const hasItems = ITEM_TYPES.includes(form.section_type);
  const items = form.config?.items || [];

  const setItems = (nextItems) => {
    setForm(prev => ({ ...prev, config: { ...prev.config, items: nextItems } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg">{section?.id ? 'Edit Section' : 'New Section'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>

      {/* ── Placement ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Where & How</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="text-sm font-medium mb-1.5 block">Page *</label>
            <select value={form.page_slug} onChange={e => setForm({ ...form, page_slug: e.target.value })} required className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">Select page…</option>
              {pages.map(p => <option key={p.id} value={p.slug}>{p.title} (/{p.slug})</option>)}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="text-sm font-medium mb-1.5 block">Section Type</label>
            <select value={form.section_type} onChange={e => setForm({ ...form, section_type: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="text-sm font-medium mb-1.5 block">Display Order</label>
            <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</p>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Title</label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Section heading" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Subtitle</label>
          <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Optional subheading" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Description / Body Text</label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Main text content for this section" />
        </div>

        {/* Items editor for supported types */}
        {hasItems && (
          <div className="pt-2">
            <SectionItemsEditor items={items} onChange={setItems} />
          </div>
        )}
      </div>

      {/* ── Button ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Button (Optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Button Text</label>
            <Input value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })} placeholder="Get Started" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Button URL</label>
            <Input value={form.button_url} onChange={e => setForm({ ...form, button_url: e.target.value })} placeholder="/start-free-trial" />
          </div>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Appearance</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Icon (Lucide name)</label>
            <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Trophy" />
            <p className="text-xs text-muted-foreground mt-1">Optional icon shown next to the title</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Background Color</label>
            <Input value={form.background_color} onChange={e => setForm({ ...form, background_color: e.target.value })} placeholder="Leave empty for default" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Image URL</label>
          <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
        </div>
      </div>

      {/* ── Visibility ── */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <label className="text-sm font-medium block">Visible on page</label>
          <p className="text-xs text-muted-foreground mt-0.5">Turn off to hide this section without deleting it</p>
        </div>
        <Switch checked={form.visible} onCheckedChange={checked => setForm({ ...form, visible: checked })} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Section'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}