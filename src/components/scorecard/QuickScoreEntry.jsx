import React, { useState, useEffect } from 'react';
import { X, Check, Minus, Plus, ClipboardList, Lock } from 'lucide-react';
import { scoreCards as scoreCardsApi } from '@/services/resources';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// Numeric keypad with +/- toggle
function ScoreKeypad({ value, onChange }) {
  const [negative, setNegative] = useState(value < 0);
  const [digits, setDigits] = useState(Math.abs(value).toString().replace(/^0$/, ''));

  useEffect(() => {
    setNegative(value < 0);
    setDigits(value === 0 ? '' : String(Math.abs(value)));
  }, [value]);

  useEffect(() => {
    const num = parseInt(digits || '0', 10);
    onChange(negative ? -num : num);
  }, [digits, negative]);

  const handleDigit = (d) => {
    if (digits.length >= 4) return;
    if (digits === '0') setDigits(d);
    else setDigits(prev => prev + d);
  };

  const handleDelete = () => setDigits(prev => prev.slice(0, -1) || '0');
  const handleClear = () => { setDigits('0'); setNegative(false); };

  const handleQuickScore = (v) => {
    setNegative(v < 0);
    setDigits(String(Math.abs(v)));
  };

  const display = (negative ? '−' : '+') + (digits || '0');

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Display */}
      <div className={`text-5xl font-heading font-bold w-full text-center py-3 rounded-2xl border-2 ${
        negative ? 'text-destructive border-destructive/30 bg-destructive/5' : 'text-foreground border-border bg-muted/30'
      }`}>
        {display}
      </div>

      {/* +/- toggle */}
      <div className="flex gap-2 w-full">
        <button
          onClick={() => setNegative(false)}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border transition-all ${
            !negative ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
          }`}
        >
          <Plus className="w-4 h-4" /> Positive
        </button>
        <button
          onClick={() => setNegative(true)}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border transition-all ${
            negative ? 'bg-destructive text-white border-destructive' : 'bg-card border-border text-muted-foreground'
          }`}
        >
          <Minus className="w-4 h-4" /> Negative
        </button>
      </div>

      {/* Quick score buttons */}
      <div className="grid grid-cols-4 gap-2 w-full">
        {[25, 30, 50, 60, -5, -10, -15, -25].map(v => (
          <button
            key={v}
            onClick={() => handleQuickScore(v)}
            className={`py-2.5 rounded-xl text-sm font-bold border active:scale-95 transition-transform ${
              v < 0
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}
          >
            {v > 0 ? '+' : ''}{v}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="py-4 rounded-xl bg-card border border-border text-xl font-semibold active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        <button onClick={handleClear} className="py-4 rounded-xl bg-muted border border-border text-sm font-semibold active:scale-95 transition-transform text-muted-foreground">
          CLR
        </button>
        <button onClick={() => handleDigit('0')} className="py-4 rounded-xl bg-card border border-border text-xl font-semibold active:scale-95 transition-transform">
          0
        </button>
        <button onClick={handleDelete} className="py-4 rounded-xl bg-muted border border-border text-xl font-semibold active:scale-95 transition-transform text-muted-foreground">
          ⌫
        </button>
      </div>
    </div>
  );
}

export default function QuickScoreEntry({ scorecard, userId, tournamentId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Determine which player index this user is
  const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
  const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
  const playerIdx = playerIdKeys.findIndex(k => scorecard[k] === userId);
  const myScoreKey = scoreKeys[playerIdx];

  const existingScores = scorecard[myScoreKey] || [null, null, null, null];
  
  // Find first unscored hand
  const firstEmpty = existingScores.findIndex(s => s === null || s === undefined);
  const [activeHand, setActiveHand] = useState(firstEmpty >= 0 ? firstEmpty : 0);
  const [scores, setScores] = useState(existingScores.map(s => (s === null || s === undefined) ? 0 : s));
  const [saving, setSaving] = useState(false);

  // Check if scorecard is verified (locked)
  const isVerified = scorecard.status === 'verified';

  const handleScoreChange = (val) => {
    setScores(prev => { const next = [...prev]; next[activeHand] = val; return next; });
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedScores = [...scores];
    await scoreCardsApi.update(scorecard.id, { [myScoreKey]: updatedScores });
    queryClient.invalidateQueries({ queryKey: ['t-scorecards', tournamentId] });
    onSaved?.();
    onClose();
  };

  const winds = ['East', 'South', 'West', 'North'];
  const myWind = winds[playerIdx] || 'Player';
  const handLabels = ['Hand 1', 'Hand 2', 'Hand 3', 'Hand 4'];

  return (
    <div className="fixed inset-0 flex flex-col bg-background native-fullscreen-overlay" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="p-1 rounded-full hover:bg-primary-foreground/10">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-heading font-bold text-lg">{isVerified ? 'Scores Locked' : 'Enter Scores'}</h2>
          <p className="text-xs opacity-70">Round {scorecard.round_number} · Table {scorecard.table_number} · {myWind}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { onClose(); navigate(`/app/scorecard?tournamentId=${tournamentId}`); }}
            className="flex items-center gap-1.5 bg-primary-foreground/20 text-primary-foreground px-3 py-2 rounded-full font-semibold text-sm active:scale-95 transition-transform"
          >
            <ClipboardList className="w-4 h-4" />
            Scores
          </button>
          {!isVerified && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-primary-foreground text-primary px-4 py-2 rounded-full font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Hand tabs */}
      <div className={`flex border-b border-border bg-card shrink-0 ${isVerified ? 'opacity-50 pointer-events-none' : ''}`}>
        {handLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveHand(i)}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeHand === i ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            <span className="block">{label}</span>
            <span className={`text-xs font-bold font-heading ${scores[i] < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {scores[i] > 0 ? '+' : ''}{scores[i]}
            </span>
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="flex-1 overflow-y-auto p-5 native-bottom-scroll-pad">
        {isVerified ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Lock className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Scores are Verified</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              This scorecard has been verified and is now locked. Only administrators can modify verified scores.
            </p>
          </div>
        ) : (
          <>
            <ScoreKeypad value={scores[activeHand]} onChange={handleScoreChange} />

            {/* Round total preview */}
            <div className="mt-5 bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Round Total</p>
              <p className={`text-3xl font-heading font-bold ${scores.reduce((a, b) => a + b, 0) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {scores.reduce((a, b) => a + b, 0) > 0 ? '+' : ''}{scores.reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}