import React from 'react';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAVY = 'hsl(220 40% 20%)';
const GOLD = '#c9a96e';
const CREAM = 'hsl(40 33% 96%)';

const DIAMOND_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

const BADGE_W = 280;
const BADGE_H = 200;
const CORNER = 14;
const FRAME_INSET = 5;

/** Chamfered-rect path with uniform inset so inner/outer borders stay parallel. */
function octagonPath(w, h, cut, inset = 0) {
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const c = cut;
  return `M ${x0 + c},${y0} H ${x1 - c} L ${x1},${y0 + c} V ${y1 - c} L ${x1 - c},${y1} H ${x0 + c} L ${x0},${y1 - c} V ${y0 + c} Z`;
}

function UnifiedBrandBadge() {
  const octTop = 50;
  const octH = 140;
  const cx = BADGE_W / 2;
  const diamondSize = 52;
  const diamondCy = octTop + 4;

  return (
    <svg
      viewBox={`0 0 ${BADGE_W} ${BADGE_H}`}
      width="100%"
      style={{ maxWidth: 280, height: 'auto', display: 'block' }}
      role="img"
      aria-label="Morain Mahj — Legacy game for modern players"
    >
      <path
        d={octagonPath(BADGE_W, octH, CORNER, 0)}
        transform={`translate(0, ${octTop})`}
        fill={NAVY}
        stroke={GOLD}
        strokeWidth="1"
      />
      <path
        d={octagonPath(BADGE_W, octH, CORNER, FRAME_INSET)}
        transform={`translate(0, ${octTop})`}
        fill="none"
        stroke={GOLD}
        strokeWidth="0.75"
        opacity="0.65"
      />

      <g transform={`translate(${cx}, ${diamondCy}) rotate(45)`}>
        <rect
          x={-diamondSize / 2}
          y={-diamondSize / 2}
          width={diamondSize}
          height={diamondSize}
          fill={NAVY}
          stroke={GOLD}
          strokeWidth="1.25"
        />
        <rect
          x={-diamondSize / 2 + FRAME_INSET + 2}
          y={-diamondSize / 2 + FRAME_INSET + 2}
          width={diamondSize - (FRAME_INSET + 2) * 2}
          height={diamondSize - (FRAME_INSET + 2) * 2}
          fill="none"
          stroke={GOLD}
          strokeWidth="0.75"
          opacity="0.65"
        />
      </g>
      <text
        x={cx}
        y={diamondCy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="300"
        fontSize="30"
        fill={GOLD}
      >
        M
      </text>

      <text
        x={cx}
        y={octTop + 62}
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="300"
        fontSize="27"
        letterSpacing="6"
        fill={GOLD}
      >
        MORAIN
      </text>
      <text
        x={cx}
        y={octTop + 88}
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="300"
        fontSize="27"
        letterSpacing="6"
        fill={GOLD}
      >
        MAHJ
      </text>
      <text
        x={cx}
        y={octTop + 110}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="400"
        fontSize="9"
        letterSpacing="1.4"
        fill={GOLD}
      >
        LEGACY GAME FOR MODERN
      </text>
      <text
        x={cx}
        y={octTop + 124}
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="400"
        fontSize="9"
        letterSpacing="1.4"
        fill={GOLD}
      >
        PLAYERS
      </text>
    </svg>
  );
}

const btnBase =
  'flex-1 h-12 min-h-12 rounded-lg gap-2 px-4 font-medium shadow-none inline-flex items-center justify-center';

export default function NativeLandingHero({ showLoggedIn, onLogin, onSignup, onDashboard }) {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        minHeight: '90dvh',
        backgroundColor: NAVY,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: DIAMOND_PATTERN,
          backgroundSize: '60px 60px',
          backgroundRepeat: 'repeat',
          opacity: 0.05,
        }}
      />

      {/* <div className="relative z-10 flex flex-col min-h-[calc(100dvh-env(safe-area-inset-top))] px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]"> */}
     <div className="relative z-10 flex flex-col px-6 pt-8 pb-6" >
        <div className="flex flex-col items-center w-full max-w-md justify-start gap-8 mx-auto">
          <div
            className="flex flex-col items-center w-full pt-8"
            style={{ gap: 'clamp(0.875rem, 2.5vh, 1.25rem)' }}
          >
            <UnifiedBrandBadge />

            <div className="text-center w-full">
              <h1 className="font-heading mt-8 text-[2.5rem] leading-snug font-bold text-white">
                Your Game. Your Scores. Your Community.
              </h1>
              <p
                className="font-body font-light text-md leading-relaxed max-w-[19rem] mx-auto mt-6 pt-4 pb-6"
                style={{ color: GOLD, opacity: 0.9 }}
              >
                Register for tournaments, track your scores in real time, and see where you stand on the leaderboard — all in one place.
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full mb-12 max-w-sm shrink-0">
            {showLoggedIn ? (
              <Button
                size="lg"
                onClick={onDashboard}
                className={`${btnBase} font-semibold border-0`}
                style={{ backgroundColor: CREAM, color: NAVY }}
              >
                Go to My Dashboard <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={onSignup}
                  className={`${btnBase} font-semibold border-0`}
                  style={{ backgroundColor: CREAM, color: NAVY }}
                >
                  <UserPlus className="h-4 w-4 shrink-0" /> Join Free
                </Button>
                <Button
                  size="lg"
                  onClick={onLogin}
                  className={`${btnBase} border hover:opacity-90`}
                  style={{
                    backgroundColor: NAVY,
                    borderColor: GOLD,
                    color: 'white',
                  }}
                >
                  <LogIn className="h-4 w-4 shrink-0" /> Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
