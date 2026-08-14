import React, { useState, useEffect } from 'react';
import { roomMaps as roomMapsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Map, RotateCcw, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import RoomMapDisplay from './RoomMapDisplay';

const PRESETS = [
  { key: 'rows', label: 'Rows', desc: 'Tables in horizontal rows' },
  { key: 'grid', label: 'Grid', desc: 'Even rectangular grid' },
  { key: 'u_shape', label: 'U-Shape', desc: 'Tables around 3 walls' },
];

function buildPresetLayout(type, numTables, cols) {
  const tables = [];
  if (type === 'rows' || type === 'grid') {
    for (let i = 0; i < numTables; i++) {
      tables.push({ table_number: i + 1, col: i % cols, row: Math.floor(i / cols) });
    }
  } else if (type === 'u_shape') {
    // Top row left-to-right, right column top-to-bottom, bottom row right-to-left
    let n = 1;
    const perSide = Math.ceil(numTables / 3);
    for (let c = 0; c < perSide && n <= numTables; c++, n++) {
      tables.push({ table_number: n, col: c, row: 0 });
    }
    for (let r = 1; r < perSide && n <= numTables; r++, n++) {
      tables.push({ table_number: n, col: perSide - 1, row: r });
    }
    for (let c = perSide - 2; c >= 0 && n <= numTables; c--, n++) {
      tables.push({ table_number: n, col: c, row: perSide - 1 });
    }
  }
  return tables;
}

export default function RoomMapEditor({ tournamentId, leagueId, sessionId, numTables = 8 }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState(false);
  const [dragging, setDragging] = useState(null); // { table_number, offsetCol, offsetRow }

  const filterKey = tournamentId ? { tournament_id: tournamentId } : { league_id: leagueId };

  const { data: existing } = useQuery({
    queryKey: ['room_map', tournamentId || leagueId],
    queryFn: () => roomMapsApi.filter(filterKey).then(r => r[0] || null),
  });

  const [form, setForm] = useState({
    layout_mode: 'preset',
    preset_type: 'rows',
    grid_cols: 4,
    grid_rows: 3,
    north_label: 'North Wall',
    south_label: 'South Wall',
    east_label: 'East Wall',
    west_label: 'West Wall',
    tables: [],
    published: false,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (existing) {
      setForm(f => ({ ...f, ...existing }));
    } else {
      // Auto-generate default layout
      const tables = buildPresetLayout('rows', numTables, 4);
      setForm(f => ({ ...f, tables }));
    }
  }, [existing, numTables]);

  const saveMutation = useMutation({
    mutationFn: (data) => existing
      ? roomMapsApi.update(existing.id, data)
      : roomMapsApi.create({ ...data, ...filterKey, session_id: sessionId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_map', tournamentId || leagueId] });
      toast({ title: 'Room map saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const applyPreset = () => {
    const tables = buildPresetLayout(form.preset_type, numTables, Number(form.grid_cols));
    set('tables', tables);
  };

  // Compute grid dimensions from current tables
  const maxCol = Math.max(...form.tables.map(t => t.col), form.grid_cols - 1);
  const maxRow = Math.max(...form.tables.map(t => t.row), form.grid_rows - 1);
  const gridCols = maxCol + 1;
  const gridRows = maxRow + 1;

  const getTableAt = (col, row) => form.tables.find(t => t.col === col && t.row === row);

  const handleCellDrop = (col, row) => {
    if (!dragging) return;
    // Check if cell is occupied
    const occupant = getTableAt(col, row);
    if (occupant && occupant.table_number !== dragging) {
      // Swap
      set('tables', form.tables.map(t => {
        if (t.table_number === dragging) return { ...t, col, row };
        if (t.table_number === occupant.table_number) {
          const original = form.tables.find(tt => tt.table_number === dragging);
          return { ...t, col: original.col, row: original.row };
        }
        return t;
      }));
    } else {
      set('tables', form.tables.map(t =>
        t.table_number === dragging ? { ...t, col, row } : t
      ));
    }
    setDragging(null);
  };

  const addRow = () => {
    set('grid_rows', gridRows + 1);
  };
  const addCol = () => {
    set('grid_cols', gridCols + 1);
    set('tables', form.tables.map((t, i) => ({ ...t })));
  };

  if (previewMode) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" onClick={() => setPreviewMode(false)} className="gap-2">
            ← Back to Editor
          </Button>
          <span className="text-sm text-muted-foreground">Preview — as players see it</span>
        </div>
        <RoomMapDisplay mapData={form} highlightTable={null} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4" /> Room Layout Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Preset picker */}
          <div>
            <Label className="mb-2 block">Layout Preset</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => set('preset_type', p.key)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${form.preset_type === p.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-xs opacity-70">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label>Columns</Label>
              <Input type="number" min={1} max={12} value={form.grid_cols} onChange={e => set('grid_cols', Number(e.target.value))} className="w-20 mt-1" />
            </div>
            <Button variant="outline" onClick={applyPreset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Apply Preset
            </Button>
          </div>

          {/* Cardinal Direction Labels */}
          <div>
            <Label className="mb-2 block">Room Direction Labels</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'north_label', placeholder: 'e.g. North Wall / Stage' },
                { key: 'south_label', placeholder: 'e.g. South Wall / Entrance' },
                { key: 'east_label', placeholder: 'e.g. East Wall / Windows' },
                { key: 'west_label', placeholder: 'e.g. West Wall / Kitchen' },
              ].map(({ key, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs capitalize">{key.replace('_label', '')}</Label>
                  <Input
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="mt-0.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium">Visible to players</p>
              <p className="text-xs text-muted-foreground">Players can see the map in the app</p>
            </div>
            <Switch checked={!!form.published} onCheckedChange={v => set('published', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Drag-and-drop grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Table Placement</CardTitle>
          <p className="text-xs text-muted-foreground">Drag tables to rearrange. The grid represents your room.</p>
        </CardHeader>
        <CardContent>
          {/* North label */}
          <div className="text-center text-xs font-semibold text-muted-foreground mb-2 tracking-widest uppercase">
            ↑ {form.north_label}
          </div>

          <div className="flex items-center gap-2">
            {/* West label */}
            <div className="text-xs font-semibold text-muted-foreground tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ← {form.west_label}
            </div>

            {/* Grid */}
            <div
              className="flex-1 border-2 border-dashed border-border rounded-lg p-2 overflow-auto"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, minmax(56px, 1fr))`, gap: '8px' }}
            >
              {Array.from({ length: gridRows }).map((_, row) =>
                Array.from({ length: gridCols }).map((_, col) => {
                  const table = getTableAt(col, row);
                  return (
                    <div
                      key={`${col}-${row}`}
                      className={`h-14 rounded-lg border-2 flex items-center justify-center transition-colors
                        ${table
                          ? 'border-primary/60 bg-primary/5 cursor-grab active:cursor-grabbing'
                          : 'border-dashed border-border/40 bg-muted/20 hover:bg-muted/40'
                        }
                        ${dragging && !table ? 'border-primary/30 bg-primary/10' : ''}
                      `}
                      draggable={!!table}
                      onDragStart={() => table && setDragging(table.table_number)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleCellDrop(col, row)}
                      onDragEnd={() => setDragging(null)}
                    >
                      {table ? (
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary leading-none">{table.table_number}</div>
                          <div className="text-[10px] text-muted-foreground">Table</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">empty</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* East label */}
            <div className="text-xs font-semibold text-muted-foreground tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
              {form.east_label} →
            </div>
          </div>

          {/* South label */}
          <div className="text-center text-xs font-semibold text-muted-foreground mt-2 tracking-widest uppercase">
            ↓ {form.south_label}
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={addRow}>+ Row</Button>
            <Button size="sm" variant="outline" onClick={addCol}>+ Column</Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Save Map
        </Button>
        <Button variant="outline" onClick={() => setPreviewMode(true)} className="gap-2">
          <Eye className="h-4 w-4" /> Preview
        </Button>
      </div>
    </div>
  );
}