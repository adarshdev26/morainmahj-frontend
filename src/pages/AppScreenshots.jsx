import React, { Suspense, lazy, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import BackButton from '@/components/shared/BackButton';
import { Download, ImageDown, Loader2 } from 'lucide-react';

const ScorecardDemo      = lazy(() => import('@/pages/ScorecardDemo'));
const HomeDashboardDemo  = lazy(() => import('@/pages/demo/HomeDashboardDemo'));
const TournamentHomeDemo = lazy(() => import('@/pages/demo/TournamentHomeDemo'));
const MyLeaguesDemo      = lazy(() => import('@/pages/demo/MyLeaguesDemo'));
const LeaderboardDemo    = lazy(() => import('@/pages/demo/LeaderboardDemo'));
const ScoreEntryDemo     = lazy(() => import('@/pages/demo/ScoreEntryDemo'));

const SCREENS = [
  { id: 1, title: 'Home Dashboard',   description: 'Your tournaments, live events & navigation',       component: HomeDashboardDemo  },
  { id: 2, title: 'Tournament Home',  description: 'Check-in, seating, room map & raffle',             component: TournamentHomeDemo },
  { id: 3, title: 'Score Entry',      description: 'Round-by-round scoring with East verification',    component: ScoreEntryDemo     },
  { id: 4, title: 'My Leagues',       description: 'League sessions, RSVP & leaderboard',              component: MyLeaguesDemo      },
  { id: 5, title: 'Leaderboard',      description: 'Live tournament standings & rankings',              component: LeaderboardDemo    },
  { id: 6, title: 'Scorecard Detail', description: 'Full scorecard with set scores & verification',    component: ScorecardDemo      },
];

// Phone dimensions — iPhone 6.5" (414×896 logical → 1242×2688px @ 3x for App Store)
const PHONE_W = 414;
const PHONE_H = 896;

async function captureNode(node, filename) {
  const canvas = await html2canvas(node, {
    width: PHONE_W,
    height: PHONE_H,
    scale: 3,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// A full-res hidden render target used for capture
function HiddenScreen({ component: Component, refEl }) {
  return (
    <div
      ref={refEl}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: PHONE_W,
        height: PHONE_H,
        overflow: 'hidden',
        zIndex: -1,
        background: 'transparent',
      }}
    >
      <Suspense fallback={<div style={{ width: PHONE_W, height: PHONE_H, background: 'transparent' }} />}>
        <Component />
      </Suspense>
    </div>
  );
}

// Scaled preview shell
function PhoneShell({ children }) {
  const DISPLAY_W = 260;
  const scale = DISPLAY_W / PHONE_W;
  const DISPLAY_H = PHONE_H * scale;
  return (
    <div className="relative mx-auto" style={{ width: DISPLAY_W }}>
      <div className="bg-black rounded-[36px] p-[10px] shadow-2xl ring-1 ring-white/10">
        <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-20" />
        <div className="relative rounded-[28px] overflow-hidden bg-white" style={{ height: DISPLAY_H }}>
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` }}
          >
            <Suspense fallback={<div className="w-full h-full bg-slate-100 animate-pulse" />}>
              {children}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppScreenshots() {
  const refs = useRef(SCREENS.map(() => React.createRef()));
  const [downloading, setDownloading] = useState(null); // id or 'all'

  const slug = (title) => title.toLowerCase().replace(/\s+/g, '-');

  const downloadOne = async (screen, idx) => {
    setDownloading(screen.id);
    await new Promise(r => setTimeout(r, 300)); // let suspense settle
    await captureNode(refs.current[idx].current, `${slug(screen.title)}.png`);
    setDownloading(null);
  };

  const downloadAll = async () => {
    setDownloading('all');
    await new Promise(r => setTimeout(r, 300));
    for (let i = 0; i < SCREENS.length; i++) {
      await captureNode(refs.current[i].current, `${slug(SCREENS[i].title)}.png`);
    }
    setDownloading(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden full-res render targets for capture */}
      {SCREENS.map((screen, i) => (
        <HiddenScreen key={screen.id} component={screen.component} refEl={refs.current[i]} />
      ))}

      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="font-heading font-bold text-2xl">App Preview</h1>
          </div>
          <button
            onClick={downloadAll}
            disabled={downloading !== null}
            className="flex items-center gap-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {downloading === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
            Download All
          </button>
        </div>
        <p className="text-primary-foreground/70 text-sm ml-12">Live screenshots — exactly what players see</p>
      </div>

      <div className="px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-14 max-w-5xl mx-auto">
          {SCREENS.map((screen, i) => {
            const { id, title, description, component: Component } = screen;
            const isCapturing = downloading === id;
            return (
              <div key={id} className="flex flex-col items-center gap-4">
                <PhoneShell>
                  <Component />
                </PhoneShell>
                <div className="text-center w-full">
                  <h3 className="font-semibold text-foreground text-base">{title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-3">{description}</p>
                  <button
                    onClick={() => downloadOne(screen, i)}
                    disabled={downloading !== null}
                    className="inline-flex items-center gap-2 border border-border text-foreground text-xs font-medium px-4 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {isCapturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {isCapturing ? 'Capturing…' : 'Download PNG'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}