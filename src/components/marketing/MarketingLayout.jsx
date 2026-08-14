import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, ChevronLeft, UserPlus, LogIn,
  Home, Waypoints, Star, User, Building2, Users, Sparkles, HelpCircle,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useQuery } from '@tanstack/react-query';
import { marketingPages as marketingPagesApi } from '@/services/resources';
import { isCapacitorNative, redirectToLogin } from '@/lib/capacitor-utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GOLD = '#c9a96e';

const NAV_ICONS = {
  about: Home,
  'how-it-works': Waypoints,
  features: Star,
  players: User,
  organizers: Building2,
  'clubs-associations': Users,
  'white-label': Sparkles,
  faq: HelpCircle,
};

function getNavIcon(slug) {
  return NAV_ICONS[slug] || Home;
}

function nativeHeaderTitle(pageTitle) {
  if (!pageTitle) return 'Morain Mahj';
  if (pageTitle.includes('Morain Mahj')) return pageTitle;
  return `${pageTitle} Morain Mahj`;
}

function nativeSignupPath() {
  return '/native-login?mode=signup';
}

function handleNativeSignup(navigate) {
  navigate(nativeSignupPath());
}

function handleNativeLogin() {
  redirectToLogin('/app');
}

export default function MarketingLayout({ children, pageTitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isNative = isCapacitorNative();
  const currentSlug = location.pathname.replace(/^\//, '') || 'home';

  const { data: pages = [] } = useQuery({
    queryKey: ['marketing-nav-pages'],
    queryFn: () => marketingPagesApi.filter({ status: 'published', show_in_nav: true }),
  });

  const navPages = [...pages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleNav = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  if (isNative) {
    const headerTitle = nativeHeaderTitle(pageTitle);

    return (
      <div className="native-app-shell bg-background font-body">
        <header
          className="native-app-header z-50 shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Navy title bar */}
          <div className="bg-primary text-primary-foreground px-3 pb-3">
            <div className="flex items-center min-h-[56px]">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-10 h-10 shrink-0 rounded-full border border-primary-foreground/25 flex items-center justify-center active:bg-primary-foreground/10"
                aria-label="Back to home"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex-1 flex flex-col items-center justify-center px-2 min-w-0">
                <h1 className="font-heading text-[17px] sm:text-lg tracking-wide text-center truncate w-full">
                  {headerTitle}
                </h1>
                <div className="flex items-center gap-1.5 mt-1.5" aria-hidden="true">
                  <span className="h-px w-10 sm:w-14" style={{ backgroundColor: `${GOLD}99` }} />
                  <span
                    className="w-1.5 h-1.5 shrink-0"
                    style={{ backgroundColor: GOLD, transform: 'rotate(45deg)' }}
                  />
                  <span className="h-px w-10 sm:w-14" style={{ backgroundColor: `${GOLD}99` }} />
                </div>
              </div>

              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                <Logo variant="icon" size="xs" className="text-[#c9a96e]" />
              </div>
            </div>
          </div>

          {/* Icon tab bar */}
          {navPages.length > 0 && (
            <div className="bg-[#f5f2eb] border-b border-border/40">
              <div className="flex overflow-x-auto scrollbar-none">
                {navPages.map((p, i) => {
                  const Icon = getNavIcon(p.slug);
                  const isActive = currentSlug === p.slug;
                  return (
                    <React.Fragment key={p.slug}>
                      {i > 0 && (
                        <div className="w-px shrink-0 bg-border/50 self-stretch my-2.5" aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleNav(`/${p.slug}`)}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-1 min-w-[5.5rem] px-3 py-2.5 shrink-0 active:opacity-80',
                          isActive ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <Icon
                          className="h-[18px] w-[18px]"
                          style={{ color: isActive ? GOLD : undefined }}
                          strokeWidth={isActive ? 2.25 : 1.75}
                        />
                        <span className={cn(
                          'text-[11px] leading-tight whitespace-nowrap',
                          isActive ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
                        )}>
                          {p.nav_label || p.title}
                        </span>
                        {isActive && (
                          <span
                            className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                            style={{ backgroundColor: GOLD }}
                          />
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        <main className="native-app-scroll pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>

        {/* Sticky primary actions — native pattern */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-2.5 max-w-lg mx-auto">
            <Button
              size="lg"
              className="flex-1 h-12 rounded-xl font-semibold gap-2"
              onClick={() => handleNativeSignup(navigate)}
            >
              <UserPlus className="h-4 w-4" /> Join Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-12 rounded-xl font-semibold gap-2"
              onClick={handleNativeLogin}
            >
              <LogIn className="h-4 w-4" /> Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body" style={{ paddingTop: 'calc(var(--safe-area-top, 0px) + 64px)' }}>
      {/* ── NAV ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-primary/95 backdrop-blur safe-top">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo variant="icon" size="xs" className="text-primary-foreground" />
            <div className="flex flex-col leading-none">
              <span className="font-heading font-light tracking-widest uppercase text-base leading-none text-primary-foreground">
                Morain Mahj
              </span>
              <span className="font-body font-light tracking-[0.1em] uppercase text-[9px] opacity-50 mt-0.5 text-primary-foreground">
                Legacy game for modern players
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navPages.map(p => (
              <Link
                key={p.slug}
                to={`/${p.slug}`}
                className="px-3 py-2 text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-md transition-colors"
              >
                {p.nav_label || p.title}
              </Link>
            ))}
            <Link
              to="/start-free-trial"
              className="ml-2 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-md transition-colors"
            >
              Start Free Trial
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-primary-foreground"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-primary-foreground/10 bg-primary px-5 py-4 space-y-1">
            {navPages.map(p => (
              <button
                key={p.slug}
                onClick={() => handleNav(`/${p.slug}`)}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-md"
              >
                {p.nav_label || p.title}
              </button>
            ))}
            <button
              onClick={() => handleNav('/start-free-trial')}
              className="block w-full text-center mt-2 px-4 py-2.5 text-sm font-semibold bg-primary-foreground text-primary rounded-md"
            >
              Start Free Trial
            </button>
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ── */}
      <main>{children}</main>

      {/* ── FOOTER ── */}
      <footer className="bg-primary text-primary-foreground py-10 px-5">
        <div className="max-w-7xl mx-auto text-center">
          <Logo size="sm" className="text-primary-foreground opacity-80 mb-4 justify-center" />
          <p className="text-sm text-primary-foreground/60 mb-4">
            © {new Date().getFullYear()} Morain Mahj LLC · Competitive Mah Jongg
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link to="/terms" className="text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-2">Terms</Link>
            <Link to="/privacy" className="text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-2">Privacy</Link>
            <Link to="/pricing" className="text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-2">Pricing</Link>
            <Link to="/contact" className="text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-2">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}