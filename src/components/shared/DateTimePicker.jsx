import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// value: "YYYY-MM-DDTHH:MM" string (local time), onChange: (val) => void
export default function DateTimePicker({ value, onChange }) {
  // Parse existing value
  const date = value ? value.slice(0, 10) : '';
  const timePart = value ? value.slice(11, 16) : '';
  const rawHour = timePart ? parseInt(timePart.slice(0, 2), 10) : '';
  const rawMin = timePart ? timePart.slice(3, 5) : '';

  const hour12 = rawHour === '' ? '' : rawHour === 0 ? '12' : rawHour > 12 ? String(rawHour - 12) : String(rawHour);
  const ampm = rawHour === '' ? 'AM' : rawHour >= 12 ? 'PM' : 'AM';
  const minute = rawMin || '';

  const buildValue = (d, h12, min, ap) => {
    if (!d || h12 === '' || min === '') return '';
    let h = parseInt(h12, 10);
    if (ap === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return `${d}T${String(h).padStart(2, '0')}:${min}`;
  };

  const handleDate = (e) => {
    onChange(buildValue(e.target.value, hour12, minute, ampm));
  };
  const handleHour = (h) => onChange(buildValue(date, h, minute, ampm));
  const handleMin = (m) => onChange(buildValue(date, hour12, m, ampm));
  const handleAmPm = (ap) => onChange(buildValue(date, hour12, minute, ap));
  const handleClear = () => onChange('');

  const hours = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  const minutes = ['00','15','30','45'];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Input
        type="date"
        value={date}
        onChange={handleDate}
        className="w-36 flex-shrink-0"
      />
      <Select value={hour12} onValueChange={handleHour}>
        <SelectTrigger className="w-16">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={minute} onValueChange={handleMin}>
        <SelectTrigger className="w-16">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={ampm} onValueChange={handleAmPm}>
        <SelectTrigger className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
      {value && (
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-slate-400 hover:text-slate-600" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}