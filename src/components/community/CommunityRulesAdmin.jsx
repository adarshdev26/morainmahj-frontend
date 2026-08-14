import React, { useState } from 'react';
import { communityRules as communityRulesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Loader2, Save } from 'lucide-react';

/**
 * Admin panel for managing conduct rules for a specific context.
 */
export default function CommunityRulesAdmin({ contextType, contextId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null | 'new' | rule object
  const [form, setForm] = useState({ title: '', rules: '' });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['community-rules-admin', contextType, contextId],
    queryFn: async () => {
      const all = await communityRulesApi.filter({});
      return all.filter(r =>
        (r.context_type === contextType && r.context_id === contextId) ||
        r.context_type === 'global'
      );
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing === 'new') {
        return communityRulesApi.create({
          context_type: contextType,
          context_id: contextId,
          title: form.title,
          rules: form.rules,
          active: true,
        });
      } else {
        return communityRulesApi.update(editing.id, { title: form.title, rules: form.rules });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-rules-admin', contextType, contextId] });
      queryClient.invalidateQueries({ queryKey: ['community-rules', contextType, contextId] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => communityRulesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-rules-admin', contextType, contextId] }),
  });

  const startNew = () => {
    setForm({
      title: 'Community Conduct Rules',
      rules: `## Community Standards\n\n1. **Be respectful** — Treat fellow players with kindness and sportsmanship.\n2. **No harassment** — Personal attacks, bullying, or discriminatory language will not be tolerated.\n3. **Keep it relevant** — Posts should relate to the tournament/league/course.\n4. **No spam** — Avoid excessive self-promotion or repetitive posts.\n5. **Photo guidelines** — Only share photos you have permission to post. No inappropriate content.\n6. **Violations** — Conduct violations may result in removal from the community or the event.\n\nThank you for helping keep our community welcoming for everyone! 🀄`,
    });
    setEditing('new');
  };

  const startEdit = (rule) => {
    setForm({ title: rule.title, rules: rule.rules });
    setEditing(rule);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Conduct Rules</h3>
          <p className="text-xs text-muted-foreground">Users must read & accept before posting.</p>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={startNew}>
            <Plus className="h-4 w-4" /> {rules.length === 0 ? 'Add Rules' : 'Add Another'}
          </Button>
        )}
      </div>

      {editing && (
        <div className="bg-muted/40 border rounded-xl p-4 space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Rules (Markdown supported)</Label>
            <Textarea
              value={form.rules}
              onChange={e => setForm(f => ({ ...f, rules: e.target.value }))}
              className="mt-1 text-sm font-mono min-h-[200px]"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !editing && (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
          No conduct rules set. The forum will be open without an agreement gate.
        </div>
      )}

      {rules.map(rule => (
        <div key={rule.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground">{rule.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scope: {rule.context_type === 'global' ? 'Global (all communities)' : rule.context_type}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => startEdit(rule)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(rule.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}