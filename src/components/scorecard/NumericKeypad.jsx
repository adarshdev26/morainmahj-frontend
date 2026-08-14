import React from 'react';
import { X, Delete, Minus } from 'lucide-react';
import { haptics } from '@/lib/haptics';

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['-', '0', '⌫'],
];

export default function NumericKeypad({ value, onChange, onClose, label }) {
  const handleKey = (key) => {
    haptics.light();
    if (key === '⌫') {
      const s = String(value ?? '');
      const next = s.slice(0, -1);
      onChange(next === '' || next === '-' ? next : Number(next));
      return;
    }
    if (key === '-') {
      const s = String(value ?? '');
      if (s.startsWith('-')) {
        onChange(Number(s.slice(1)));
      } else {
        onChange(s === '' || s === '0' ? '-' : Number('-' + s));
      }
      return;
    }
    const s = String(value ?? '');
    const next = s === '0' ? key : s === '-' ? '-' + key : s + key;
    onChange(next === '' ? 0 : isNaN(Number(next)) ? next : Number(next));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.45)' }}>
      {/* Tap outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-card rounded-t-2xl shadow-2xl pb-safe">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Label + current value */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-bold font-heading leading-none mt-1">
              {value === '' || value === '-' ? (value || '—') : (Number(value) >= 0 ? '+' : '') + value}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Keypad grid */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          {KEYS.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`h-16 rounded-xl text-xl font-semibold flex items-center justify-center active:scale-95 transition-transform select-none
                ${key === '⌫'
                  ? 'bg-destructive/10 text-destructive'
                  : key === '-'
                  ? 'bg-accent/20 text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                }`}
            >
              {key === '⌫' ? <Delete className="h-5 w-5" /> : key === '-' ? <Minus className="h-5 w-5" /> : key}
            </button>
          ))}
        </div>

        {/* Done button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => { haptics.medium(); onClose(); }}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-lg active:scale-[0.98] transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}