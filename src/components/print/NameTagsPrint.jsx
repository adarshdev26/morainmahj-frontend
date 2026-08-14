import React, { useState } from 'react';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer, Loader2 } from 'lucide-react';

const SEATS = ['East', 'South', 'West', 'North'];
const WIND = ['E', 'S', 'W', 'N'];

function getPlayerAssignment(playerId, assignments, roundNumber) {
  const a = assignments.find(a =>
    a.round_number === roundNumber &&
    [a.player1_id, a.player2_id, a.player3_id, a.player4_id].includes(playerId)
  );
  if (!a) return null;
  const idx = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].indexOf(playerId);
  return { table: a.table_number, wind: WIND[idx], seat: SEATS[idx] };
}

function buildTagContent(reg, tournament, assignments, opts, forPrint) {
  const numRounds = Math.min(tournament.num_rounds || 4, 5);

  // Build round table entries
  const roundItems = [];
  if (opts.showTables) {
    for (let r = 1; r <= numRounds; r++) {
      const a = getPlayerAssignment(reg.player_id, assignments, r);
      if (a) {
        const windStr = opts.showWind ? ` · ${a.wind}` : '';
        roundItems.push(`R${r}: Tbl ${a.table}${windStr}`);
      }
    }
  }

  // MJ set table
  const mjSet = opts.showMJSet && reg.bringing_borrowed_set
    ? `🀄 MJ Set → Tbl ${reg.borrowed_set_table_number || 'TBD'}`
    : null;

  if (forPrint) {
    const contentWidth = opts.showQR ? '72%' : '100%';
    const qrBox = opts.showQR
      ? `<div style="position:absolute;right:4px;top:4px;width:0.55in;height:0.55in;border:1px solid #bbb;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#bbb;text-align:center;border-radius:2px;">QR</div>`
      : '';

    const badges = [
      opts.showCity && reg.player_city_state ? `<span>📍 ${reg.player_city_state}</span>` : '',
      opts.showFlight && reg.flight ? `<span style="background:#e8edf5;padding:0 3px;border-radius:2px;color:#1e2d4d;">Flt ${reg.flight}</span>` : '',
      opts.showVip && reg.vip ? `<span style="background:#fef3c7;padding:0 3px;border-radius:2px;color:#b45309;font-weight:bold;">★ VIP</span>` : '',
    ].filter(Boolean).join('');

    const roundHTML = roundItems.length > 0
      ? `<div style="font-size:6.5pt;color:#444;margin-top:2px;display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;">${roundItems.map(r => `<span>${r}</span>`).join('')}</div>`
      : '';

    const mjHTML = mjSet
      ? `<div style="font-size:6.5pt;color:#92400e;margin-top:1px;">${mjSet}</div>`
      : '';

    return `
      <div class="tag">
        <div style="font-size:5.5pt;color:#999;text-transform:uppercase;letter-spacing:0.04em;">${tournament.name}</div>
        <div style="font-size:13pt;font-weight:bold;color:#1e2d4d;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:${contentWidth};">${reg.player_name}</div>
        ${badges ? `<div style="font-size:7pt;color:#555;margin-top:1px;display:flex;gap:5px;flex-wrap:wrap;">${badges}</div>` : ''}
        ${roundHTML}
        ${mjHTML}
        ${qrBox}
      </div>`;
  }

  // Screen preview (React JSX)
  return { roundItems, mjSet };
}

function buildNameTagsHTML(confirmed, tournament, assignments, opts) {
  return confirmed.map(reg => buildTagContent(reg, tournament, assignments, opts, true)).join('');
}

function openNameTagWindow(html) {
  const win = window.open('', '_blank', 'width=850,height=1100');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Name Tags</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: white; }
  @page { size: letter portrait; margin: 0.5in 0.19in; }

  .tag-grid { display: flex; flex-wrap: wrap; width: 100%; }

  .tag {
    width: 2.625in;
    height: 1in;
    padding: 0.08in 0.12in;
    position: relative;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }

  @media screen {
    .tag { border: 1px dashed #ccc; }
  }
</style>
</head>
<body>
<div class="tag-grid">
${html}
</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

export default function NameTagsPrint({ tournamentId, tournament }) {
  const numRounds = Math.min(tournament?.num_rounds || 4, 5);

  const [opts, setOpts] = useState({
    showCity: true,
    showFlight: true,
    showTables: true,
    showWind: true,
    showMJSet: true,
    showVip: true,
    showQR: false,
  });

  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ['nametag-registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: assignments = [], isLoading: loadingAssign } = useQuery({
    queryKey: ['nametag-assignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const confirmed = registrations.filter(r => r.status === 'confirmed');
  const toggle = (key) => setOpts(o => ({ ...o, [key]: !o[key] }));

  const handlePrint = () => {
    const html = buildNameTagsHTML(confirmed, tournament, assignments, opts);
    openNameTagWindow(html);
  };

  // Screen preview
  const previewTags = confirmed.slice(0, 6).map(reg => {
    const roundItems = [];
    if (opts.showTables) {
      for (let r = 1; r <= numRounds; r++) {
        const a = getPlayerAssignment(reg.player_id, assignments, r);
        if (a) {
          roundItems.push(`R${r}: Tbl ${a.table}${opts.showWind ? ` · ${a.wind}` : ''}`);
        }
      }
    }
    const mjSet = opts.showMJSet && reg.bringing_borrowed_set
      ? `🀄 MJ Set → Tbl ${reg.borrowed_set_table_number || 'TBD'}`
      : null;
    const contentWidth = opts.showQR ? '72%' : '100%';

    return (
      <div key={reg.id} style={{ width: '2.625in', height: '1in', padding: '0.08in 0.12in', border: '1px dashed #ccc', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>
        <div style={{ fontSize: '5.5pt', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tournament.name}</div>
        <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#1e2d4d', lineHeight: 1.1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: contentWidth }}>{reg.player_name}</div>
        <div style={{ fontSize: '7pt', color: '#555', marginTop: '1px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {opts.showCity && reg.player_city_state && <span>📍 {reg.player_city_state}</span>}
          {opts.showFlight && reg.flight && <span style={{ background: '#e8edf5', padding: '0 3px', borderRadius: '2px', color: '#1e2d4d' }}>Flt {reg.flight}</span>}
          {opts.showVip && reg.vip && <span style={{ background: '#fef3c7', padding: '0 3px', borderRadius: '2px', color: '#b45309', fontWeight: 'bold' }}>★ VIP</span>}
        </div>
        {roundItems.length > 0 && (
          <div style={{ fontSize: '6.5pt', color: '#444', marginTop: '2px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px' }}>
            {roundItems.map((r, i) => <span key={i}>{r}</span>)}
          </div>
        )}
        {mjSet && <div style={{ fontSize: '6.5pt', color: '#92400e', marginTop: '1px' }}>{mjSet}</div>}
        {opts.showQR && <div style={{ position: 'absolute', right: '4px', top: '4px', width: '0.55in', height: '0.55in', border: '1px solid #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5pt', color: '#bbb', textAlign: 'center', borderRadius: '2px' }}>QR</div>}
      </div>
    );
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Formatted for <strong>Avery 5160</strong> labels (3×10, 30 per sheet). Opens in a new window for printing.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3">
          <Switch id="tag-showCity" checked={opts.showCity} onCheckedChange={() => toggle('showCity')} />
          <Label htmlFor="tag-showCity" className="text-sm cursor-pointer">City / State</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="tag-showFlight" checked={opts.showFlight} onCheckedChange={() => toggle('showFlight')} />
          <Label htmlFor="tag-showFlight" className="text-sm cursor-pointer">Flight / Division</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="tag-showTables" checked={opts.showTables} onCheckedChange={() => toggle('showTables')} />
          <Label htmlFor="tag-showTables" className="text-sm cursor-pointer">Table # (Rounds 1–{numRounds})</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="tag-showWind" checked={opts.showWind} onCheckedChange={() => toggle('showWind')} disabled={!opts.showTables} />
          <Label htmlFor="tag-showWind" className={`text-sm cursor-pointer ${!opts.showTables ? 'opacity-40' : ''}`}>Wind seat (E/S/W/N)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="tag-showMJSet" checked={opts.showMJSet} onCheckedChange={() => toggle('showMJSet')} />
          <Label htmlFor="tag-showMJSet" className="text-sm cursor-pointer">MJ Set table (volunteers only)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="tag-showVip" checked={opts.showVip} onCheckedChange={() => toggle('showVip')} />
          <Label htmlFor="tag-showVip" className="text-sm cursor-pointer">VIP indicator</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="tag-showQR" checked={opts.showQR} onCheckedChange={() => toggle('showQR')} />
          <Label htmlFor="tag-showQR" className="text-sm cursor-pointer">QR placeholder box</Label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-sm text-muted-foreground">
          {confirmed.length} name tags · {Math.ceil(confirmed.length / 30)} sheet{Math.ceil(confirmed.length / 30) !== 1 ? 's' : ''}
        </p>
        <Button onClick={handlePrint} disabled={loadingRegs || loadingAssign} className="gap-2">
          {loadingRegs || loadingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Print Name Tags
        </Button>
      </div>

      {confirmed.length > 0 && (
        <div className="border rounded-xl overflow-x-auto bg-white p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Preview (first {Math.min(confirmed.length, 6)})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>{previewTags}</div>
          {confirmed.length > 6 && <p className="text-xs text-muted-foreground mt-2">…and {confirmed.length - 6} more</p>}
        </div>
      )}
    </div>
  );
}