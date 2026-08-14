import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, Send, Clock, CheckCircle2, RotateCcw,
  Trophy, ClipboardList, ListOrdered, User, CalendarDays,
  MapPin, ChevronRight, Star, Home
} from 'lucide-react';

// ─── Demo Data ───────────────────────────────────────────────
const TOURNAMENT = { name: 'Spring Invitational 2026', location: 'Chicago, IL', date: 'May 10, 2026', rounds: 4 };

const PLAYERS = [
  { name: 'Margaret H.', wind: 'East',  isYou: true },
  { name: 'David C.',    wind: 'South', isYou: false },
  { name: 'Susan T.',    wind: 'West',  isYou: false },
  { name: 'Robert K.',   wind: 'North', isYou: false },
];

const STANDINGS = [
  { name: 'Susan T.',    total: 124, isYou: false },
  { name: 'Margaret H.', total: 98,  isYou: true  },
  { name: 'Robert K.',   total: 76,  isYou: false },
  { name: 'David C.',    total: 52,  isYou: false },
  { name: 'Linda M.',    total: 44,  isYou: false },
  { name: 'James P.',    total: 31,  isYou: false },
];

const WIND_COLORS = {
  East:  'bg-red-100 text-red-700 border-red-200',
  South: 'bg-blue-100 text-blue-700 border-blue-200',
  West:  'bg-green-100 text-green-700 border-green-200',
  North: 'bg-amber-100 text-amber-700 border-amber-200',
};
const WIND_TEXT = { East: 'text-[#d4547a]', South: 'text-blue-700', West: 'text-green-700', North: 'text-amber-700' };

const INITIAL_SCORES = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];

// ─── Keypad ───────────────────────────────────────────────────
function Keypad({ label, value, onChange, onClose }) {
  const [display, setDisplay] = useState(value === 0 ? '' : String(Math.abs(value)));
  const [negative, setNegative] = useState(value < 0);

  const realValue = () => {
    const n = parseInt(display || '0', 10);
    return negative ? -Math.abs(n) : n;
  };

  const press = (d) => { if (display.length < 5) setDisplay(prev => prev === '0' ? d : prev + d); };
  const del = () => setDisplay(prev => prev.slice(0, -1));
  const clear = () => { setDisplay(''); setNegative(false); };
  const confirm = () => { onChange(realValue()); onClose(); };
  const shown = (display === '' ? '0' : display);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card rounded-t-3xl shadow-2xl pb-6 pt-4 px-4" onClick={e => e.stopPropagation()}>
        <p className="text-center text-xs text-muted-foreground mb-1">{label}</p>
        <div className="text-center text-4xl font-bold font-heading mb-4 h-12 flex items-center justify-center">
          {negative ? '-' : ''}{shown}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => press(d)}
              className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:scale-95 transition-all hover:bg-secondary/80">{d}</button>
          ))}
          <button onClick={() => setNegative(n => !n)} className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:scale-95 transition-all hover:bg-secondary/80">±</button>
          <button onClick={() => press('0')} className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:scale-95 transition-all hover:bg-secondary/80">0</button>
          <button onClick={del} className="h-14 rounded-xl bg-secondary text-muted-foreground text-xl active:scale-95 transition-all hover:bg-secondary/80">⌫</button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={clear} className="flex-1 h-12 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted active:scale-95 transition-all">Clear</button>
          <button onClick={confirm} className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Scorecard Tab ────────────────────────────────────────────
// Demo logic:
//   - You (East, pi=0) can ONLY enter your own score (pi=0)
//   - Other players' scores are entered by them on their own devices
//   - In this demo, a "Simulate others" button reveals their scores per set
//   - Once YOU have submitted your score for a set AND all others have submitted theirs,
//     East can verify that set
function ScorecardTab() {
  // scores[playerIdx][setIdx]
  const [scores, setScores] = useState(INITIAL_SCORES.map(r => [...r]));
  // Whether "you" (East) have submitted your score for each set
  const [mySetSubmitted, setMySetSubmitted] = useState([false,false,false,false]);
  // Whether the OTHER 3 players have submitted their scores for each set (simulated in demo)
  const [othersSubmitted, setOthersSubmitted] = useState([false,false,false,false]);
  // Whether East has verified each set
  const [setVerifiedAt, setSetVerifiedAt] = useState([null,null,null,null]);
  const [activeCell, setActiveCell] = useState(null);
  const [roundVerified, setRoundVerified] = useState(false);

  const getTotal = (pIdx) => scores[pIdx].reduce((s,v) => s+v, 0);
  const myScore = (si) => scores[0][si];
  const myTotal = getTotal(0);

  const handleMyScoreChange = (si, val) => {
    setScores(prev => { const n = prev.map(r=>[...r]); n[0][si] = val; return n; });
  };

  // East submits their own score for a set
  const submitMyScore = (si) => {
    const next = [...mySetSubmitted];
    next[si] = true;
    setMySetSubmitted(next);
  };

  // Demo helper: simulate the other 3 players submitting their scores for a set
  const simulateOthers = (si) => {
    // Assign plausible demo scores to the other 3 players
    const demoScores = [[12, -8, 15, -5], [20, -15, 10, -8], [-10, 18, -6, 14]];
    setScores(prev => {
      const n = prev.map(r=>[...r]);
      [1,2,3].forEach((pi, i) => { n[pi][si] = demoScores[i][si] ?? (i % 2 === 0 ? 10 : -10); });
      return n;
    });
    const next = [...othersSubmitted];
    next[si] = true;
    setOthersSubmitted(next);
  };

  // East verifies a set (all 4 players have submitted)
  const verifySet = (si) => {
    const next = [...setVerifiedAt];
    next[si] = new Date().toLocaleTimeString();
    setSetVerifiedAt(next);
    if (next.every(Boolean)) setRoundVerified(true);
  };

  const reset = () => {
    setScores(INITIAL_SCORES.map(r=>[...r]));
    setMySetSubmitted([false,false,false,false]);
    setOthersSubmitted([false,false,false,false]);
    setSetVerifiedAt([null,null,null,null]);
    setRoundVerified(false);
    setActiveCell(null);
  };

  const allSetsVerified = setVerifiedAt.every(Boolean);

  const overallStatus = roundVerified ? 'verified' : mySetSubmitted.some(Boolean) ? 'submitted' : 'pending';
  const stCfg = {
    pending:   { label: 'Pending',              icon: Clock,       cls: 'bg-secondary text-secondary-foreground' },
    submitted: { label: 'Awaiting Verification', icon: Send,        cls: 'bg-amber-100 text-amber-700' },
    verified:  { label: 'Verified',              icon: ShieldCheck, cls: 'bg-green-100 text-green-700' },
  };
  const st = stCfg[overallStatus];

  return (
    <div>
      {/* Score summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl px-4 py-3 flex flex-col items-center shadow-sm">
          <span className="text-xs text-slate-500 mb-1">Your Tournament Total</span>
          <span className={`text-2xl font-bold font-heading ${myTotal < 0 ? 'text-red-500' : 'text-[#d4547a]'}`}>
            {myTotal > 0 ? '+' : ''}{myTotal}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">across 1 round</span>
        </div>
        <div className="bg-white border border-[#d4547a]/30 rounded-xl px-4 py-3 flex flex-col items-center shadow-sm">
          <span className="text-xs text-slate-500 mb-1">Table Total (Round 1)</span>
          <span className="text-2xl font-bold font-heading text-[#1a2744]">
            {PLAYERS.reduce((s,_,i) => s + getTotal(i), 0)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">all 4 players combined</span>
        </div>
      </div>

      {/* Round tab */}
      <div className="flex gap-2 mb-4">
        {[1,2,3,4].map(r => (
          <button key={r}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              r === 1 ? 'bg-white text-[#0f1b35] border-white' : 'bg-white/10 text-blue-200/60 border-white/10'
            }`}>
            Round {r}
            {r === 1 && roundVerified && <CheckCircle2 className="inline h-3 w-3 ml-1" />}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Table 3</h2>
          <p className="text-sm text-blue-200/70">Round 1 · {TOURNAMENT.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={st.cls}><st.icon className="h-3 w-3 mr-1" />{st.label}</Badge>
          <button onClick={reset} className="flex items-center gap-1 text-xs text-blue-200/60 hover:text-white border border-white/20 rounded-lg px-2 py-1 transition-colors">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      {/* East banner */}
      <div className={`mb-4 px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${WIND_COLORS.East}`}>
        <span className="text-lg font-bold w-6 text-center">E</span>
        <span>You are seated <strong>East</strong>
          <span className="font-normal text-xs ml-1 opacity-75">— enter your score, then verify others after each set</span>
        </span>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {PLAYERS.map((p, pi) => {
          const total = getTotal(pi);
          const hasData = othersSubmitted.some(Boolean) || pi === 0;
          return (
            <div key={pi} className={`rounded-xl border px-2 py-2 flex flex-col items-center shadow-sm ${p.isYou ? 'border-[#d4547a]/60 bg-[#d4547a]/10 bg-white' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-bold ${WIND_TEXT[p.wind]}`}>{p.wind[0]}</span>
              <span className={`text-lg font-bold font-heading leading-tight ${total < 0 ? 'text-red-500' : total > 0 ? 'text-[#1a2744]' : 'text-slate-300'}`}>
                {pi === 0 || hasData ? (total > 0 ? '+' : '') + total : '—'}
              </span>
              <span className="text-[9px] text-slate-400 truncate w-full text-center">{p.name.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Sets */}
      <div className="space-y-4">
        {[0,1,2,3].map(si => {
          const iSubmitted = mySetSubmitted[si];
          const othSub     = othersSubmitted[si];
          const verified   = !!setVerifiedAt[si];
          const allIn      = iSubmitted && othSub;
          const canVerify  = allIn && !verified && !roundVerified;
          const myVal      = scores[0][si];
          const myHasVal   = myVal !== 0;

          return (
            <div key={si} className={`rounded-xl border-2 p-3 transition-all ${
              verified  ? 'border-green-400 bg-white' :
              allIn     ? 'border-amber-400 bg-white' :
              'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#1a2744]">Set {si+1}</span>
                {verified ? <Badge className="bg-green-100 text-green-700 text-xs"><ShieldCheck className="h-3 w-3 mr-1"/>✓ Verified</Badge> :
                 allIn    ? <Badge className="bg-amber-100 text-amber-700 text-xs"><Send className="h-3 w-3 mr-1"/>All Submitted</Badge> :
                            <Badge className="bg-slate-100 text-slate-400 text-xs"><Clock className="h-3 w-3 mr-1"/>Pending</Badge>}
              </div>

              {/* Player cells */}
              <div className="grid grid-cols-4 gap-2">
                {PLAYERS.map((p, pi) => {
                  const isMe = pi === 0;
                  const val = scores[pi][si];
                  const hasVal = val !== 0;
                  // Only "you" (East) can tap your own cell; others are read-only
                  const canTap = isMe && !iSubmitted && !roundVerified;
                  const isActive = activeCell?.pi === pi && activeCell?.si === si;
                  const othHasScore = !isMe && othSub;

                  return (
                    <button key={pi}
                      disabled={!canTap}
                      onClick={() => canTap && setActiveCell({ pi, si })}
                      className={`flex flex-col items-center justify-center h-16 rounded-xl border-2 transition-all select-none
                        ${isActive ? 'border-[#e8799a] bg-[#fdf0f4]' :
                          isMe && myHasVal ? 'border-[#d4547a]/60 bg-[#fdf0f4]' :
                          othHasScore ? 'border-slate-300 bg-slate-50' :
                          'border-slate-200 bg-slate-50'}
                        ${canTap ? 'cursor-pointer hover:border-[#d4547a]/60 active:scale-95' : 'cursor-not-allowed'}`}
                    >
                      <span className={`text-[9px] font-bold mb-0.5 ${WIND_TEXT[p.wind]}`}>{p.wind[0]}</span>
                      {isMe ? (
                        <span className={`text-base font-bold leading-none ${myVal < 0 ? 'text-red-500' : myHasVal ? 'text-[#1a2744]' : 'text-slate-300'}`}>
                          {myHasVal ? ((myVal > 0 ? '+' : '') + myVal) : '—'}
                        </span>
                      ) : (
                        <span className={`text-base font-bold leading-none ${othHasScore ? (val < 0 ? 'text-red-500' : 'text-[#1a2744]') : 'text-slate-300'}`}>
                          {othHasScore ? ((val > 0 ? '+' : '') + val) : '—'}
                        </span>
                      )}
                      {isMe && <span className="text-[8px] text-[#d4547a] mt-0.5">you</span>}
                    </button>
                  );
                })}
              </div>

              {/* Action row */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {/* East: submit your own score */}
                {!iSubmitted && !roundVerified && (
                  <Button size="sm"
                    className="flex-1 gap-1.5 text-xs h-8 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    disabled={!myHasVal}
                    onClick={() => submitMyScore(si)}>
                    <Send className="h-3 w-3" />
                    {myHasVal ? `Submit My Score` : 'Enter your score first'}
                  </Button>
                )}

                {/* Demo helper: simulate other players submitting */}
                {iSubmitted && !othSub && !verified && (
                  <button
                    onClick={() => simulateOthers(si)}
                    className="flex-1 text-center text-[11px] text-[#e8799a] underline underline-offset-2 py-1.5 hover:opacity-80">
                    ▶ Demo: simulate others submitting Set {si+1}
                  </button>
                )}

                {/* East: verify the set once all 4 are in */}
                {canVerify && (
                  <Button size="sm" className="flex-1 gap-1.5 text-xs h-8 bg-[#d4547a] hover:bg-[#c04470] text-white border-0" onClick={() => verifySet(si)}>
                    <ShieldCheck className="h-3 w-3" /> Verify Set {si+1}
                  </Button>
                )}

                {verified && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 text-green-300 text-xs font-medium py-1 bg-green-500/15 rounded-lg border border-green-400/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </div>
                )}

                {!iSubmitted && !myHasVal && (
                  <p className="w-full text-center text-[11px] text-slate-400">Tap your score cell (E) to enter your score</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {roundVerified && (
        <div className="flex items-center justify-center gap-2 text-green-300 text-sm font-medium py-3 bg-green-500/15 rounded-xl border border-green-400/30 mt-5">
          <CheckCircle2 className="h-5 w-5" /> All scores verified — round complete!
        </div>
      )}

      {activeCell && (
        <Keypad
          label={`Your score — Set ${activeCell.si + 1}`}
          value={scores[0][activeCell.si]}
          onChange={(val) => handleMyScoreChange(activeCell.si, val)}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}

// ─── Standings Tab ────────────────────────────────────────────
function StandingsTab() {
  return (
    <div>
      <h2 className="text-lg font-heading font-bold mb-1 text-white">{TOURNAMENT.name}</h2>
      <p className="text-sm text-blue-200/70 mb-4">Live standings after Round 1</p>
      <div className="space-y-2">
        {STANDINGS.map((p, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${p.isYou ? 'border-[#d4547a]/40 bg-white' : 'bg-white border-slate-200'}`}>
            <span className={`w-6 text-sm font-bold text-center ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
            </span>
            <span className="flex-1 text-sm font-medium text-[#1a2744]">
              {p.name}{p.isYou && <span className="ml-2 text-xs font-normal text-[#d4547a]">(you)</span>}
            </span>
            <span className={`text-sm font-bold font-heading ${p.total < 0 ? 'text-red-500' : p.isYou ? 'text-[#d4547a]' : 'text-[#1a2744]'}`}>
              {p.total > 0 ? '+' : ''}{p.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tournaments Tab ──────────────────────────────────────────
function TournamentsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-heading font-bold mb-1 text-white">My Tournaments</h2>

      {/* Active */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="bg-[#d4547a] text-white mb-2 text-xs border-0">Active</Badge>
            <h3 className="font-semibold text-[#1a2744]">{TOURNAMENT.name}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <CalendarDays className="h-3 w-3" /> {TOURNAMENT.date}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3" /> {TOURNAMENT.location}
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">Confirmed</Badge>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>4 rounds · Table 3</span>
          <span className="flex items-center gap-1 text-[#d4547a] font-medium">View Scorecard <ChevronRight className="h-3 w-3" /></span>
        </div>
      </div>

      {/* Past */}
      <div className="border border-slate-200 bg-white rounded-xl p-4 opacity-75 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="mb-2 text-xs bg-slate-100 text-slate-600 border-slate-200">Completed</Badge>
            <h3 className="font-semibold text-[#1a2744]">Fall Classic 2025</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <CalendarDays className="h-3 w-3" /> Nov 8, 2025
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3" /> Chicago, IL
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-heading text-[#d4547a]">+98</div>
            <div className="text-[10px] text-slate-400">Final score</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────
function ProfileTab() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="w-16 h-16 rounded-full bg-[#d4547a] flex items-center justify-center">
          <User className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-[#1a2744]">Margaret H.</h2>
          <p className="text-sm text-slate-600">margaret@example.com</p>
          <p className="text-xs text-slate-400 mt-0.5">Chicago, IL</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Full Name', value: 'Margaret Holloway' },
          { label: 'Email', value: 'margaret@example.com' },
          { label: 'Phone', value: '+1 (312) 555-0142' },
          { label: 'City / State', value: 'Chicago, IL' },
        ].map(f => (
          <div key={f.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
            <p className="text-sm font-medium text-[#1a2744]">{f.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Stats</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xl font-bold font-heading text-[#1a2744]">12</p><p className="text-[10px] text-slate-400">Tournaments</p></div>
          <div><p className="text-xl font-bold font-heading text-[#d4547a]">+847</p><p className="text-[10px] text-slate-400">Total Score</p></div>
          <div><p className="text-xl font-bold font-heading text-[#1a2744]">3</p><p className="text-[10px] text-slate-400">Top 3 Finishes</p></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
const TABS = [
  { id: 'scorecard',    label: 'Scorecard',   icon: ClipboardList },
  { id: 'standings',   label: 'Standings',    icon: ListOrdered   },
  { id: 'tournaments', label: 'Tournaments',  icon: Trophy        },
  { id: 'profile',     label: 'Profile',      icon: User          },
];

export default function PlayerDemo() {
  const [activeTab, setActiveTab] = useState('scorecard');

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0f1b35' }}>
      {/* Demo banner */}
      <div className="sticky top-0 z-30 bg-[#d4547a] px-4 py-2.5 flex items-center gap-2">
        <Star className="h-4 w-4 text-white shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Player View Demo — Margaret H.</p>
          <p className="text-[11px] text-pink-100 truncate">Tap the bottom tabs to explore each screen</p>
        </div>
      </div>

      {/* Mobile header */}
      <div className="bg-[#1a2744] px-4 py-3 flex items-center justify-between">
        <span className="font-heading font-bold text-lg text-white">Morain Mahj</span>
        <div className="flex items-center gap-2">
          <a href="/demo/tournament-overview" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <Home className="h-4 w-4 text-white" />
          </a>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 max-w-lg mx-auto text-white">
        {activeTab === 'scorecard'    && <ScorecardTab />}
        {activeTab === 'standings'   && <StandingsTab />}
        {activeTab === 'tournaments' && <TournamentsTab />}
        {activeTab === 'profile'     && <ProfileTab />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a2744] border-t border-[#2a3a5e] flex items-center justify-around px-2 pb-safe h-16 z-20">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-0 flex-1 ${
                active ? 'text-[#e8799a]' : 'text-blue-200/60 hover:text-blue-100'
              }`}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}