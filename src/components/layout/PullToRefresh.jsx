import React, { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children, className }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  };

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-y-auto h-full', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex justify-center items-center z-10 transition-all"
          style={{ height: refreshing ? THRESHOLD : pullDistance }}
        >
          <RefreshCw
            className="h-5 w-5 text-muted-foreground transition-transform"
            style={{
              transform: `rotate(${progress * 360}deg)`,
              opacity: progress,
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
          />
        </div>
      )}
      <div style={{ transform: `translateY(${refreshing ? THRESHOLD : pullDistance}px)`, transition: refreshing || pullDistance === 0 ? 'transform 0.2s' : 'none' }}>
        {children}
      </div>
    </div>
  );
}