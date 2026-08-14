import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, ChevronLeft, Delete, Minus } from 'lucide-react';
import DemoBottomNav from '@/components/layout/DemoBottomNav';

const WIND_COLORS = {
  East:  { badge: 'bg-red-100 text-red-700' },
  South: { badge: 'bg-green-100 text-green-700' },
  West:  { badge: 'bg-blue-100 text-blue-700' },
  North: { badge: 'bg-slate-100 text-slate-600' },
};

const PLAYERS = [
  { wind: 'East',  name: 'Sandra K.',  isMe: false },
  { wind: 'South', name: 'Ruth M.',    isMe: true  },
  { wind: 'West',  name: 'Gloria N.',  isMe: false },
  { wind: 'North', name: 'Barbara W.', isMe: false },
];

const KEYPAD_KEYS = [['7','8','9'],['4','5','6'],['1','2','3'],['-','0','⌫']];

const INITIAL_SCORES = {
  0: [+25, +30, null, null],
  1: [-10, +15, null, null],
  2: [-8,  +20, null, null],
  3: [-7,  -25, null, null],
};

function ScoreEntryPage() {
  const [activeRound, setActiveRound] = useState(2);
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [editing, setEditing] = useState(null); // { pi, si }
  const [draft, setDraft] = useState('');

  const submittedSets = [true, true, false, false];

  const totals = PLAYERS.map((_, i) =>
    (scores[i] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
  );

  const handleKey = (key) => {
    if (key === '⌫') { setDraft(d => d.slice(0, -1)); return; }
    if (key === '-') { setDraft(d => d.startsWith('-') ? d.slice(1) : '-' + d); return; }
    setDraft(d => d === '0' ? key : d + key);
  };

  const confirmScore = () => {
    if (!editing) return;
    const num = parseInt(draft, 10);
    if (isNaN(num)) { setEditing(null); return; }
    setScores(prev => {
      const arr = [...(prev[editing.pi] || [null,null,null,null])];
      arr[editing.si] = num;
      return { ...prev, [editing.pi]: arr };
    });
    setEditing(null);
    setDraft('');
  };

  const fmt = (v) => v === null ? '—' : v > 0 ? `+${v}` : String(v);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-12 pb-4">
        <button className="flex items-center gap-1 text-sm text-primary-foreground/60 mb-1">
          <ChevronLeft className="w-4 h-4" /> Tournament Home
        </button>
        <h1 className="font-heading font-bold text-xl">Score Entry</h1>
        <p className="text-xs text-primary-foreground/60 mt-0.5">Spring Invitational 2026 · Table 3</p>
      </div>

      {/* Round tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-border bg-background">
        {[1,2,3,4].map(r => (
          <button key={r} onClick={() => setActiveRound(r)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
              ${activeRound === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Round {r}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-3">
        {/* My seat banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">R</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">You are South · Table 3</p>
            <p className="text-xs text-green-600">Ruth M.</p>
          </div>
          <Badge className="bg-green-100 text-green-700 text-xs">Round {activeRound}</Badge>
        </div>

        {/* Set progress pills */}
        <div className="flex gap-2">
          {['Set 1','Set 2','Set 3','Set 4'].map((label, i) => (
            <div key={i} className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium border flex items-center justify-center gap-0.5
              ${submittedSets[i] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
              {submittedSets[i] ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {label}
            </div>
          ))}
        </div>

        {/* Score grid */}
        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex px-3 py-2 bg-muted/40 border-b border-border">
              <div className="w-24 text-xs font-semibold text-muted-foreground">Player</div>
              {['S1','S2','S3','S4'].map(l => (
                <div key={l} className="flex-1 text-center text-xs font-semibold text-muted-foreground">{l}</div>
              ))}
              <div className="w-12 text-center text-xs font-semibold text-muted-foreground">Tot</div>
            </div>
            {PLAYERS.map((player, pi) => {
              const wc = WIND_COLORS[player.wind];
              return (
                <div key={pi} className={`flex items-center px-3 py-2.5 border-b border-border last:border-0
                  ${player.isMe ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                  <div className="w-24 flex items-center gap-1 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${wc.badge}`}>
                      {player.wind.charAt(0)}
                    </span>
                    <span className={`text-xs truncate ${player.isMe ? 'font-bold' : ''}`}>{player.name}</span>
                  </div>
                  {[0,1,2,3].map(si => {
                    const val = scores[pi]?.[si];
                    const isEdit = editing?.pi === pi && editing?.si === si;
                    return (
                      <button key={si}
                        onClick={() => { setEditing({ pi, si }); setDraft(val !== null ? String(val) : ''); }}
                        className={`flex-1 text-center text-sm rounded-lg py-1 mx-0.5 font-medium transition-all
                          ${isEdit ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted'}
                          ${val === null ? 'text-muted-foreground/40' : val < 0 ? 'text-destructive' : 'text-primary'}`}>
                        {isEdit ? (draft || '…') : fmt(val)}
                      </button>
                    );
                  })}
                  <div className={`w-12 text-center text-sm font-bold
                    ${totals[pi] < 0 ? 'text-destructive' : totals[pi] > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {fmt(totals[pi])}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Inline keypad */}
        {editing ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground">Entering score for {PLAYERS[editing.pi].name} · Set {editing.si + 1}</p>
                <p className="text-2xl font-bold font-heading mt-0.5">
                  {draft === '' ? '—' : draft.startsWith('-') ? draft : (draft ? `+${draft}` : '—')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {KEYPAD_KEYS.flat().map(key => (
                <button key={key} onClick={() => handleKey(key)}
                  className={`h-12 rounded-xl text-lg font-semibold flex items-center justify-center active:scale-95 transition-transform
                    ${key === '⌫' ? 'bg-destructive/10 text-destructive'
                    : key === '-' ? 'bg-muted text-foreground'
                    : 'bg-secondary text-secondary-foreground'}`}>
                  {key === '⌫' ? <Delete className="h-4 w-4" /> : key === '-' ? <Minus className="h-4 w-4" /> : key}
                </button>
              ))}
            </div>
            <div className="px-3 pb-3 flex gap-2">
              <button onClick={() => { setEditing(null); setDraft(''); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground">
                Cancel
              </button>
              <button onClick={confirmScore}
                className="flex-2 flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            Submit Set 3 Scores
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScoreEntryDemo() {
  return (
    <div className="relative w-full min-h-screen">
      <ScoreEntryPage />
      <DemoBottomNav activeTab="Tournaments" />
    </div>
  );
}