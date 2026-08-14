import React, { lazy, Suspense, useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Preferences } from '@capacitor/preferences';
import { setToken } from '@/services/authApi';
import { initOneSignal } from '@/lib/onesignal';
import {
  isCapacitorNative,
  consumePendingPostLoginPath,
  processNativeShellOAuthParams,
  recoverOAuthIfReturnedToHostedApp,
} from '@/lib/capacitor-utils';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeProvider';
import {
  getPostAuthDefaultPath,
  getPendingNotificationHighlightId,
  handleNotificationOpen,
  hasPendingNotificationOpen,
  isNotificationCenterPath,
  isNotificationLaunchUrl,
  notificationCenterPath,
} from '@/lib/notifications-center';
import { setDiscoverReturn } from '@/lib/discover-navigation';
import NotificationRouter from '@/components/notifications/NotificationRouter';
import PushSubscriptionSync from '@/components/notifications/PushSubscriptionSync';

// ── Non-lazy (always needed immediately) ──────────────────────────────────────
import PageNotFound from './lib/PageNotFound';
import { isAuthenticated as hasBackendToken } from '@/services/authToken';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import NativeSplash from '@/components/layout/NativeSplash';
import AppLayout from '@/components/layout/AppLayout.jsx';
import AdminLayout from '@/components/layout/AdminLayout';

// ── Lazy page imports ─────────────────────────────────────────────────────────
// Public / auth-free
const Landing            = lazy(() => import('@/pages/Landing.jsx'));
const TournamentLanding  = lazy(() => import('@/pages/TournamentLanding'));
const TournamentWebsite  = lazy(() => import('@/pages/TournamentWebsite.jsx'));
const TournamentPublicRouter = lazy(() => import('@/pages/TournamentPublicRouter.jsx'));
const CourseWebsite      = lazy(() => import('@/pages/CourseWebsite.jsx'));
const PlayerSignup       = lazy(() => import('@/pages/PlayerSignup'));
const LeagueRSVP         = lazy(() => import('@/pages/LeagueRSVP'));
const CourseRegister     = lazy(() => import('@/pages/CourseRegister'));
const LeagueJoin         = lazy(() => import('@/pages/LeagueJoin'));
const LeagueWebsite      = lazy(() => import('@/pages/LeagueWebsite.jsx'));
const PublicLeagueLeaderboard = lazy(() => import('@/pages/PublicLeagueLeaderboard.jsx'));
const LeagueTimerDisplay = lazy(() => import('@/pages/LeagueTimerDisplay'));
const RoomMapFullscreen  = lazy(() => import('@/pages/RoomMapFullscreen'));
const Pricing            = lazy(() => import('@/pages/Pricing'));
const PrivacyPolicy      = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService     = lazy(() => import('@/pages/TermsOfService'));
const Support            = lazy(() => import('@/pages/Support'));
const BusinessPlan       = lazy(() => import('@/pages/BusinessPlan'));
const CheckIn            = lazy(() => import('@/pages/CheckIn'));
const ScorecardDemo      = lazy(() => import('@/pages/ScorecardDemo'));
const PlayerDemo         = lazy(() => import('@/pages/PlayerDemo'));
const TournamentOverviewDemo = lazy(() => import('@/pages/TournamentOverviewDemo'));
const TimerDisplay       = lazy(() => import('@/pages/TimerDisplay'));
const PublicLeaderboard  = lazy(() => import('@/pages/PublicLeaderboard'));
const RaffleDisplay      = lazy(() => import('@/pages/RaffleDisplay.jsx'));
const TRaffleDisplay     = lazy(() => import('@/pages/TRaffleDisplay.jsx'));
const SilentAuctionDisplay = lazy(() => import('@/pages/SilentAuctionDisplay.jsx'));
const MobileAuthReturn     = lazy(() => import('@/pages/MobileAuthReturn.jsx'));
const MobilePaymentReturn  = lazy(() => import('@/pages/MobilePaymentReturn.jsx'));
const NativeLogin          = lazy(() => import('@/pages/NativeLogin.jsx'));

// morainmahj-backend auth flow (email/password + JWT)
const Login              = lazy(() => import('@/pages/Login.jsx'));

// App (authenticated player) routes
const Home               = lazy(() => import('@/pages/Home.jsx'));
const MyScorecard        = lazy(() => import('@/pages/MyScorecard'));
const TournamentOverview = lazy(() => import('@/pages/TournamentOverview'));
const TournamentHome     = lazy(() => import('@/pages/TournamentHome'));
const Dashboard          = lazy(() => import('@/pages/Dashboard'));
const RoundAssignments   = lazy(() => import('@/pages/RoundAssignments'));
const Players            = lazy(() => import('@/pages/Players'));
const Tables             = lazy(() => import('@/pages/Tables'));
const ScoreEntry         = lazy(() => import('@/pages/ScoreEntry'));
const Leaderboard        = lazy(() => import('@/pages/Leaderboard'));
const Profile            = lazy(() => import('@/pages/Profile'));
const MyTournaments      = lazy(() => import('@/pages/MyTournaments'));
const MyInvites          = lazy(() => import('@/pages/MyInvites'));
const MyLeagues          = lazy(() => import('@/pages/MyLeagues'));
const LeaguePaymentProcessing = lazy(() => import('@/pages/LeaguePaymentProcessing'));
const MyCourses          = lazy(() => import('@/pages/MyCourses'));
const CourseDetail       = lazy(() => import('@/pages/CourseDetail'));
const CoursePaymentProcessing = lazy(() => import('@/pages/CoursePaymentProcessing'));
const TournamentPaymentProcessing = lazy(() => import('@/pages/TournamentPaymentProcessing'));
const CoursePaymentSuccess = lazy(() => import('@/pages/CoursePaymentSuccess'));
const CoursePaymentReturn = lazy(() => import('@/pages/CoursePaymentReturn'));
const Tournaments        = lazy(() => import('@/pages/Tournaments'));
const PlayerProfile      = lazy(() => import('@/pages/PlayerProfile'));
const PlayerStats        = lazy(() => import('@/pages/PlayerStats'));
const Notifications      = lazy(() => import('@/pages/Notifications'));
const HandLog            = lazy(() => import('@/pages/HandLog'));

// Admin routes
const AdminDashboard          = lazy(() => import('@/pages/admin/AdminDashboard'));
const BrandGuide              = lazy(() => import('@/pages/BrandGuide'));
const AdminTournaments        = lazy(() => import('@/pages/admin/AdminTournaments'));
const TournamentSetup         = lazy(() => import('@/pages/admin/TournamentSetup'));
const TournamentDetail        = lazy(() => import('@/pages/admin/TournamentDetail'));
const AdminPlayers            = lazy(() => import('@/pages/admin/AdminPlayers'));
const AdminTables             = lazy(() => import('@/pages/admin/AdminTables'));
const AdminScores             = lazy(() => import('@/pages/admin/AdminScores'));
const AdminUsers              = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminRegistrations      = lazy(() => import('@/pages/admin/AdminRegistrations'));
const DirectorControl         = lazy(() => import('@/pages/admin/DirectorControl'));
const AdminEmails             = lazy(() => import('@/pages/admin/AdminEmails'));
const TournamentCommunications = lazy(() => import('@/pages/admin/TournamentCommunications'));
const AdminLeaderboard        = lazy(() => import('@/pages/admin/AdminLeaderboard'));
const AnalyticsDashboard      = lazy(() => import('@/pages/admin/AnalyticsDashboard'));
const TournamentAnalytics     = lazy(() => import('@/pages/admin/TournamentAnalytics'));
const PlayerPerformance       = lazy(() => import('@/pages/admin/PlayerPerformance'));
const TournamentRegistrations = lazy(() => import('@/pages/admin/TournamentRegistrations'));
const TournamentSetsPage      = lazy(() => import('@/pages/admin/TournamentSetsPage'));
const TournamentTiming        = lazy(() => import('@/pages/admin/TournamentTiming'));
const SpecialHands            = lazy(() => import('@/pages/admin/SpecialHands'));
const TournamentPrizes        = lazy(() => import('@/pages/admin/TournamentPrizes'));
const SystemOverview          = lazy(() => import('@/pages/admin/SystemOverview'));
const TournamentWorkflowChart = lazy(() => import('@/pages/admin/TournamentWorkflowChart'));
const AdminLeagues            = lazy(() => import('@/pages/admin/AdminLeagues'));
const LeagueSetup             = lazy(() => import('@/pages/admin/LeagueSetup'));
const LeagueDetail            = lazy(() => import('@/pages/admin/LeagueDetail'));
const LeagueSessionDetail     = lazy(() => import('@/pages/admin/LeagueSessionDetail'));
const InvitePlayers           = lazy(() => import('@/pages/admin/InvitePlayers'));
const AdminSubscription       = lazy(() => import('@/pages/admin/AdminSubscription'));
const OrganizationDashboard   = lazy(() => import('@/pages/admin/OrganizationDashboard'));
const BroadcastComms          = lazy(() => import('@/pages/admin/BroadcastComms'));
const AdminCourses            = lazy(() => import('@/pages/admin/AdminCourses'));
const CourseSetup             = lazy(() => import('@/pages/admin/CourseSetup'));
const AdminCourseDetail       = lazy(() => import('@/pages/admin/CourseDetail'));
const AuditLogPage            = lazy(() => import('@/pages/admin/AuditLog'));
const CardSetup               = lazy(() => import('@/pages/admin/CardSetup'));
const HandLogs                = lazy(() => import('@/pages/admin/HandLogs'));
const MatchResultsAdmin       = lazy(() => import('@/pages/admin/MatchResults'));
const TournamentSpecialHands  = lazy(() => import('@/pages/admin/TournamentSpecialHands'));
const LeagueSpecialHands      = lazy(() => import('@/pages/admin/LeagueSpecialHands'));
const CompetitorComparison    = lazy(() => import('@/pages/admin/CompetitorComparison'));
const MarketingPage           = lazy(() => import('@/pages/marketing/MarketingPage.jsx'));
const MarketingHome           = lazy(() => import('@/pages/marketing/MarketingHome.jsx'));
const MarketingContact        = lazy(() => import('@/pages/marketing/MarketingContact.jsx'));
const MarketingStartTrial     = lazy(() => import('@/pages/marketing/MarketingStartTrial.jsx'));
const AdminMarketing          = lazy(() => import('@/pages/admin/AdminMarketing.jsx'));
const Screenshots             = lazy(() => import('@/pages/Screenshots.jsx'));
const AppScreenshots          = lazy(() => import('@/pages/AppScreenshots.jsx'));
const MyLeaguesDemo           = lazy(() => import('@/pages/demo/MyLeaguesDemo.jsx'));
const LeaderboardDemo         = lazy(() => import('@/pages/demo/LeaderboardDemo.jsx'));
const ScoreEntryDemo          = lazy(() => import('@/pages/demo/ScoreEntryDemo.jsx'));

// ── Shared page-level loading fallback ───────────────────────────────────────
function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="fixed inset-0 flex items-center justify-center bg-background"
    >
      <div
        aria-hidden="true"
        className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// ── Main authenticated app shell ─────────────────────────────────────────────
const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, user } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const location = useLocation();

  // Show branded splash on first load — skip for admin, demo, timer, checkin, notification center
  const skipSplashPaths = ['/admin', '/demo', '/timer-display', '/checkin', '/screenshots', '/app-screenshots', '/app/notifications', '/public/leaderboard', '/login', '/dashboard'];
  const isMobileAppPath = !skipSplashPaths.some(p => window.location.pathname.startsWith(p));
  const onNotificationCenter = isNotificationCenterPath(location.pathname);

  // Send "/" to the morainmahj-backend login flow, then into the app itself.
  // Native keeps its own launch path (splash → native login). Disable with
  // VITE_AUTH_ROOT_REDIRECT=false to serve the marketing landing page on web.
  if (
    import.meta.env.VITE_AUTH_ROOT_REDIRECT !== 'false' &&
    !isCapacitorNative() &&
    (location.pathname === '/' || location.pathname === '')
  ) {
    return <Navigate to={hasBackendToken() ? '/app' : '/login'} replace />;
  }

  // On native: show splash immediately at launch so it overlaps the auth network check.
  if (isCapacitorNative() && !splashDone && isMobileAppPath) {
    return <NativeSplash onDone={() => setSplashDone(true)} />;
  }

  // On all platforms: if user is authenticated at root, redirect to /app.
  // Prevents the landing page from showing to logged-in users on both web and native.
  const isAtRoot = location.pathname === '/' || location.pathname === '';
  if (isAtRoot) {
    if (hasPendingNotificationOpen()) {
      return <Navigate to={notificationCenterPath(getPendingNotificationHighlightId())} replace />;
    }
    if (isLoadingAuth || isLoadingPublicSettings) return <PageLoader />;
    if (isAuthenticated) return <Navigate to={getPostAuthDefaultPath()} replace />;
    // Not authenticated → fall through to show landing (Sign In / Sign Up).
  }

  if (!splashDone && isMobileAppPath) {
    return <NativeSplash onDone={() => setSplashDone(true)} />;
  }

  // For public paths, don't block render while auth loads
  const isProtectedPath =
    (window.location.pathname.startsWith('/app') &&
      !window.location.pathname.startsWith('/app-screenshots') &&
      !onNotificationCenter) ||
    window.location.pathname.startsWith('/admin');

  if ((isLoadingPublicSettings || isLoadingAuth) && isProtectedPath && !onNotificationCenter) {
    return <PageLoader />;
  }

  // Allow public/demo routes even without auth
  const isPublicPath = ['/demo/', '/timer-display/', '/app-screenshots', '/public/leaderboard/'].some(p =>
    window.location.pathname.startsWith(p)
  );
  if (isPublicPath) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/demo/scorecard" element={<ScorecardDemo />} />
          <Route path="/demo/player" element={<PlayerDemo />} />
          <Route path="/demo/tournament-overview" element={<TournamentOverviewDemo />} />
          <Route path="/demo/leagues" element={<MyLeaguesDemo />} />
          <Route path="/demo/leaderboard" element={<LeaderboardDemo />} />
          <Route path="/demo/score-entry" element={<ScoreEntryDemo />} />
          <Route path="/timer-display/:tournamentId" element={<TimerDisplay />} />
          <Route path="/public/leaderboard/:tournamentId" element={<PublicLeaderboard />} />
          <Route path="/app-screenshots" element={<AppScreenshots />} />
          <Route path="/support" element={<Support />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required' && isProtectedPath && !onNotificationCenter) {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public routes ───────────────────────────────────────────────── */}
        <Route path="/" element={<Landing />} />

        {/* ── morainmahj-backend auth flow ─────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/tournament/:id" element={<TournamentPublicRouter />} />
        <Route path="/course/:slug" element={<CourseWebsite />} />
        <Route path="/player-signup" element={<PlayerSignup />} />
        <Route path="/league-rsvp" element={<LeagueRSVP />} />
        <Route path="/course-register" element={<CourseRegister />} />
        <Route path="/league-join" element={<LeagueJoin />} />
        <Route path="/league/:slug" element={<LeagueWebsite />} />
        <Route path="/league/:slug/leaderboard" element={<PublicLeagueLeaderboard />} />
        <Route path="/league-timer-display" element={<LeagueTimerDisplay />} />
        <Route path="/room-map" element={<RoomMapFullscreen />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/support" element={<Support />} />
        <Route path="/business-plan" element={<BusinessPlan />} />
        <Route path="/screenshots" element={<Screenshots />} />
        <Route path="/about" element={<MarketingPage />} />
        <Route path="/how-it-works" element={<MarketingPage />} />
        <Route path="/features" element={<MarketingPage />} />
        <Route path="/players" element={<MarketingPage />} />
        <Route path="/organizers" element={<MarketingPage />} />
        <Route path="/clubs-associations" element={<MarketingPage />} />
        <Route path="/white-label" element={<MarketingPage />} />
        <Route path="/faq" element={<MarketingPage />} />
        <Route path="/contact" element={<MarketingContact />} />
        <Route path="/start-free-trial" element={<MarketingStartTrial />} />
        <Route path="/app-screenshots" element={<AppScreenshots />} />
        <Route path="/demo/leagues" element={<MyLeaguesDemo />} />
        <Route path="/demo/leaderboard" element={<LeaderboardDemo />} />
        <Route path="/demo/score-entry" element={<ScoreEntryDemo />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/mobile-auth-return" element={<MobileAuthReturn />} />
        <Route path="/mobile-auth-return.html" element={<MobileAuthReturn />} />
        <Route path="/native-login" element={<NativeLogin />} />
        <Route path="/mobile-payment-return" element={<MobilePaymentReturn />} />
        <Route path="/course-payment-return" element={<CoursePaymentReturn />} />
        <Route path="/raffle-display/:raffleId" element={<RaffleDisplay />} />
        <Route path="/t-raffle-display/:raffleId" element={<TRaffleDisplay />} />
        <Route path="/silent-auction-display/:auctionId" element={<SilentAuctionDisplay />} />
        <Route path="/demo/scorecard" element={<ScorecardDemo />} />
        <Route path="/demo/player" element={<PlayerDemo />} />
        <Route path="/demo/tournament-overview" element={<TournamentOverviewDemo />} />

        {/* ── Authenticated player routes ──────────────────────────────────── */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="scorecard" element={<MyScorecard />} />
          <Route path="tournament" element={<TournamentOverview />} />
          <Route path="tournament-home/:tournamentId" element={<TournamentHome />} />
          <Route path="tournament-register/:id" element={<TournamentLanding />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assignments/:tournamentId" element={<RoundAssignments />} />
          <Route path="players" element={<Players />} />
          <Route path="tables" element={<Tables />} />
          <Route path="scores" element={<ScoreEntry />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="my-tournaments" element={<MyTournaments />} />
          <Route path="invites" element={<MyInvites />} />
          <Route path="leagues" element={<MyLeagues />} />
          <Route path="leagues/:id/payment" element={<LeaguePaymentProcessing />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="courses/:id/payment" element={<CoursePaymentProcessing />} />
          <Route path="tournaments/:id/payment" element={<TournamentPaymentProcessing />} />
          <Route path="courses/:id/payment/success" element={<CoursePaymentSuccess />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="registrations" element={<MyTournaments />} />
          <Route path="player-profile" element={<PlayerProfile />} />
          <Route path="stats" element={<PlayerStats />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="hand-log" element={<HandLog />} />
        </Route>

        {/* ── Admin routes ─────────────────────────────────────────────────── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="brand-guide" element={<BrandGuide />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="tournament/new/setup" element={<TournamentSetup />} />
          <Route path="tournament/:id" element={<TournamentDetail />} />
          <Route path="tournament/:id/setup" element={<TournamentSetup />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="tables" element={<AdminTables />} />
          <Route path="scores" element={<AdminScores />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="registrations" element={<AdminRegistrations />} />
          <Route path="director" element={<DirectorControl />} />
          <Route path="emails" element={<AdminEmails />} />
          <Route path="tournament/:id/communications" element={<TournamentCommunications />} />
          <Route path="tournament/:id/registrations" element={<TournamentRegistrations />} />
          <Route path="tournament/:id/invite" element={<InvitePlayers />} />
          <Route path="tournament/:id/sets" element={<TournamentSetsPage />} />
          <Route path="tournament/:id/timing" element={<TournamentTiming />} />
          <Route path="tournament/:id/special-hands" element={<SpecialHands />} />
          <Route path="tournament/:id/prizes" element={<TournamentPrizes />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="system-overview" element={<SystemOverview />} />
          <Route path="workflow-chart" element={<TournamentWorkflowChart />} />
          <Route path="leagues" element={<AdminLeagues />} />
          <Route path="leagues/new" element={<LeagueSetup />} />
          <Route path="leagues/:id" element={<LeagueDetail />} />
          <Route path="leagues/:id/setup" element={<LeagueSetup />} />
          <Route path="leagues/:id/session/:sessionId" element={<LeagueSessionDetail />} />
          <Route path="analytics" element={<TournamentAnalytics />} />
          <Route path="analytics-dashboard" element={<AnalyticsDashboard />} />
          <Route path="subscription" element={<AdminSubscription />} />
          <Route path="performance" element={<PlayerPerformance />} />
          <Route path="organization" element={<OrganizationDashboard />} />
          <Route path="broadcast" element={<BroadcastComms />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/new" element={<CourseSetup />} />
          <Route path="courses/:id" element={<AdminCourseDetail />} />
          <Route path="courses/:id/setup" element={<CourseSetup />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="card-setup" element={<CardSetup />} />
          <Route path="hand-logs" element={<HandLogs />} />
          <Route path="match-results" element={<MatchResultsAdmin />} />
          <Route path="tournament/:id/card-special-hands" element={<TournamentSpecialHands />} />
          <Route path="leagues/:id/card-special-hands" element={<LeagueSpecialHands />} />
          <Route path="marketing" element={<AdminMarketing />} />
          <Route path="competitor-comparison" element={<CompetitorComparison />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

// Redirect authenticated native users away from the root landing page to /app.
// This is the primary safety-net for all login flows on iOS and Android.
// Web users are intentionally left on the landing page (public tournament hub).
function NativeAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isCapacitorNative()) return;
    if (isLoadingAuth) return;
    if (location.pathname !== '/' && location.pathname !== '') return;

    if (hasPendingNotificationOpen()) {
      navigate(notificationCenterPath(getPendingNotificationHighlightId()), { replace: true });
      return;
    }
    if (!isAuthenticated) return;
    navigate(getPostAuthDefaultPath(), { replace: true });
  }, [isAuthenticated, isLoadingAuth, location.pathname, navigate]);

  return null;
}

// Handle Capacitor deep link redirects after OAuth login
// Root paths where back button should exit the app instead of going back
const EXIT_PATHS = ['/app', '/app/', '/', ''];

function CapacitorRouteHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, checkAppState, checkUserAuth } = useAuth();

  // Android hardware back button
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let backListener;

    const setupBack = async () => {
      backListener = await CapApp.addListener('backButton', () => {
        const path = location.pathname;
        const appLandingPath = isAuthenticated ? '/app' : '/';

        // On root app screens → exit the app
        if (EXIT_PATHS.includes(path)) {
          CapApp.exitApp();
          return;
        }

        // If a detail view is open via internal state (e.g. MyLeagues league detail),
        // delegate the back press to the component instead of navigating away.
        if (document.body.dataset.leagueDetailOpen === 'true') {
          window.dispatchEvent(new CustomEvent('app:backFromDetail'));
          return;
        }

        // Tournament detail / registration — respect discover return flow
        if (path.startsWith('/app/tournament-home/') || path.startsWith('/app/tournament-register/')) {
          if (location.state?.fromDiscover) {
            const returnTo = location.state?.returnTo || '/app';
            setDiscoverReturn();
            navigate(returnTo, { state: { openDiscover: true } });
            return;
          }
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/app', { replace: true });
          }
          return;
        }

        // Course detail opened from Discover
        if (path.startsWith('/app/courses/') && !path.includes('/payment')) {
          if (location.state?.fromDiscover) {
            const returnTo = location.state?.returnTo || '/app';
            setDiscoverReturn();
            navigate(returnTo, { state: { openDiscover: true } });
            return;
          }
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/app/courses', { replace: true });
          }
          return;
        }

        // League / class registration pages opened from Discover
        if (path === '/league-join' || path === '/course-register') {
          if (location.state?.fromDiscover) {
            const returnTo = location.state?.returnTo || '/app';
            setDiscoverReturn();
            navigate(returnTo, { state: { openDiscover: true } });
            return;
          }
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/app', { replace: true });
          }
          return;
        }

        // Self check-in → Home in one press (not back through the form)
        if (path === '/checkin') {
          navigate(appLandingPath, { replace: true });
          return;
        }

        // Notification Center → always return to default app landing (not history stack)
        if (path.startsWith('/app/notifications')) {
          navigate(appLandingPath, { replace: true });
          return;
        }

        // On any other /app/* sub-page → go back one step
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/app', { replace: true });
        }
      });
    };

    setupBack();

    return () => {
      backListener?.remove();
    };
  }, [location, navigate, isAuthenticated]);

  useEffect(() => {
    if (!isCapacitorNative()) return;

    let listener;
    let cancelled = false;

    const navigateFromUrl = async (url) => {
      try {
        // Close any in-app browser that may be open (from navigateToLogin)
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch {}

        const parsed = new URL(url);
        const token = parsed.searchParams.get('access_token');
        if (token) {
          setToken(token, true);
          await Preferences.set({ key: 'mm_auth_token', value: token });
        }

        if (isNotificationLaunchUrl(url)) {
          handleNotificationOpen({
            title: 'Notification',
            message: '',
            launchUrl: url,
            additionalData: {},
          });
          return;
        }

        let redirectPath = parsed.searchParams.get('redirect_url');
        if (redirectPath) {
          try {
            redirectPath = decodeURIComponent(redirectPath);
          } catch {
            /* use raw */
          }
        } else {
          redirectPath = parsed.pathname + parsed.search;
        }
        if (!redirectPath || redirectPath === '/') redirectPath = '/app';

        // Re-validate auth with the new token, then navigate.
        // Use checkUserAuth (not checkAppState) to skip redundant public settings fetch.
        await checkUserAuth();
        navigate(redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`, { replace: true });
      } catch {
        navigate('/app', { replace: true });
      }
    };

    const setup = async () => {
      try {
        if (processNativeShellOAuthParams(navigate)) {
          // iOS full-reload path: token may already be in localStorage via app-params.js.
          // Always re-run auth + OneSignal identity sync after OAuth navigation.
          await checkUserAuth();
          return;
        }

        if (recoverOAuthIfReturnedToHostedApp(navigate)) {
          return;
        }

        const launch = await CapApp.getLaunchUrl();
        if (!cancelled && launch?.url) {
          if (isNotificationLaunchUrl(launch.url)) {
            handleNotificationOpen({
              title: 'Notification',
              message: '',
              launchUrl: launch.url,
              additionalData: {},
            });
          } else {
            navigateFromUrl(launch.url);
          }
        } else if (!cancelled && !hasPendingNotificationOpen()) {
          const pendingPath = consumePendingPostLoginPath();
          if (pendingPath) {
            navigate(pendingPath, { replace: true });
          }
        }

        const urlListener = await CapApp.addListener('appUrlOpen', (event) => {
          navigateFromUrl(event.url);
        });

        const stateListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            recoverOAuthIfReturnedToHostedApp(navigate);
          }
        });

        if (!cancelled) {
          listener = {
            remove: async () => {
              await urlListener.remove();
              await stateListener.remove();
            },
          };
        } else {
          await urlListener.remove();
          await stateListener.remove();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('CapacitorRouteHandler deep link setup failed:', message, error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [navigate, checkUserAuth]);

  return null;
}

function App() {
  useEffect(() => {
    const bootstrapNative = async () => {
      try {
        if (isCapacitorNative()) {
          document.documentElement.classList.add('capacitor-native');
          document.body.classList.add('capacitor-native');
          await SplashScreen.hide();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('SplashScreen.hide failed:', message, error);
      }

      try {
        await initOneSignal();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('initOneSignal bootstrap failed:', message, error);
      }
    };

    bootstrapNative();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <CapacitorRouteHandler />
            <NativeAuthGuard />
            <PushSubscriptionSync />
            <NotificationRouter />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;