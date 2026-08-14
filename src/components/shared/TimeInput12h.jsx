import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Converts "HH:MM" (24h) → { hour12, minute, ampm }
function from24h(time24) {
  if (!time24) return { hour12: '12', minute: '00', ampm: 'AM' };
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour12: String(h), minute: m, ampm };
}

// Converts { hour12, minute, ampm } → "HH:MM" (24h)
function to24h(hour12, minute, ampm) {
  let h = parseInt(hour12, 10);
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${minute}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

export default function TimeInput12h({ value, onChange, placeholder }) {
  const [parts, setParts] = useState(() => from24h(value));

  // Sync external value changes
  useEffect(() => {
    setParts(from24h(value));
  }, [value]);

  const update = (newParts) => {
    setParts(newParts);
    onChange(to24h(newParts.hour12, newParts.minute, newParts.ampm));
  };

  return (
    <div className="flex items-center gap-1">
      <Select value={parts.hour12} onValueChange={v => update({ ...parts, hour12: v })}>
        <SelectTrigger className="w-[68px]">
          <SelectValue placeholder="hr" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>

      <span className="text-slate-400 font-semibold">:</span>

      <Select value={parts.minute} onValueChange={v => update({ ...parts, minute: v })}>
        <SelectTrigger className="w-[68px]">
          <SelectValue placeholder="min" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={parts.ampm} onValueChange={v => update({ ...parts, ampm: v })}>
        <SelectTrigger className="w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}