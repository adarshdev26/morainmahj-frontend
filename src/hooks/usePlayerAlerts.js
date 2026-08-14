import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { subscribe } from '@/services/realtime';

// ─── Tournament alerts ────────────────────────────────────────────────────────
/**
 * Fires toasts when:
 *   1. The player's table assignment changes for any round (T)
 *   2. A running RoundTimer is stopped early — round paused/delayed (T)
 */
export function usePlayerAlerts({ tournamentId, userId }) {
  const prevTablesRef = useRef({});      // { [round_number]: table_number }
  const runningTimersRef = useRef({});   // { [round_number]: true }

  useEffect(() => {
    if (!tournamentId || !userId) return;

    // 1. Table assignment changes
    const unsubAssignments = subscribe((event) => {
      if (event.type === 'delete') return;
      const a = event.data;
      if (!a || a.tournament_id !== tournamentId) return;

      const playerKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
      const winds = ['East', 'South', 'West', 'North'];
      const myIdx = playerKeys.findIndex(k => a[k] === userId);
      if (myIdx === -1) return;

      const round = a.round_number;
      const newTable = a.table_number;
      const wind = winds[myIdx];
      const prevTable = prevTablesRef.current[round];

      if (prevTable !== undefined && prevTable !== newTable) {
        toast.warning(`📍 Table update — Round ${round}`, {
          description: `You've been moved to Table ${newTable} (${wind} seat).`,
          duration: 8000,
        });
      }
      prevTablesRef.current[round] = newTable;
    });

    // 2. Round timer stopped early
    const unsubTimers = subscribe((event) => {
      if (event.type === 'delete') return;
      const t = event.data;
      if (!t || t.tournament_id !== tournamentId) return;

      const round = t.round_number;

      if (t.status === 'running') {
        runningTimersRef.current[round] = true;
      } else if (t.status === 'stopped' && runningTimersRef.current[round]) {
        if (t.started_at && t.duration_minutes) {
          const startedMs = new Date(t.started_at).getTime();
          const expectedEndMs = startedMs + t.duration_minutes * 60 * 1000;
          const stoppedMs = t.stopped_at ? new Date(t.stopped_at).getTime() : Date.now();
          const minutesRemaining = Math.round((expectedEndMs - stoppedMs) / 60000);
          if (minutesRemaining > 2) {
            toast.info(`⏸️ Round ${round} timer paused`, {
              description: `The director has paused the timer with ~${minutesRemaining} min remaining. Please wait for further instructions.`,
              duration: 10000,
            });
          }
        }
        delete runningTimersRef.current[round];
      } else if (t.status === 'idle') {
        delete runningTimersRef.current[round];
      }
    });

    return () => {
      unsubAssignments();
      unsubTimers();
    };
  }, [tournamentId, userId]);
}

// ─── League alerts ────────────────────────────────────────────────────────────
/**
 * Fires toasts when:
 *   1. The player's league table assignment changes (L)
 *   2. A running LeagueRoundTimer is stopped early — round paused/delayed (L)
 *
 * @param {string[]} sessionIds  - IDs of the league sessions to watch
 * @param {string|null} userEmail
 */
export function useLeagueAlerts({ sessionIds = [], userEmail }) {
  const prevTablesRef = useRef({});    // { [`${sessionId}-${round}`]: table_number }
  const runningTimersRef = useRef({}); // { [`${sessionId}-${round}`]: true }

  useEffect(() => {
    if (!userEmail || sessionIds.length === 0) return;
    const sessionSet = new Set(sessionIds);

    // 1. League table assignment changes
    const unsubAssignments = subscribe((event) => {
      if (event.type === 'delete') return;
      const a = event.data;
      if (!a || !sessionSet.has(a.session_id)) return;

      const winds = ['east', 'south', 'west', 'north'];
      const myWind = winds.find(w => a[`${w}_player_email`] === userEmail);
      if (!myWind) return;

      const key = `${a.session_id}-${a.round_number}`;
      const newTable = a.table_number;
      const prevTable = prevTablesRef.current[key];

      if (prevTable !== undefined && prevTable !== newTable) {
        toast.warning(`📍 Table update — Round ${a.round_number}`, {
          description: `You've been moved to Table ${newTable} (${myWind.charAt(0).toUpperCase() + myWind.slice(1)} seat).`,
          duration: 8000,
        });
      }
      prevTablesRef.current[key] = newTable;
    });

    // 2. League round timer stopped early
    const unsubTimers = subscribe((event) => {
      if (event.type === 'delete') return;
      const t = event.data;
      if (!t || !sessionSet.has(t.session_id)) return;

      const key = `${t.session_id}-${t.round_number}`;

      if (t.status === 'running') {
        runningTimersRef.current[key] = true;
      } else if (t.status === 'stopped' && runningTimersRef.current[key]) {
        if (t.started_at && t.duration_minutes) {
          const startedMs = new Date(t.started_at).getTime();
          const expectedEndMs = startedMs + t.duration_minutes * 60 * 1000;
          const stoppedMs = t.stopped_at ? new Date(t.stopped_at).getTime() : Date.now();
          const minutesRemaining = Math.round((expectedEndMs - stoppedMs) / 60000);
          if (minutesRemaining > 2) {
            toast.info(`⏸️ Round ${t.round_number} timer paused`, {
              description: `The league director has paused the round with ~${minutesRemaining} min remaining. Please wait.`,
              duration: 10000,
            });
          }
        }
        delete runningTimersRef.current[key];
      } else if (t.status === 'idle') {
        delete runningTimersRef.current[key];
      }
    });

    return () => {
      unsubAssignments();
      unsubTimers();
    };
  }, [sessionIds.join(','), userEmail]);
}

// ─── Course alerts ────────────────────────────────────────────────────────────
/**
 * Fires toasts when:
 *   1. A lesson the student is enrolled in becomes active (starts today)
 *   2. A lesson is cancelled
 *
 * @param {string[]} courseIds  - IDs of enrolled courses to watch
 */
export function useCourseAlerts({ courseIds = [] }) {
  const seenLessonsRef = useRef(new Set()); // lesson IDs we've already alerted on

  useEffect(() => {
    if (courseIds.length === 0) return;
    const courseSet = new Set(courseIds);

    const unsubLessons = subscribe((event) => {
      if (event.type === 'delete') return;
      const l = event.data;
      if (!l || !courseSet.has(l.course_id)) return;

      const alertKey = `${l.id}-${l.status}`;
      if (seenLessonsRef.current.has(alertKey)) return;

      if (l.status === 'active') {
        seenLessonsRef.current.add(alertKey);
        toast.success(`📚 Lesson starting now`, {
          description: `"${l.title || `Lesson ${l.lesson_number}`}" is now active${l.location ? ` at ${l.location}` : ''}.`,
          duration: 10000,
        });
      } else if (l.status === 'cancelled') {
        seenLessonsRef.current.add(alertKey);
        toast.error(`❌ Lesson cancelled`, {
          description: `"${l.title || `Lesson ${l.lesson_number}`}" has been cancelled by the instructor.`,
          duration: 12000,
        });
      }
    });

    return () => unsubLessons();
  }, [courseIds.join(',')]);
}