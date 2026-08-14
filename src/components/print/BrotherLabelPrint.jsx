import React, { useState } from 'react';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

const SEATS = ['East', 'South', 'West', 'North'];
const WIND = ['E', 'S', 'W', 'N'];

// 62mm wide label (Brother DK-22205 continuous tape), 45mm tall per name tag.
const WIDTH_MM = 62;
const HEIGHT_MM = 45;

function getPlayerAssignment(playerId, assignments, roundNumber) {
  const a = assignments.find(
    (x) =>
      x.round_number === roundNumber &&
      [x.player1_id, x.player2_id, x.player3_id, x.player4_id].includes(playerId)
  );
  if (!a) return null;
  const idx = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].indexOf(playerId);
  return { table: a.table_number, wind: WIND[idx], seat: SEATS[idx] };
}

export default function BrotherLabelPrint({ tournamentId, tournament }) {
  const [printing, setPrinting] = useState(false);

  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ['brother-label-registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: assignments = [], isLoading: loadingAssign } = useQuery({
    queryKey: ['brother-label-assignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const confirmed = registrations.filter((r) => r.status === 'confirmed');

  const handlePrintAll = async () => {
    if (!confirmed.length) return;
    setPrinting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [WIDTH_MM, HEIGHT_MM] });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const cx = pageWidth / 2;

      confirmed.forEach((reg, i) => {
        if (i > 0) doc.addPage([WIDTH_MM, HEIGHT_MM], 'landscape');

        // Round 1 table assignment
        const r1 = getPlayerAssignment(reg.player_id, assignments, 1);

        // ── Brand header bar ──
        doc.setFillColor(30, 30, 45);
        doc.rect(0, 0, pageWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('MORAIN MAHJ', cx, 5.5, { align: 'center' });

        // ── Player name (large, centered) ──
        doc.setTextColor(20, 20, 30);
        const name = (reg.player_name || 'Unknown Player').trim();
        let nameSize = 18;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(nameSize);
        while (doc.getTextWidth(name) > pageWidth - 6 && nameSize > 10) {
          nameSize -= 1;
          doc.setFontSize(nameSize);
        }
        doc.text(name, cx, 18, { align: 'center' });

        // ── Seating assignment line ──
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 70);
        const seatingParts = [];
        if (reg.flight) seatingParts.push(`Flight ${reg.flight}`);
        if (r1) seatingParts.push(`Table ${r1.table}`);
        const seatingLine = seatingParts.length > 0 ? seatingParts.join('  ·  ') : 'Table — TBD';
        doc.text(seatingLine, cx, 26, { align: 'center' });

        // ── Donated / borrowed set line (only if applicable) ──
        if (reg.bringing_borrowed_set) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(180, 50, 50);
          doc.text(`Donated Set → Table ${reg.borrowed_set_table_number || 'TBD'}`, cx, 34, { align: 'center' });
        }

        // ── Footer: tournament name (truncated) ──
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 130);
        let footer = tournament?.name || '';
        if (footer && doc.getTextWidth(footer) > pageWidth - 4) {
          while (doc.getTextWidth(footer + '…') > pageWidth - 4 && footer.length > 3) {
            footer = footer.slice(0, -1);
          }
          footer = footer + '…';
        }
        if (footer) {
          doc.text(footer, cx, pageHeight - 3, { align: 'center' });
        }
      });

      // Open the multi-page PDF and trigger the print dialog
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (win) {
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch {
            /* cross-origin blob print blocked */
          }
        }, 600);
      }
    } catch (err) {
      console.error('Brother label generation failed:', err);
      alert('Could not generate name tag labels. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generates a <strong>62mm</strong> continuous label PDF — one name tag per page, formatted for
        the Brother QL-820NWB label printer.
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-sm text-muted-foreground">
          {confirmed.length} label{confirmed.length !== 1 ? 's' : ''} ready
        </p>
        <Button onClick={handlePrintAll} disabled={loadingRegs || loadingAssign || printing || !confirmed.length} className="gap-2">
          {loadingRegs || loadingAssign || printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Print Brother Labels
        </Button>
      </div>
    </div>
  );
}