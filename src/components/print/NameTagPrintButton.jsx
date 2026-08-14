import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

/**
 * Generates a printable name tag label (formatted for 62mm Brother DK labels)
 * and opens the browser print dialog so a check-in volunteer can print it
 * immediately to a connected label printer (e.g. Brother QL-820NWB).
 *
 * Props:
 *  - playerName: string (required)
 *  - table: number | null  — round 1 table assignment
 *  - flight: string | null
 *  - donatedSetTable: number | null  — borrowed/donated set table number
 *  - tournamentName: string | null
 */
export default function NameTagPrintButton({
  playerName,
  table,
  flight,
  donatedSetTable,
  tournamentName,
  className = '',
}) {
  const [generating, setGenerating] = useState(false);

  const handlePrint = async () => {
    setGenerating(true);
    try {
      // 62mm wide label (Brother DK-22205 continuous tape). Height tuned for a name tag.
      const WIDTH_MM = 62;
      const HEIGHT_MM = 45;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [WIDTH_MM, HEIGHT_MM] });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const cx = pageWidth / 2;

      // ── Brand header bar ──
      doc.setFillColor(30, 30, 45);
      doc.rect(0, 0, pageWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('MORAIN MAHJ', cx, 5.5, { align: 'center' });

      // ── Player name (large, centered) ──
      doc.setTextColor(20, 20, 30);
      const name = (playerName || 'Unknown Player').trim();
      let nameSize = 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(nameSize);
      // Shrink font if the name is too long to fit
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
      if (flight) seatingParts.push(`Flight ${flight}`);
      if (table) seatingParts.push(`Table ${table}`);
      const seatingLine = seatingParts.length > 0 ? seatingParts.join('  ·  ') : 'Table — TBD';
      doc.text(seatingLine, cx, 26, { align: 'center' });

      // ── Donated / borrowed set line (only if applicable) ──
      if (donatedSetTable) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(180, 50, 50);
        doc.text(`Donated Set → Table ${donatedSetTable}`, cx, 34, { align: 'center' });
      }

      // ── Footer: tournament name (truncated) ──
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 130);
      let footer = tournamentName || '';
      if (footer && doc.getTextWidth(footer) > pageWidth - 4) {
        while (doc.getTextWidth(footer + '…') > pageWidth - 4 && footer.length > 3) {
          footer = footer.slice(0, -1);
        }
        footer = footer + '…';
      }
      if (footer) {
        doc.text(footer, cx, pageHeight - 3, { align: 'center' });
      }

      // ── Open the PDF and trigger the print dialog ──
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (win) {
        // Give the PDF a moment to render, then call print
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch {
            /* Some browsers block print on cross-origin blob windows */
          }
        }, 600);
      }
    } catch (err) {
      console.error('Name tag generation failed:', err);
      alert('Could not generate name tag. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className={`gap-1.5 flex-shrink-0 ${className}`}
      onClick={handlePrint}
      disabled={generating}
      title="Print name tag label"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      Name Tag
    </Button>
  );
}