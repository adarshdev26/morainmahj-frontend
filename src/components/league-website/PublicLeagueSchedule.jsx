import React, { useState } from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PublicLeagueSchedule({ sessions }) {
  const upcoming = (sessions || []).filter(s => s.status !== 'cancelled').slice(0, 20);
  const dates = [...new Set(upcoming.map(s => s.date))];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedDate = dates[selectedIdx];
  const daySessions = upcoming.filter(s => s.date === selectedDate);

  if (upcoming.length === 0) {
    return (
      <section id="schedule" className="py-8">
        <h2 className="text-2xl font-bold mb-4">Schedule</h2>
        <div className="text-center py-12 text-slate-400">
          <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No upcoming sessions scheduled.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="schedule" className="py-8">
      <h2 className="text-2xl font-bold mb-4">Schedule</h2>
      {dates.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {dates.map((d, i) => (
            <button key={d} onClick={() => setSelectedIdx(i)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${i === selectedIdx ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={i === selectedIdx ? { backgroundColor: 'var(--brand)' } : {}}>
              {formatDate(d)}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {daySessions.map(s => (
          <div key={s.id} className="flex items-center gap-4 bg-white border rounded-lg px-4 py-3">
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-800">{formatDate(s.date)}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                {s.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.start_time}{s.end_time ? ` – ${s.end_time}` : ''}</span>}
                {s.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.location}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}