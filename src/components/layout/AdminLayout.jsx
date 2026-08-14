import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '@/lib/AuthContext';
import { callAction } from '@/services/actions';
import { subscriptions as subscriptionsApi } from '@/services/resources';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isSubscriptionActive } from '@/lib/subscriptionPlans';
import { isPathAllowedForPlan } from '@/lib/adminNav';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, checkUserAuth, logout } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);

  // Detect ?subscription=success redirect and verify payment synchronously.
  // CRITICAL: wait for user to load so we don't trigger verification for super admins.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const subSuccess = params.get('subscription') === 'success';
    const sessionId = params.get('session_id');
    if (subSuccess && sessionId && !isSuperAdmin) {
      setVerifying(true);
      callAction('verifySubscriptionPayment', { session_id: sessionId })
        .then(async () => {
          // Refresh auth so user.role is updated in context, then refetch subscriptions
          await checkUserAuth();
          await queryClient.invalidateQueries({ queryKey: ['admin-layout-subscription', user?.id] });
          // Clean the URL
          window.history.replaceState({}, '', '/admin');
          setVerifying(false);
        })
        .catch((err) => {
          console.error('Subscription verification failed:', err);
          setVerifying(false);
        });
    }
  }, [user, isSuperAdmin]);

  const { data: subscriptions = [], isLoading: isLoadingSub } = useQuery({
    queryKey: ['admin-layout-subscription', user?.id],
    queryFn: () => subscriptionsApi.filter({ user_id: user.id }),
    enabled: !!user?.id && !isSuperAdmin,
  });
  const subscription = subscriptions[0] ?? null;
  const subActive = isSubscriptionActive(subscription);
  const currentPath = window.location.pathname;
  const pathAllowed = isPathAllowedForPlan(currentPath, subscription?.plan, isSuperAdmin);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-300 text-sm">Activating your subscription…</p>
        </div>
      </div>
    );
  }

  if (user && !isSuperAdmin && user.role !== 'organizer_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-4">You need admin privileges to access this area.</p>
          <p className="text-slate-500 text-sm">Signed in as <span className="text-slate-300">{user.email}</span></p>
          <Button variant="outline" onClick={() => logout()} className="gap-1.5">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingSub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin && !subActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-6xl mb-4">💳</div>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">Subscription Required</h2>
          <p className="text-slate-400 mb-6">You need an active subscription to access the admin dashboard.</p>
          <div className="flex flex-col gap-3">
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              <Link to="/pricing">View Plans</Link>
            </Button>
            <Button variant="outline" onClick={() => logout()} className="gap-1.5">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && subActive && !pathAllowed) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen font-body" style={{ background: '#f1f5f9', color: '#1e293b' }}>
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="lg:ml-64 min-h-screen" style={{
        '--background': '210 40% 96%',
        '--foreground': '222 47% 11%',
        '--card': '0 0% 100%',
        '--card-foreground': '222 47% 11%',
        '--popover': '0 0% 100%',
        '--popover-foreground': '222 47% 11%',
        '--muted': '210 40% 93%',
        '--muted-foreground': '215 16% 47%',
        '--border': '214 32% 88%',
        '--input': '214 32% 88%',
        '--accent': '152 40% 65%',
        '--accent-foreground': '152 40% 10%',
      }}>
        {/* Top bar */}
        <div
          className="bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30"
          style={{
            paddingTop: 'max(0.75rem, var(--safe-area-top))',
            paddingBottom: '0.75rem',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="lg:hidden w-8" />
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400 font-body hidden lg:block">
              Logged in as <span className="font-semibold text-slate-600">{user?.email}</span>
              {user?.role === 'admin' && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold uppercase tracking-wide">Admin</span>}
            </p>
            <p className="text-xs text-slate-500 font-body lg:hidden truncate max-w-[160px]">{user?.email}</p>
            <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
        <div
          className="p-4 md:p-8 pt-6 max-w-7xl mx-auto"
          style={{
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}