import React, { useState } from 'react';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const OPTIONS = [
  { key: 'tableAssignments',   label: 'Table Assignments (all rounds)' },
  { key: 'donatedSetTable',    label: 'Donated Set Table Assignment' },
  { key: 'scorecard',          label: 'Scorecard per Round (player copy)' },
  { key: 'eastVerifyCard',     label: 'East Verification Card' },
  { key: 'flightBadge',        label: 'Flight / Division' },
  { key: 'rsvpStatus',         label: 'Check-In Status' },
  { key: 'contactInfo',        label: 'Contact Info (city/state)' },
  { key: 'directionsReminder', label: 'Venue / Location Reminder' },
];

const SEATS = ['East', 'South', 'West', 'North'];

function getPlayerAssignments(playerId, assignments, numRounds) {
  const result = [];
  for (let r = 1; r <= numRounds; r++) {
    const a = assignments.find(a =>
      a.round_number === r &&
      [a.player1_id, a.player2_id, a.player3_id, a.player4_id].includes(playerId)
    );
    if (a) {
      const seatIdx = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].indexOf(playerId);
      result.push({ round: r, table: a.table_number, seat: SEATS[seatIdx] });
    }
  }
  return result;
}

function buildHalfSheetHTML(reg, tournament, assignments, opts) {
  const numRounds = tournament.num_rounds || 4;
  const playerAssignments = getPlayerAssignments(reg.player_id, assignments, numRounds);
  const isEastSomewhere = playerAssignments.some(a => a.seat === 'East');
  const dateStr = tournament.date ? format(new Date(tournament.date), 'MMMM d, yyyy') : '';

  const tableAssignmentsHTML = opts.tableAssignments ? `
    <div class="section">
      <div class="section-title">TABLE ASSIGNMENTS</div>
      ${playerAssignments.length === 0
        ? '<p style="color:#aaa;font-style:italic;font-size:9pt;">Not yet assigned</p>'
        : `<table>
            <thead><tr><th>Round</th><th>Table</th><th>Seat</th></tr></thead>
            <tbody>
              ${playerAssignments.map(a => `<tr><td>Round ${a.round}</td><td><strong>Table ${a.table}</strong></td><td>${a.seat}</td></tr>`).join('')}
            </tbody>
          </table>`
      }
    </div>` : '';

  const donatedSetHTML = opts.donatedSetTable && reg.bringing_borrowed_set ? `
    <div class="donated-box">
      🀄 <strong>Donated Set — Table ${reg.borrowed_set_table_number || 'TBD'}</strong><br>
      <span style="font-size:9pt;">Please bring your Mahjong set to this table before play begins.</span>
    </div>` : '';

  const scorecardHTML = opts.scorecard ? `
    <div class="section">
      <div class="section-title">SCORE TRACKING</div>
      <table>
        <thead><tr><th>Round</th><th>Set 1</th><th>Set 2</th><th>Set 3</th><th>Set 4</th><th>Total</th></tr></thead>
        <tbody>
          ${Array.from({ length: numRounds }, (_, i) =>
            `<tr><td style="color:#555;font-size:8pt;">Rnd ${i + 1}</td><td class="score-cell"></td><td class="score-cell"></td><td class="score-cell"></td><td class="score-cell"></td><td class="total-cell"></td></tr>`
          ).join('')}
          <tr class="grand-total"><td>Grand Total</td><td colspan="4"></td><td></td></tr>
        </tbody>
      </table>
    </div>` : '';

  const eastVerifyHTML = opts.eastVerifyCard && isEastSomewhere ? `
    <div class="section east-box">
      <div class="section-title">EAST SEAT VERIFICATION</div>
      <table>
        <thead><tr><th>Round / Table</th><th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>✓ Verified</th></tr></thead>
        <tbody>
          ${playerAssignments.filter(a => a.seat === 'East').map(a =>
            `<tr><td style="font-size:8pt;">Rnd ${a.round} · Tbl ${a.table}</td><td class="score-cell"></td><td class="score-cell"></td><td class="score-cell"></td><td class="score-cell"></td><td style="text-align:center;font-size:14pt;">□</td></tr>`
          ).join('')}
        </tbody>
      </table>
      <p style="font-size:8pt;color:#555;font-style:italic;margin-top:4px;">As East, verify all scores before submitting.</p>
    </div>` : '';

  const venueHTML = opts.directionsReminder && tournament.location
    ? `<div class="venue">📍 ${tournament.location}</div>` : '';

  return `
    <div class="half-sheet">
      <div class="header">
        <div class="header-left">
          <div class="player-name">${reg.player_name}</div>
          <div class="sub-info">
            ${opts.flightBadge && reg.flight ? `<span class="badge flight">Flight ${reg.flight}</span>` : ''}
            ${opts.contactInfo && reg.player_city_state ? `<span class="city">${reg.player_city_state}</span>` : ''}
            ${opts.rsvpStatus ? `<span class="${reg.checked_in ? 'checked-in' : 'not-checked-in'}">${reg.checked_in ? '✓ Checked In' : 'Not Checked In'}</span>` : ''}
          </div>
        </div>
        <div class="header-right">
          <div class="tournament-name">${tournament.name}</div>
          <div class="tournament-date">${dateStr}</div>
        </div>
      </div>
      ${tableAssignmentsHTML}
      ${donatedSetHTML}
      ${scorecardHTML}
      ${eastVerifyHTML}
      ${venueHTML}
    </div>`;
}

function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=850,height=1100');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Player Sheets</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; background: white; }
  @page { size: letter portrait; margin: 0; }

  .page {
    width: 8.5in;
    height: 11in;
    overflow: hidden;
    page-break-after: always;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }

  .half-sheet {
    width: 8.5in;
    height: 5.5in;
    padding: 0.35in 0.4in;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.12in;
    border-bottom: 1px dashed #ccc;
  }
  .half-sheet:last-child { border-bottom: none; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1e2d4d;
    padding-bottom: 0.08in;
  }
  .player-name { font-size: 20pt; font-weight: bold; color: #1e2d4d; line-height: 1.1; }
  .sub-info { display: flex; gap: 8px; margin-top: 3px; align-items: center; flex-wrap: wrap; }
  .badge { font-size: 8pt; padding: 1px 6px; border-radius: 3px; }
  .flight { background: #e8edf5; color: #1e2d4d; font-family: Arial, sans-serif; }
  .city { font-size: 9pt; color: #666; font-family: Arial, sans-serif; }
  .checked-in { font-size: 9pt; color: #16a34a; font-family: Arial, sans-serif; }
  .not-checked-in { font-size: 9pt; color: #888; font-family: Arial, sans-serif; }

  .header-right { text-align: right; }
  .tournament-name { font-size: 10pt; color: #555; font-style: italic; }
  .tournament-date { font-size: 9pt; color: #777; font-family: Arial, sans-serif; }

  .section { margin-top: 0.05in; }
  .section-title {
    font-size: 8.5pt;
    font-weight: bold;
    color: #1e2d4d;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
    font-family: Arial, sans-serif;
  }

  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; font-family: Arial, sans-serif; }
  th { border: 1px solid #bbb; padding: 3px 8px; text-align: left; background: #f0f4f8; font-size: 8.5pt; }
  td { border: 1px solid #ccc; padding: 3px 8px; }
  .score-cell { min-width: 30px; height: 20px; }
  .total-cell { min-width: 42px; background: #f9fafb; }
  .grand-total td { background: #f0f4f8; font-weight: bold; }

  .donated-box {
    background: #fefce8;
    border: 1px solid #fbbf24;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 9.5pt;
    font-family: Arial, sans-serif;
    color: #92400e;
  }

  .east-box { border: 2px solid #1e2d4d; border-radius: 4px; padding: 6px 8px; }

  .venue {
    margin-top: auto;
    font-size: 9pt;
    color: #666;
    border-top: 1px solid #eee;
    padding-top: 5px;
    font-family: Arial, sans-serif;
  }
</style>
</head>
<body>
${html}
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

export default function PlayerPrintSheet({ tournamentId, tournament }) {
  const [opts, setOpts] = useState({
    tableAssignments: true,
    donatedSetTable: true,
    scorecard: true,
    eastVerifyCard: true,
    flightBadge: true,
    rsvpStatus: false,
    contactInfo: false,
    directionsReminder: true,
  });

  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ['print-registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: assignments = [], isLoading: loadingAssign } = useQuery({
    queryKey: ['print-assignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const confirmed = registrations.filter(r => r.status === 'confirmed');
  const toggle = (key) => setOpts(o => ({ ...o, [key]: !o[key] }));

  const handlePrint = () => {
    const sheets = confirmed.map(reg =>
      buildHalfSheetHTML(reg, tournament, assignments, opts)
    );
    // Group into pairs — 2 half-sheets per page
    const pages = [];
    for (let i = 0; i < sheets.length; i += 2) {
      const pair = sheets.slice(i, i + 2).join('');
      pages.push(`<div class="page">${pair}</div>`);
    }
    openPrintWindow(pages.join(''));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(o => (
          <div key={o.key} className="flex items-center gap-3">
            <Switch id={`opt-${o.key}`} checked={opts[o.key]} onCheckedChange={() => toggle(o.key)} />
            <Label htmlFor={`opt-${o.key}`} className="text-sm cursor-pointer">{o.label}</Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-sm text-muted-foreground">
          {confirmed.length} player{confirmed.length !== 1 ? 's' : ''} · {Math.ceil(confirmed.length / 2)} page{Math.ceil(confirmed.length / 2) !== 1 ? 's' : ''} (2 per page)
        </p>
        <Button onClick={handlePrint} disabled={loadingRegs || loadingAssign} className="gap-2">
          {loadingRegs || loadingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Print Player Sheets
        </Button>
      </div>
    </div>
  );
}