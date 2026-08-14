import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Send, Clock, CheckCircle2, RotateCcw, Home } from 'lucide-react';
import SpecialHandBanner from '@/components/tournament/SpecialHandBanner';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East:  'bg-red-100 text-red-700 border-red-200',
  South: 'bg-blue-100 text-blue-700 border-blue-200',
  West:  'bg-green-100 text-green-700 border-green-200',
  North: 'bg-amber-100 text-amber-700 border-amber-200',
};
const WIND_BG = {
  East:  'text-red-700',
  South: 'text-blue-700',
  West:  'text-green-700',
  North: 'text-amber-700',
};

const PLAYERS = [
  { name: 'Robert K.',   wind: 'North', isYou: false },
  { name: 'Margaret H.', wind: 'East',  isYou: true },
  { name: 'Susan T.',    wind: 'West',  isYou: false },
  { name: 'David C.',    wind: 'South', isYou: false },
];

// Numeric keypad component
function Keypad({ label, value, onChange, onClose }) {
  const [display, setDisplay] = useState(value === 0 ? '' : String(value));
  const [negative, setNegative] = useState(value < 0);

  const realValue = () => {
    const n = parseInt(display || '0', 10);
    return negative ? -Math.abs(n) : n;
  };

  const press = (d) => {
    if (display.length >= 5) return;
    setDisplay(prev => (prev === '0' ? d : prev + d));
  };

  const del = () => setDisplay(prev => prev.slice(0, -1));
  const clear = () => { setDisplay(''); setNegative(false); };
  const toggleSign = () => setNegative(n => !n);
  const confirm = () => { onChange(realValue()); onClose(); };

  const shown = display === '' ? '0' : (negative ? '-' : '') + display;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card rounded-t-3xl shadow-2xl pb-6 pt-4 px-4" onClick={e => e.stopPropagation()}>
        <p className="text-center text-xs text-muted-foreground mb-1">{label}</p>
        <div className="text-center text-4xl font-bold font-heading mb-4 h-12 flex items-center justify-center">
          {shown}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => press(d)}
              className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:scale-95 transition-all hover:bg-secondary/80">
              {d}
            </button>
          ))}
          <button onClick={toggleSign} className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:scale-95 transition-all hover:bg-secondary/80">
            ±
          </button>
          <button onClick={() => press('0')} className="h-14 rounded-xl bg-secondary text-foreground text-xl font-semibold active:scale-95 transition-all hover:bg-secondary/80">
            0
          </button>
          <button onClick={del} className="h-14 rounded-xl bg-secondary text-muted-foreground text-xl active:scale-95 transition-all hover:bg-secondary/80">
            ⌫
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={clear} className="flex-1 h-12 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted active:scale-95 transition-all">
            Clear
          </button>
          <button onClick={confirm} className="flex-2 flex-grow-[2] h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const INITIAL_SCORES = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];
const INITIAL_SUBMITTED = [null, null, null, null];
const INITIAL_VERIFIED  = [null, null, null, null];

const DEMO_SPECIAL_HAND = {
  name: 'Special Hand',
  description: 'FFF 55 666 7777 DD',
  point_value: 30,
  active: true,
  tiles: [
    { position: 1, identifier: 'F', color: '#2C3E50' },
    { position: 2, identifier: 'F', color: '#2C3E50' },
    { position: 3, identifier: 'F', color: '#2C3E50' },
    { position: 4, identifier: '5', color: '#E8E8E8' },
    { position: 5, identifier: '5', color: '#E8E8E8' },
    { position: 6, identifier: '6', color: '#FF6B6B' },
    { position: 7, identifier: '6', color: '#FF6B6B' },
    { position: 8, identifier: '6', color: '#FF6B6B' },
    { position: 9, identifier: '7', color: '#51CF66' },
    { position: 10, identifier: '7', color: '#51CF66' },
    { position: 11, identifier: '7', color: '#51CF66' },
    { position: 12, identifier: '7', color: '#51CF66' },
    { position: 13, identifier: 'D', color: '#2C3E50' },
    { position: 14, identifier: 'D', color: '#2C3E50' },
  ],
};

export default function ScorecardDemo() {
  const [scores, setScores] = useState(INITIAL_SCORES.map(r => [...r]));
  const [setSubmittedAt, setSetSubmittedAt] = useState([...INITIAL_SUBMITTED]);
  const [setVerifiedAt, setSetVerifiedAt]   = useState([...INITIAL_VERIFIED]);
  const [roundStatus, setRoundStatus] = useState('pending'); // pending | submitted | verified
  const [viewAsEast, setViewAsEast] = useState(true); // toggle between East and non-East view
  const [myPlayerIdx, setMyPlayerIdx] = useState(1); // which non-East player we're viewing as
  const [activeSetModal, setActiveSetModal] = useState(null); // null or setIdx (0-3) when editing
  const [activeCell, setActiveCell] = useState(null); // { pIdx } within modal

  const isEast = viewAsEast;

  const isLocked = roundStatus === 'verified';

  const getTotal = (pIdx) => scores[pIdx].reduce((s, v) => s + v, 0);

  const setHasAllScores = (setIdx) => PLAYERS.every((_, pIdx) => scores[pIdx][setIdx] !== 0);

  const handleCellChange = (pIdx, setIdx, val) => {
    setScores(prev => {
      const next = prev.map(r => [...r]);
      next[pIdx][setIdx] = val;
      return next;
    });
  };

  const handleSubmitSet = (setIdx) => {
    const next = [...setSubmittedAt];
    next[setIdx] = new Date().toLocaleTimeString();
    setSetSubmittedAt(next);
    if (roundStatus === 'pending') setRoundStatus('submitted');
  };

  const handleVerifySet = (setIdx) => {
    const next = [...setVerifiedAt];
    next[setIdx] = new Date().toLocaleTimeString();
    setSetVerifiedAt(next);
    // If all sets verified → finalize
    if (next.every(ts => !!ts)) {
      setRoundStatus('verified');
    }
  };

  const handleFinalVerify = () => {
    const now = new Date().toLocaleTimeString();
    setSetVerifiedAt(prev => prev.map(ts => ts || now));
    setRoundStatus('verified');
  };

  const handleReset = () => {
    setScores(INITIAL_SCORES.map(r => [...r]));
    setSetSubmittedAt([...INITIAL_SUBMITTED]);
    setSetVerifiedAt([...INITIAL_VERIFIED]);
    setRoundStatus('pending');
    setActiveCell(null);
  };

  const allSetsSubmitted = setSubmittedAt.every(ts => !!ts);
  const allSetsVerified  = setVerifiedAt.every(ts => !!ts);

  // Helper: open modal to edit a specific set
  const openSetModal = (setIdx) => {
    setActiveSetModal(setIdx);
    setActiveCell(null);
  };

  // Helper: close modal and reset cell selection
  const closeSetModal = () => {
    setActiveSetModal(null);
    setActiveCell(null);
  };

  const statusConfig = {
    pending:   { label: 'Pending',              icon: Clock,       cls: 'bg-slate-100 text-slate-500' },
    submitted: { label: 'Awaiting Verification', icon: Send,        cls: 'bg-amber-100 text-amber-700' },
    verified:  { label: 'Verified',              icon: ShieldCheck, cls: 'bg-green-100 text-green-700' },
  };
  const st = statusConfig[roundStatus];

  const overallTotal = PLAYERS.reduce((sum, _, pIdx) => sum + getTotal(pIdx), 0);

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: '#0f1b35' }}>
      <div className="max-w-lg mx-auto text-white">

        {/* Demo banner with nav */}
        <div className="rounded-xl px-4 py-2.5 mb-5 flex items-center justify-between border" style={{ background: '#1a2744', borderColor: '#2a3a5e' }}>
          <div>
            <p className="text-xs font-bold text-blue-300 uppercase tracking-wide">Interactive Mockup</p>
            <p className="text-xs text-blue-200/70">You are playing as <strong>{isEast ? 'East (Verification)' : PLAYERS[myPlayerIdx].name}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/demo/tournament-overview" className="flex items-center gap-1 text-xs text-blue-200/60 hover:text-blue-100 border rounded-lg px-2 py-1.5 transition-colors" style={{ borderColor: '#2a3a5e' }}>
              <Home className="h-3 w-3" /> Tournament
            </a>
            <select 
              value={viewAsEast ? 'east' : myPlayerIdx} 
              onChange={(e) => {
                if (e.target.value === 'east') setViewAsEast(true);
                else { setViewAsEast(false); setMyPlayerIdx(Number(e.target.value)); }
              }}
              className="text-xs bg-white/10 text-blue-100 border border-white/20 rounded-lg px-2 py-1 cursor-pointer"
            >
              <option value="east">View as East</option>
              <option value="1">View as {PLAYERS[1].name} (South)</option>
              <option value="2">View as {PLAYERS[2].name} (West)</option>
              <option value="3">View as {PLAYERS[3].name} (North)</option>
            </select>
            <button onClick={handleReset} className="flex items-center gap-1 text-xs text-blue-200/60 hover:text-blue-100 border rounded-lg px-2.5 py-1.5 transition-colors" style={{ borderColor: '#2a3a5e' }}>
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-white">Table 3</h2>
            <p className="text-sm text-blue-200/70">Round 2 · Spring Invitational 2026</p>
          </div>
          <Badge className={st.cls}>
            <st.icon className="h-3 w-3 mr-1" />
            {st.label}
          </Badge>
        </div>

        {/* Special Hand Banner */}
        <div className="mb-4">
          <SpecialHandBanner specialHand={DEMO_SPECIAL_HAND} />
        </div>

        {/* Player role banner */}
        {isEast ? (
          <div className={`mb-4 px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${WIND_COLORS.East}`}>
            <span className="text-lg font-bold w-6 text-center">E</span>
            <span>You are seated <strong>East</strong>
              <span className="font-normal text-xs ml-1 opacity-75"> — verify each set then confirm all at end</span>
            </span>
          </div>
        ) : (
          <div className={`mb-4 px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${WIND_COLORS[PLAYERS[myPlayerIdx].wind]}`}>
            <span className="text-lg font-bold w-6 text-center">{PLAYERS[myPlayerIdx].wind[0]}</span>
            <span>You are seated <strong>{PLAYERS[myPlayerIdx].wind}</strong>
              <span className="font-normal text-xs ml-1 opacity-75"> — enter your own score, then wait for East to verify</span>
            </span>
          </div>
        )}

        {/* Score totals strip */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {PLAYERS.map((p, pIdx) => {
            const total = getTotal(pIdx);
            return (
              <div key={pIdx} className={`rounded-xl border px-2 py-2 flex flex-col items-center bg-white ${p.isYou ? 'border-[#d4547a]/40' : 'border-slate-200'}`}>
                <span className={`text-[10px] font-bold ${WIND_BG[p.wind]}`}>{p.wind[0]}</span>
                <span className={`text-lg font-bold font-heading leading-tight ${total < 0 ? 'text-red-500' : total > 0 ? 'text-[#1a2744]' : 'text-slate-300'}`}>
                  {total > 0 ? '+' : ''}{total}
                </span>
                <span className="text-[9px] text-slate-500 truncate w-full text-center">{p.name.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>

        {/* Set-by-set card list */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map(setIdx => {
            const isSetSubmitted = !!setSubmittedAt[setIdx];
            const isSetVerified  = !!setVerifiedAt[setIdx];
            const canSubmitSet   = !isSetSubmitted && !isLocked && setHasAllScores(setIdx);
            const canVerifySet   = isEast && isSetSubmitted && !isSetVerified && !isLocked;

            return (
              <button
                key={setIdx}
                onClick={() => !isLocked && openSetModal(setIdx)}
                disabled={isLocked}
                className={`w-full rounded-xl border-2 p-3 transition-all bg-white text-left ${
                  isSetVerified  ? 'border-green-400' :
                  isSetSubmitted ? 'border-amber-400' :
                  'border-slate-200'
                } ${!isLocked ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}`}
              >
                {/* Set header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1a2744]">Set {setIdx + 1}</span>
                  {isSetVerified ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : isSetSubmitted ? (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      <Send className="h-3 w-3 mr-1" /> Submitted
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-400 text-xs">
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Final East verify button */}
        {isEast && allSetsSubmitted && !isLocked && (
          <div className="mt-5">
            <Button className="w-full h-12 gap-2 text-base bg-green-600 hover:bg-green-700 text-white" onClick={handleFinalVerify}>
              <ShieldCheck className="h-5 w-5" />
              {allSetsVerified ? 'Confirm Final Verification' : 'Verify All & Finalize Round'}
            </Button>
          </div>
        )}

        {/* Non-East waiting message */}
        {!isEast && allSetsSubmitted && !isLocked && (
          <div className="flex items-center justify-center gap-2 text-amber-700 text-sm font-medium py-3.5 bg-amber-50 rounded-xl border border-amber-200 mt-5">
            <Clock className="h-5 w-5" /> Waiting for East to verify all sets...
          </div>
        )}

        {isLocked && (
          <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium py-3.5 bg-green-50 rounded-xl border border-green-200 mt-5">
            <CheckCircle2 className="h-5 w-5" /> All scores verified — round complete!
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl px-4 py-4">
          <p className="text-xs font-semibold text-[#1a2744] mb-2">{isEast ? 'East workflow' : 'Non-East workflow'}</p>
          {isEast ? (
            <ol className="text-xs text-slate-600 space-y-1 list-decimal ml-4">
              <li>Enter all 4 players' scores for a set (cells are all editable)</li>
              <li>Once all have values, tap <strong>Submit Set</strong></li>
              <li>After submission, tap <strong>Verify Set</strong> to confirm the set</li>
              <li>After all sets are submitted & verified, tap <strong>Verify All & Finalize</strong></li>
            </ol>
          ) : (
            <ol className="text-xs text-slate-600 space-y-1 list-decimal ml-4">
              <li>Tap <strong>only your own score cell</strong> ({PLAYERS[myPlayerIdx].wind}) to enter</li>
              <li>Once all 4 players enter their scores, the set is submitted automatically</li>
              <li>Wait for East to verify the set (you see "Awaiting East")</li>
              <li>When East finalizes, round is complete and all cells lock</li>
            </ol>
          )}
        </div>

      </div>

      {/* Set input modal */}
      {activeSetModal !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={closeSetModal}>
          <div className="w-full max-w-sm bg-card rounded-t-3xl shadow-2xl pb-6 pt-4 px-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-heading text-foreground">Set {activeSetModal + 1}</h3>
              <button onClick={closeSetModal} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>

            {/* Score cells for each player */}
            <div className="space-y-3 mb-6">
              {PLAYERS.map((p, pIdx) => {
                const val = scores[pIdx][activeSetModal];
                const hasValue = val !== 0;
                const isMyCell = !isEast && pIdx === myPlayerIdx;
                const canEditCell = isEast || isMyCell;
                const isActive = activeCell?.pIdx === pIdx;

                return (
                  <button
                    key={pIdx}
                    disabled={!canEditCell}
                    onClick={() => canEditCell && setActiveCell({ pIdx })}
                    className={`w-full flex items-center justify-between rounded-xl border-2 p-3 transition-all bg-white
                      ${isActive   ? 'border-[#e8799a] bg-[#fdf0f4]' :
                        hasValue   ? 'border-[#d4547a]/60' :
                        'border-slate-200 bg-slate-50'}
                      ${!canEditCell ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#d4547a]/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-sm ${WIND_BG[p.wind]}`}>
                        {p.wind[0]}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-[#1a2744]">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.wind}</p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold font-heading ${val < 0 ? 'text-red-500' : hasValue ? 'text-[#1a2744]' : 'text-slate-300'}`}>
                      {hasValue ? ((val > 0 ? '+' : '') + val) : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={closeSetModal} className="flex-1 h-12 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                Done
              </button>
              {!isEast && (
                <Button 
                  className="flex-1 h-12 gap-2 text-sm bg-primary hover:bg-primary/90" 
                  disabled={scores[myPlayerIdx][activeSetModal] === 0}
                  onClick={() => { handleSubmitSet(activeSetModal); closeSetModal(); }}
                >
                  <Send className="h-4 w-4" /> Submit
                </Button>
              )}
              {isEast && setHasAllScores(activeSetModal) && !setSubmittedAt[activeSetModal] && (
                <Button className="flex-1 h-12 gap-2 text-sm bg-primary hover:bg-primary/90" onClick={() => { handleSubmitSet(activeSetModal); closeSetModal(); }}>
                  <Send className="h-4 w-4" /> Submit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keypad overlay */}
      {activeSetModal !== null && activeCell && (
        <Keypad
          label={`${PLAYERS[activeCell.pIdx].name} — Set ${activeSetModal + 1}`}
          value={scores[activeCell.pIdx][activeSetModal]}
          onChange={(val) => handleCellChange(activeCell.pIdx, activeSetModal, val)}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}