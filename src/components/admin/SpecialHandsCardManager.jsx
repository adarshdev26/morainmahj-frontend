import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { specialHands as specialHandsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CATEGORIES } from '@/lib/card-constants';

/**
 * SpecialHandsCardManager — manage card-system special hands for a tournament or league.
 *
 * Props:
 *  - contextType: 'tournament' | 'league'
 *  - contextId: string
 *  - contextName: string (optional, for display)
 */
export default function SpecialHandsCardManager({ contextType, contextId, contextName }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Custom',
    point_value: 50,
    concealed: false,
  });
  const [saving, setSaving] = useState(false);

  const filterKey = contextType === 'tournament' ? 'tournament_id' : 'league_id';
  const { data: specialHands = [], isLoading } = useQuery({
    queryKey: ['card-special-hands', contextType, contextId],
    queryFn: () => specialHandsApi.filter({ [filterKey]: contextId, active: true }, 'name', 100),
    enabled: !!contextId,
  });

  const handleAdd = () => {
    setEditingId(null);
    setForm({ name: '', description: '', category: 'Custom', point_value: 50, concealed: false });
    setDialogOpen(true);
  };

  const handleEdit = (sh) => {
    setEditingId(sh.id);
    setForm({
      name: sh.name,
      description: sh.description || '',
      category: sh.category || 'Custom',
      point_value: sh.point_value || 50,
      concealed: !!sh.concealed,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (sh) => {
    if (!confirm(`Remove "${sh.name}"? Players won't be able to log it.`)) return;
    try {
      await specialHandsApi.remove(sh.id);
      queryClient.invalidateQueries({ queryKey: ['card-special-hands'] });
      queryClient.invalidateQueries({ queryKey: ['special-hands-for-log'] });
      toast({ title: 'Special hand removed' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.point_value) {
      toast({ title: 'Hand Name and Point Value are required', variant: 'destructive' });
      return;
    }
    if (form.name.length > 50) {
      toast({ title: 'Hand Name must be 50 characters or less', variant: 'destructive' });
      return;
    }
    if (Number(form.point_value) < 1 || Number(form.point_value) > 500) {
      toast({ title: 'Point Value must be between 1 and 500', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        category: form.category,
        point_value: Number(form.point_value),
        concealed: !!form.concealed,
        active: true,
        created_by: user?.id,
        created_by_email: user?.email,
        organization_id: user?.data?.organization_id || '',
      };
      payload[filterKey] = contextId;

      if (editingId) {
        await specialHandsApi.update(editingId, payload);
      } else {
        await specialHandsApi.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['card-special-hands'] });
      queryClient.invalidateQueries({ queryKey: ['special-hands-for-log'] });
      setDialogOpen(false);
      toast({ title: `Special hand "${form.name}" ${editingId ? 'updated' : 'added'}` });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Special Hands {contextName ? `for: ${contextName}` : ''}
          </span>
          <Button size="sm" onClick={handleAdd} className="gap-1">
            <Plus className="h-4 w-4" /> Add Special Hand
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Create custom hands for this {contextType}. Players will see these in addition to the NMJL card hands when logging wins.
        </p>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
        ) : specialHands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No special hands yet. Click "Add Special Hand" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Hand Name</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Points</th>
                  <th className="p-3 font-medium">Concealed</th>
                  <th className="p-3 font-medium">Created By</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {specialHands.map((sh) => (
                  <tr key={sh.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{sh.name}</p>
                      {sh.description && <p className="text-xs text-muted-foreground">{sh.description}</p>}
                    </td>
                    <td className="p-3">{sh.category || 'Custom'}</td>
                    <td className="p-3 font-semibold">{sh.point_value}</td>
                    <td className="p-3">
                      <Badge variant={sh.concealed ? 'default' : 'outline'}>
                        {sh.concealed ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{sh.created_by_email || '—'}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sh)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sh)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Special Hand' : 'Add Special Hand'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Hand Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dragons Bonus"
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. All dragon pairs"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Custom">Custom</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Point Value (1-500)</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={form.point_value || ''}
                  onChange={(e) => setForm({ ...form, point_value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Concealed</Label>
                <Select value={form.concealed ? 'yes' : 'no'} onValueChange={(v) => setForm({ ...form, concealed: v === 'yes' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Exposed</SelectItem>
                    <SelectItem value="yes">Concealed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}