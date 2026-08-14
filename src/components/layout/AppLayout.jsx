import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomTabNav from '@/components/layout/BottomTabNav';
import DiscoverSheet from '@/components/discover/DiscoverSheet';
import { useDiscoverReopen } from '@/lib/discover-navigation';
import { isNotificationCenterPath } from '@/lib/notifications-center';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import { cn } from '@/lib/utils';

// Tournament registration landing page handles its own full-screen layout
const FULL_SCREEN_PATHS = ['/app/tournament-register/'];

// Pages whose top header extends into the status bar and manage their own inset
const SELF_MANAGED_SAFE_TOP_PREFIXES = ['/app/leagues', '/app/courses', '/app/tournament-home', '/app/stats'];

// Same treatment on native only (web keeps standard app-layout-insets)
const NATIVE_SELF_MANAGED_SAFE_TOP_PREFIXES = ['/app/my-tournaments', '/app/registrations', '/app/profile'];

function managesOwnSafeTop(pathname, isNative = false) {
  if (pathname === '/app') return true;
  if (FULL_SCREEN_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (SELF_MANAGED_SAFE_TOP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (isNative && NATIVE_SELF_MANAGED_SAFE_TOP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // Payment flows use a full-width header with built-in safe-area padding
  if (/\/payment(\/|$)/.test(pathname)) return true;
  return false;
}

export default function AppLayout() {
  const location = useLocation();
  const [showDiscover, setShowDiscover] = useState(false);
  useDiscoverReopen(setShowDiscover);
  const isFullScreen = FULL_SCREEN_PATHS.some(p => location.pathname.startsWith(p));
  // Home page has its own bottom nav with Discover FAB
  const isHomePage = location.pathname === '/app';
  const isNotificationCenter = isNotificationCenterPath(location.pathname);
  const showBottomTabNav = !isHomePage && !isNotificationCenter && !showDiscover;
  const isNative = isCapacitorNative();
  const applyLayoutInsets = !managesOwnSafeTop(location.pathname, isNative);

  if (isFullScreen) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {showDiscover && <DiscoverSheet onClose={() => setShowDiscover(false)} />}
      <div className={cn(
        'flex-1 min-h-0 native-app-layout-outlet',
        !isNative && 'overflow-y-auto',
        applyLayoutInsets && 'app-layout-insets',
      )}>
        <Outlet />
      </div>
      {showBottomTabNav && <BottomTabNav onDiscover={() => setShowDiscover(true)} />}
    </div>
  );
}