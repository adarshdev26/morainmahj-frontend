import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cardHands as cardHandsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, Layers, Calendar, Upload, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import BackButton from '@/components/shared/BackButton';
import { CATEGORIES, SIDE_OPTIONS } from '@/lib/card-constants';

const emptyForm = {
  card_year: new Date().getFullYear(),
  category: 'Year',
  position: 1,
  side: 'none',
  points: 25,
  concealed_exposed: 'C',
};

export default function CardSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeYear, setActiveYear] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [positionSearch, setPositionSearch] = useState('');

  const { data: hands = [], isLoading } = useQuery({
    queryKey: ['card-hands-all'],
    queryFn: () => cardHandsApi.list({}, { sort: '-card_year', limit: 500 }),
  });

  const years = useMemo(
    () => Array.from(new Set(hands.map((h) => h.card_year))).sort((a, b) => b - a),
    [hands],
  );

  if (activeYear === null && years.length > 0) setActiveYear(years[0]);

  const visibleHands = useMemo(
    () =>
      hands
        .filter((h) => h.card_year === activeYear)
        .filter((h) => categoryFilter === 'all' || h.category === categoryFilter)
        .filter((h) => !positionSearch || String(h.position) === positionSearch.trim())
        .sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          if (a.position !== b.position) return a.position - b.position;
          const sideOrder = { none: 0, left: 1, right: 2 };
          return (sideOrder[a.side] ?? 0) - (sideOrder[b.side] ?? 0);
        }),
    [hands, activeYear, categoryFilter, positionSearch],
  );

  const isReadOnlyYear = activeYear !== null && years.length > 0 && activeYear < years[0];

  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, card_year: activeYear || new Date().getFullYear() });
    setDialogOpen(true);
  };

  const handleEdit = (hand) => {
    setEditingId(hand.id);
    setForm({
      card_year: hand.card_year,
      category: hand.category,
      position: hand.position,
      side: hand.side || 'none',
      points: hand.points,
      concealed_exposed: hand.concealed_exposed,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (hand) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await cardHandsApi.remove(hand.id);
      queryClient.invalidateQueries({ queryKey: ['card-hands-all'] });
      toast({ title: 'Hand deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!form.card_year || !form.category || !form.position || !form.points || !form.concealed_exposed) {
      toast({ title: 'All fields are required', variant: 'destructive' });
      return;
    }
    if (Number(form.points) < 25 || Number(form.points) > 30) {
      toast({ title: 'Point Value must be between 25 and 30', variant: 'destructive' });
      return;
    }
    if (Number(form.position) < 1 || Number(form.position) > 6) {
      toast({ title: 'Position must be 1-6', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        card_year: Number(form.card_year),
        category: form.category,
        position: Number(form.position),
        side: form.side,
        points: Number(form.points),
        concealed_exposed: form.concealed_exposed,
      };
      // Duplicate check
      const existing = hands.find(
        (h) =>
          h.card_year === payload.card_year &&
          h.category === payload.category &&
          h.position === payload.position &&
          (h.side || 'none') === payload.side &&
          h.id !== editingId,
      );
      if (existing) {
        toast({
          title: 'Hand already exists',
          description: `${payload.card_year} > ${payload.category} > Position ${payload.position} > ${payload.side === 'left' ? 'Left' : payload.side === 'right' ? 'Right' : 'Single'}. Edit existing or delete first.`,
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      if (editingId) {
        await cardHandsApi.update(editingId, payload);
      } else {
        await cardHandsApi.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['card-hands-all'] });
      setDialogOpen(false);
      toast({ title: editingId ? 'Hand saved successfully' : 'Hand saved successfully' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sideDisplay = (side) => (side === 'left' ? 'Left' : side === 'right' ? 'Right' : 'Full');

  return (
    <div>
      <PageHeader
        title="Card Setup"
        subtitle="Enter NMJL card data once per year (January). This is a private lookup table used to validate player hand entries and auto-fill point values. Data is never shown to players."
        actions={<BackButton fallbackPath="/admin" />}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-5xl">
        {/* Year selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Card Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={year === activeYear ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveYear(year)}
                >
                  {year}
                </Button>
              ))}
              {years.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No card years yet. Click "Add Hand" to create the first entry and start a new year.
                </p>
              )}
            </div>
            {activeYear && (
              <p className="text-xs text-muted-foreground mt-3">
                {visibleHands.length} hand{visibleHands.length !== 1 ? 's' : ''} configured for {activeYear}.
                {isReadOnlyYear && <span className="ml-2 text-amber-600 font-medium">(Read-only — previous year)</span>}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filters + actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
              <div className="flex flex-wrap gap-3 flex-1">
                <div className="space-y-1">
                  <Label className="text-xs">Filter by Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Search Position</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={positionSearch}
                      onChange={(e) => setPositionSearch(e.target.value)}
                      placeholder="1-6"
                      className="w-[100px] pl-8"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-1" disabled>
                  <Upload className="h-4 w-4" /> Import CSV
                </Button>
                <Button onClick={handleAdd} disabled={isReadOnlyYear} className="gap-1">
                  <Plus className="h-4 w-4" /> Add Hand
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hands table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : visibleHands.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm">No hands added for this year yet. Click "Add Hand" to begin entering card data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/50">
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 font-medium">Position</th>
                      <th className="p-3 font-medium">Side</th>
                      <th className="p-3 font-medium">Points</th>
                      <th className="p-3 font-medium">Concealed</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHands.map((hand) => (
                      <tr key={hand.id} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="p-3 font-medium">{hand.category}</td>
                        <td className="p-3">{hand.position}</td>
                        <td className="p-3">{sideDisplay(hand.side)}</td>
                        <td className="p-3 font-semibold">{hand.points}</td>
                        <td className="p-3">
                          <Badge variant={hand.concealed_exposed === 'C' ? 'default' : 'outline'}>
                            {hand.concealed_exposed === 'C' ? 'Concealed' : 'Exposed'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(hand)} disabled={isReadOnlyYear}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(hand)} disabled={isReadOnlyYear}>
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
        </Card>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Hand' : 'Add Hand'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Card Year</Label>
              <Input
                type="number"
                value={form.card_year || ''}
                onChange={(e) => setForm({ ...form, card_year: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Position (1-6)</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={form.position || ''}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Side</Label>
                <Select value={form.side} onValueChange={(v) => setForm({ ...form, side: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIDE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Point Value (25-30)</Label>
                <Input
                  type="number"
                  min={25}
                  max={30}
                  value={form.points || ''}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Concealed / Exposed</Label>
                <Select value={form.concealed_exposed} onValueChange={(v) => setForm({ ...form, concealed_exposed: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Concealed</SelectItem>
                    <SelectItem value="X">Exposed</SelectItem>
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
    </div>
  );
}