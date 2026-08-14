import React from 'react';

/**
 * Shows 4 set slots as a horizontal progress bar row.
 * Each slot is filled/empty based on whether a non-zero score has been entered.
 */
export default function SetProgressBar({ scores = [] }) {
  const filled = scores.filter(s => s !== 0 && s !== '' && s !== '-').length;

  return (
    <div className="flex gap-1 items-center mt-1">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            scores[i] !== 0 && scores[i] !== '' && scores[i] !== '-'
              ? 'bg-primary'
              : 'bg-border'
          }`}
        />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap">{filled}/4</span>
    </div>
  );
}