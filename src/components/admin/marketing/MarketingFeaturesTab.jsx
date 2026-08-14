import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingFeatures as marketingFeaturesApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export default function MarketingFeaturesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['admin-marketing-features'],
    queryFn: () => marketingFeaturesApi.list(),
  });

  const sorted = [...features].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { id, ...payload } = data;
      if (id) return marketingFeaturesApi.update(id, payload);
      return marketingFeaturesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-features'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-features'] });
      setEditing(null);
      toast({ title: 'Feature saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingFeaturesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-features'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-features'] });
      toast({ title: 'Feature deleted' });
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }) => marketingFeaturesApi.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-features'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-features'] });
    },
  });

  if (editing) {
    return (
      <FeatureEditor
        feature={editing === 'new' ? {} : sorted.find(f => f.id === editing)}
        onSave={(data) => saveMutation.mutate(data)}
        onCancel={() => setEditing(null)}
        saving={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} features</p>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New Feature
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(feature => (
            <Card key={feature.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {feature.icon && <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{feature.icon}</span>}
                    <p className="font-medium text-foreground">{feature.title}</p>
                    {!feature.enabled && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Disabled</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{feature.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleEnabled.mutate({ id: feature.id, enabled: !feature.enabled })}>
                    {feature.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(feature.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(feature.id)}>
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

function FeatureEditor({ feature, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    id: feature?.id,
    title: feature?.title || '',
    description: feature?.description || '',
    icon: feature?.icon || '',
    sort_order: feature?.sort_order || 0,
    enabled: feature?.enabled ?? true,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg">{feature?.id ? 'Edit Feature' : 'New Feature'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Title *</label>
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Description *</label>
        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} required />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Icon (Lucide name)</label>
          <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Trophy" />
        </div>
        <div className="w-32">
          <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
          <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <label className="text-sm font-medium block">Enabled</label>
          <p className="text-xs text-muted-foreground mt-0.5">Show this feature on the website</p>
        </div>
        <Switch checked={form.enabled} onCheckedChange={checked => setForm({ ...form, enabled: checked })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Feature'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}