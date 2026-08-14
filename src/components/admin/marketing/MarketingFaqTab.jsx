import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { faqs as faqsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export default function MarketingFaqTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-marketing-faqs'],
    queryFn: () => faqsApi.list(),
  });

  const sorted = [...faqs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { id, ...payload } = data;
      if (id) return faqsApi.update(id, payload);
      return faqsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-faqs'] });
      setEditing(null);
      toast({ title: 'FAQ saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => faqsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-faqs'] });
      toast({ title: 'FAQ deleted' });
    },
  });

  if (editing) {
    return (
      <FaqEditor
        faq={editing === 'new' ? {} : sorted.find(f => f.id === editing)}
        onSave={(data) => saveMutation.mutate(data)}
        onCancel={() => setEditing(null)}
        saving={saveMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} FAQs</p>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New FAQ
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(faq => (
            <Card key={faq.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{faq.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{faq.answer}</p>
                  {!faq.published && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1 inline-block">Hidden</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(faq.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(faq.id)}>
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

function FaqEditor({ faq, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    id: faq?.id,
    question: faq?.question || '',
    answer: faq?.answer || '',
    category: faq?.category || '',
    sort_order: faq?.sort_order || 0,
    published: faq?.published ?? true,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg">{faq?.id ? 'Edit FAQ' : 'New FAQ'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Question *</label>
        <Input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} required />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Answer *</label>
        <Textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} rows={4} required />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Category</label>
          <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="w-32">
          <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
          <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <label className="text-sm font-medium block">Published</label>
          <p className="text-xs text-muted-foreground mt-0.5">Show this question on the FAQ page</p>
        </div>
        <Switch checked={form.published} onCheckedChange={checked => setForm({ ...form, published: checked })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}