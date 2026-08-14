import React, { useState } from 'react';
import { AlertCircle, Calendar, MapPin, ChevronRight, X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEMO = {
  id: 'demo-hardcoded',
  name: 'Welcome to Morain Mahj — Demo Tournament',
  status: 'pending',
  date: '2026-08-15',
  location: 'Morain Community Center, Keller TX',
  rounds: 4,
  type: 'Traditional',
  isDemo: true,
};

export default function DemoTournamentCard({ onComplete }) {
  const [showModal, setShowModal] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = () => {
    setRegistered(true);
    setTimeout(() => {
      setShowModal(false);
      onComplete?.();
    }, 2000);
  };

  return (
    <>
      {/* Card — matches real "pending/invited" card styling from Home.jsx */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowModal(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowModal(true); } }}
        className="w-full text-left bg-card border border-amber-200 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        <div className="w-1 self-stretch rounded-full bg-amber-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />Invited
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Demo
            </span>
          </div>
          <p className="font-semibold text-foreground text-base leading-tight truncate">{DEMO.name}</p>
          <div className="flex flex-wrap gap-3 mt-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />Aug 15, 2026
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />{DEMO.location}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-5 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">Demo Tournament</span>
              </div>
              <h2 className="font-heading font-bold text-xl leading-tight pr-8">{DEMO.name}</h2>
            </div>

            {/* Details */}
            <div className="p-5 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>August 15, 2026</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{DEMO.location}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground border-t border-border pt-4">
                This is a demo tournament to help you explore the Morain Mahj app. Register below to see what a real tournament experience looks like!
              </p>

              {registered ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
                  <Trophy className="w-5 h-5 shrink-0" />
                  <span className="font-semibold text-sm">You have registered for the demo!</span>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleRegister}
                >
                  Register for Demo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}