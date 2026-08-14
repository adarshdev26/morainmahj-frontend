import React, { useState } from 'react';
import { specialHands as specialHandsApi } from '@/services/resources';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const TILE_IDENTIFIERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'D', 'W', 'N', 'E', 'S'];
const TILE_COLORS = ['#000000', '#00A650', '#FF0000', '#0066CC']; // Black, Green, Red, Blue

export default function SpecialHands() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    comment: '',
    scope: 'tournament',
    round_number: '',
    set_number: '',
    point_value: '',
    tiles: Array(14).fill(null).map((_, i) => ({
      position: i + 1,
      identifier: '',
      color: TILE_COLORS[i % TILE_COLORS.length],
    })),
    active: true,
  });

  const { data: specialHands = [], isLoading } = useQuery({
    queryKey: ['special-hands', tournamentId],
    queryFn: () => specialHandsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => specialHandsApi.create({
      tournament_id: tournamentId,
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-hands', tournamentId] });
      toast({ title: 'Special hand created!' });
      resetForm();
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => specialHandsApi.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-hands', tournamentId] });
      toast({ title: 'Special hand updated!' });
      resetForm();
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => specialHandsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-hands', tournamentId] });
      toast({ title: 'Special hand deleted!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      comment: '',
      scope: 'tournament',
      round_number: '',
      set_number: '',
      point_value: '',
      tiles: Array(14).fill(null).map((_, i) => ({
        position: i + 1,
        identifier: '',
        color: TILE_COLORS[i % TILE_COLORS.length],
      })),
      active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name || form.tiles.some(t => !t.identifier)) {
      toast({ title: 'Error', description: 'Name and all tile identifiers are required', variant: 'destructive' });
      return;
    }

    // Check 4-hand limit for tournament scope
    if (form.scope === 'tournament' && !editingId) {
      const tournamentHands = specialHands.filter(h => h.scope === 'tournament');
      if (tournamentHands.length >= 4) {
        toast({ title: 'Error', description: 'Maximum 4 special hands per tournament', variant: 'destructive' });
        return;
      }
    }

    const data = {
      name: form.name,
      description: form.description,
      comment: form.comment || null,
      scope: form.scope,
      round_number: form.scope === 'round' && form.round_number ? Number(form.round_number) : null,
      set_number: form.scope === 'set' && form.set_number ? Number(form.set_number) : null,
      point_value: form.point_value ? Number(form.point_value) : null,
      tiles: form.tiles,
      active: form.active,
    };

    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (hand) => {
    setForm({
      name: hand.name,
      description: hand.description || '',
      comment: hand.comment || '',
      scope: hand.scope || 'tournament',
      round_number: hand.round_number || '',
      set_number: hand.set_number || '',
      point_value: hand.point_value || '',
      tiles: hand.tiles || [],
      active: hand.active !== false,
    });
    setEditingId(hand.id);
    setShowForm(true);
  };

  const handleTileChange = (index, field, value) => {
    const newTiles = [...form.tiles];
    newTiles[index] = { ...newTiles[index], [field]: value };
    setForm({ ...form, tiles: newTiles });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/admin/tournament/${tournamentId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-3xl font-heading font-bold">Special Hands</h1>
        </div>

        {!showForm && (
          <>
            <Button 
              onClick={() => setShowForm(true)} 
              className="mb-6 gap-2"
              disabled={specialHands.filter(h => h.scope === 'tournament').length >= 4}
            >
              <Plus className="h-4 w-4" /> Add Special Hand
            </Button>
            {specialHands.filter(h => h.scope === 'tournament').length >= 4 && (
              <p className="text-sm text-amber-600 mb-4">Maximum 4 tournament-wide special hands reached</p>
            )}
          </>
        )}

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Special Hand' : 'Create Special Hand'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., No Dragons, All Pairs"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description of the hand"
                />
              </div>

              <div>
                <Label>Comment (parenthetical)</Label>
                <Input
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="e.g., 'these numbers only' or 'any consecutive run'"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Scope *</Label>
                  <Select value={form.scope} onValueChange={(val) => setForm({ ...form, scope: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tournament">Whole Tournament</SelectItem>
                      <SelectItem value="round">Specific Round</SelectItem>
                      <SelectItem value="set">Specific Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.scope === 'round' && (
                  <div>
                    <Label>Round Number *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.round_number}
                      onChange={(e) => setForm({ ...form, round_number: e.target.value })}
                      placeholder="e.g., 1"
                    />
                  </div>
                )}

                {form.scope === 'set' && (
                  <div>
                    <Label>Set Number *</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      value={form.set_number}
                      onChange={(e) => setForm({ ...form, set_number: e.target.value })}
                      placeholder="e.g., 1"
                    />
                  </div>
                )}

                <div>
                  <Label>Point Value</Label>
                  <Input
                    type="number"
                    value={form.point_value}
                    onChange={(e) => setForm({ ...form, point_value: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(val) => setForm({ ...form, active: val })}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>

              {/* 14-tile grid */}
              <div>
                <Label className="mb-3 block">Tiles (14 positions) *</Label>
                <div className="grid grid-cols-7 gap-3">
                  {form.tiles.map((tile, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500">Pos {tile.position}</div>
                      <div className="flex flex-col gap-2">
                        <Select value={tile.identifier} onValueChange={(val) => handleTileChange(idx, 'identifier', val)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="?" /></SelectTrigger>
                          <SelectContent>
                            {TILE_IDENTIFIERS.map((id) => (
                              <SelectItem key={id} value={id}>{id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input
                          type="color"
                          value={tile.color}
                          onChange={(e) => handleTileChange(idx, 'color', e.target.value)}
                          className="w-full h-8 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'Update' : 'Create'} Special Hand
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <div className="grid gap-4">
          {specialHands.map((hand) => (
            <Card key={hand.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{hand.name}</CardTitle>
                    {hand.description && <p className="text-sm text-slate-600 mt-1">{hand.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                      <span>Scope: <strong>{hand.scope}</strong>
                        {hand.scope === 'round' && ` - Round ${hand.round_number}`}
                        {hand.scope === 'set' && ` - Set ${hand.set_number}`}
                      </span>
                      {hand.point_value && <span>Points: <strong>{hand.point_value}</strong></span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(hand)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(hand.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {hand.tiles.map((tile) => (
                    <div
                      key={tile.position}
                      className="aspect-square rounded border-2 flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: tile.color,
                        borderColor: adjustColorBrightness(tile.color, -30),
                        color: getContrastColor(tile.color),
                      }}
                    >
                      {tile.identifier}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {specialHands.length === 0 && !showForm && (
          <Card className="text-center py-12">
            <p className="text-slate-500">No special hands yet. Create one to get started!</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

function adjustColorBrightness(hexColor, percent) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const nr = Math.max(0, Math.min(255, r + (r * percent) / 100));
  const ng = Math.max(0, Math.min(255, g + (g * percent) / 100));
  const nb = Math.max(0, Math.min(255, b + (b * percent) / 100));
  return '#' + [nr, ng, nb].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}