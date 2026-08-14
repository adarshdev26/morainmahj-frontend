import React, { useState, useMemo } from 'react';
import { courseEnrollments as courseEnrollmentsApi, lessonFlightings as lessonFlightingsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shuffle, Plus, Trash2, UserCheck, Users } from 'lucide-react';

const SEATS = ['East', 'South', 'West', 'North'];
const FLIGHT_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-teal-100 text-teal-700 border-teal-200',
];

function flightColor(label) {
  const idx = (label?.charCodeAt(0) || 0) % FLIGHT_COLORS.length;
  return FLIGHT_COLORS[idx];
}

export default function LessonFlightingPanel({ lesson, courseId }) {
  const queryClient = useQueryClient();
  const [newFlight, setNewFlight] = useState('');

  // Enrolled students
  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', courseId],
    queryFn: () => courseEnrollmentsApi.filter({ course_id: courseId }, 'player_name'),
  });

  // Existing flighting for this lesson
  const { data: flightings = [] } = useQuery({
    queryKey: ['flightings', lesson.id],
    queryFn: () => lessonFlightingsApi.filter({ lesson_id: lesson.id }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ enrollmentId, flight, seat }) => {
      const existing = flightings.find(f => f.enrollment_id === enrollmentId);
      if (existing) {
        return lessonFlightingsApi.update(existing.id, { flight, seat: seat || '' });
      }
      const enr = enrollments.find(e => e.id === enrollmentId);
      return lessonFlightingsApi.create({
        lesson_id: lesson.id,
        course_id: courseId,
        enrollment_id: enrollmentId,
        player_name: enr?.player_name || '',
        player_email: enr?.player_email || '',
        flight,
        seat: seat || '',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flightings', lesson.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => lessonFlightingsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flightings', lesson.id] }),
  });

  const activeEnrollments = enrollments.filter(e => e.status === 'enrolled');

  // Group assigned students by flight
  const byFlight = useMemo(() => {
    const map = {};
    flightings.forEach(f => {
      if (!map[f.flight]) map[f.flight] = [];
      map[f.flight].push(f);
    });
    return map;
  }, [flightings]);

  const flights = Object.keys(byFlight).sort();

  // Students not yet assigned
  const unassigned = activeEnrollments.filter(e => !flightings.find(f => f.enrollment_id === e.id));

  // Auto-assign: shuffle unassigned students into existing flights (4 per table)
  const autoAssign = () => {
    if (unassigned.length === 0) return;
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    const allStudents = [...activeEnrollments].sort(() => Math.random() - 0.5);

    // Clear existing and reassign everyone
    const numTables = Math.ceil(allStudents.length / 4);
    const tableLabels = Array.from({ length: numTables }, (_, i) => String.fromCharCode(65 + i)); // A, B, C...

    // Delete all existing then recreate
    Promise.all(flightings.map(f => lessonFlightingsApi.remove(f.id))).then(() => {
      const creates = allStudents.map((enr, idx) => {
        const tableIdx = Math.floor(idx / 4);
        const seatIdx = idx % 4;
        return lessonFlightingsApi.create({
          lesson_id: lesson.id,
          course_id: courseId,
          enrollment_id: enr.id,
          player_name: enr.player_name || '',
          player_email: enr.player_email || '',
          flight: tableLabels[tableIdx],
          seat: SEATS[seatIdx],
        });
      });
      return Promise.all(creates);
    }).then(() => queryClient.invalidateQueries({ queryKey: ['flightings', lesson.id] }));
  };

  const clearAll = () => {
    if (!confirm('Clear all flight assignments for this lesson?')) return;
    Promise.all(flightings.map(f => lessonFlightingsApi.remove(f.id)))
      .then(() => queryClient.invalidateQueries({ queryKey: ['flightings', lesson.id] }));
  };

  const removeStudent = (enrollmentId) => {
    const existing = flightings.find(f => f.enrollment_id === enrollmentId);
    if (existing) deleteMutation.mutate(existing.id);
  };

  const assignToFlight = (enrollmentId, flight) => {
    if (!flight) return;
    saveMutation.mutate({ enrollmentId, flight });
  };

  const updateSeat = (flighting, seat) => {
    lessonFlightingsApi.update(flighting.id, { seat })
      .then(() => queryClient.invalidateQueries({ queryKey: ['flightings', lesson.id] }));
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{activeEnrollments.length}</span> enrolled students
          {unassigned.length > 0 && <span className="ml-2 text-amber-600">· {unassigned.length} unassigned</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={autoAssign} disabled={activeEnrollments.length === 0}>
            <Shuffle className="h-3.5 w-3.5" /> Auto-Assign Tables
          </Button>
          {flightings.length > 0 && (
            <Button size="sm" variant="outline" className="gap-2 text-red-500 hover:text-red-700" onClick={clearAll}>
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Unassigned students */}
      {unassigned.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <Users className="h-4 w-4" /> Unassigned ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {unassigned.map(enr => (
                <div key={enr.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700">{enr.player_name}</span>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(flight) => assignToFlight(enr.id, flight)}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Assign..." /></SelectTrigger>
                      <SelectContent>
                        {flights.map(f => <SelectItem key={f} value={f}>Table {f}</SelectItem>)}
                        {newFlight && <SelectItem value={newFlight}>Table {newFlight} (new)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add new flight */}
      <div className="flex items-center gap-2">
        <Input
          className="h-8 w-32 text-sm"
          placeholder="New table (e.g. D)"
          value={newFlight}
          onChange={e => setNewFlight(e.target.value.toUpperCase())}
          maxLength={4}
        />
        <span className="text-xs text-slate-400">Type a label to create a new table</span>
      </div>

      {/* Flight groups */}
      {flights.length === 0 && unassigned.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          No students enrolled yet, or click Auto-Assign to get started.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {flights.map(flight => {
          const members = byFlight[flight] || [];
          return (
            <Card key={flight} className="border-2">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${flightColor(flight)}`}>
                    Table {flight}
                  </span>
                  <span className="text-slate-400 font-normal">{members.length} / 4</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {SEATS.map(seat => {
                  const assigned = members.find(m => m.seat === seat);
                  const unoccupied = members.find(m => !m.seat);
                  return (
                    <div key={seat} className="flex items-center gap-2 min-h-[32px]">
                      <span className={`text-[10px] font-bold w-10 shrink-0 uppercase tracking-wide ${
                        seat === 'East' ? 'text-red-500' :
                        seat === 'South' ? 'text-blue-500' :
                        seat === 'West' ? 'text-green-500' : 'text-amber-500'
                      }`}>{seat[0]}</span>
                      {assigned ? (
                        <div className="flex items-center justify-between flex-1 gap-1">
                          <span className="text-sm text-slate-700 truncate">{assigned.player_name}</span>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-400 shrink-0"
                            onClick={() => removeStudent(assigned.enrollment_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <Select onValueChange={(enrollmentId) => {
                            if (!enrollmentId) return;
                            saveMutation.mutate({ enrollmentId, flight, seat });
                          }}>
                            <SelectTrigger className="h-7 text-xs border-dashed text-slate-400">
                              <SelectValue placeholder="— empty —" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...unassigned, ...members.filter(m => m.seat !== seat)].map(item => {
                                // item might be enrollment or flighting
                                const id = item.enrollment_id || item.id;
                                const name = item.player_name;
                                return <SelectItem key={id} value={id}>{name}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Show any members without a seat */}
                {members.filter(m => !m.seat).map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-[10px] w-10 text-slate-300">—</span>
                    <div className="flex items-center justify-between flex-1 gap-1">
                      <span className="text-sm text-slate-700 truncate">{m.player_name}</span>
                      <div className="flex items-center gap-1">
                        <Select onValueChange={(seat) => updateSeat(m, seat)}>
                          <SelectTrigger className="h-6 text-xs w-24"><SelectValue placeholder="Seat" /></SelectTrigger>
                          <SelectContent>
                            {SEATS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-400"
                          onClick={() => removeStudent(m.enrollment_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}