import React, { useState, useMemo } from 'react';
import { callAction } from '@/services/actions';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import { Search, Users, CheckCircle2 } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

export default function PlayerPicker({ open, onOpenChange, onSelected }) {
  const { orgFilter } = useOrganization();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  const { data: repo = { players: [] }, isLoading } = useQuery({
    queryKey: ['player-repository', orgFilter().organization_id],
    queryFn: () =>
      callAction('getPlayerRepository', { organization_id: orgFilter().organization_id }),
    enabled: open,
  });
  const players = repo.players || [];

  const regionOptions = useMemo(() => {
    const set = new Set();
    players.forEach((p) => { if (p.region) set.add(p.region); });
    return [{ value: 'all', label: 'All Regions' }, ...[...set].sort().map((r) => ({ value: r, label: r }))];
  }, [players]);

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const ms = !search || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    const mr = regionFilter === 'all' || p.region === regionFilter;
    const mt =
      typeFilter === 'all' ||
      (typeFilter === 'tournament' && p.tournamentCount > 0) ||
      (typeFilter === 'league' && p.leagueCount > 0) ||
      (typeFilter === 'course' && p.courseCount > 0);
    return ms && mr && mt;
  });

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        filtered.forEach((p) => n.delete(p.id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        filtered.forEach((p) => n.add(p.id));
        return n;
      });
    }
  };

  const close = () => {
    onOpenChange?.(false);
    setSelected(new Set());
  };

  const confirm = () => {
    const sel = players.filter((p) => selected.has(p.id));
    onSelected?.(sel);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange?.(true) : close())}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Player Repository</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="pl-9" />
          </div>
          <ResponsiveSelect value={regionFilter} onValueChange={setRegionFilter} triggerClassName="w-44" options={regionOptions} placeholder="Region" title="Region" />
          <ResponsiveSelect
            value={typeFilter}
            onValueChange={setTypeFilter}
            triggerClassName="w-44"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'tournament', label: 'Tournament' },
              { value: 'league', label: 'League' },
              { value: 'course', label: 'Course' },
            ]}
            placeholder="Type"
            title="Participation type"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} /> Select all ({filtered.length})
          </label>
          <span>{selected.size} selected</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
          {isLoading && <div className="text-center py-8 text-muted-foreground text-sm">Loading repository…</div>}
          {!isLoading && filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No players match.</div>}
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer ${selected.has(p.id) ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-muted/30'}`}
              onClick={() => toggle(p.id)}
            >
              <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} onClick={(e) => e.stopPropagation()} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}{p.region ? ` · ${p.region}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.tournamentCount > 0 && <Badge variant="outline" className="text-xs">🏆 {p.tournamentCount}</Badge>}
                {p.leagueCount > 0 && <Badge variant="outline" className="text-xs">🀄 {p.leagueCount}</Badge>}
                {p.courseCount > 0 && <Badge variant="outline" className="text-xs">📚 {p.courseCount}</Badge>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>Clear</Button>
          <Button className="gap-2" onClick={confirm} disabled={selected.size === 0}>
            <CheckCircle2 className="h-4 w-4" /> Add {selected.size || ''} to Invitation List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}