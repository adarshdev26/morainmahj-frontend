import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellOff,
  Trophy,
  Ticket,
  Users,
  ClipboardList,
  Gavel,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotificationHistory,
  clearPendingNotificationOpen,
} from '@/lib/notifications-center';

const CATEGORY_META = {
  tournament: { label: 'Tournament', icon: Trophy, color: 'text-green-700 bg-green-50' },
  raffle: { label: 'Raffle', icon: Ticket, color: 'text-amber-700 bg-amber-50' },
  league: { label: 'League', icon: Users, color: 'text-blue-700 bg-blue-50' },
  scorecard: { label: 'Scorecard', icon: ClipboardList, color: 'text-teal-700 bg-teal-50' },
  auction: { label: 'Auction', icon: Gavel, color: 'text-purple-700 bg-purple-50' },
  general: { label: 'Update', icon: Bell, color: 'text-slate-700 bg-slate-50' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [items, setItems] = useState(() => getNotifications());
  const itemRefs = useRef({});

  const refresh = useCallback(() => setItems(getNotifications()), []);

  useEffect(() => {
    clearPendingNotificationOpen();
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const el = itemRefs.current[highlightId];
    if (!el) return;
    const scrollTimer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    const clearTimer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
    }, 4000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightId, items.length, setSearchParams]);

  const handleOpen = (item) => {
    markNotificationRead(item.id);
    refresh();
    if (!item.targetPath) return;
    if (!isAuthenticated) {
      navigateToLogin(`${window.location.origin}${item.targetPath}`);
      return;
    }
    navigate(item.targetPath);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div
      className="pb-8 max-w-lg mx-auto w-full min-h-full"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      {!isAuthenticated && (
        <p className="text-sm text-muted-foreground mb-4 rounded-lg border border-dashed px-3 py-2">
          Sign in to open tournament and score links from your notifications.
        </p>
      )}

      <div className="flex items-center gap-3 mb-6">
        <BackButton to={isAuthenticated ? '/app' : '/'} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-heading font-semibold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'Your recent alerts and updates'}
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 -mt-4">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => { markAllNotificationsRead(); refresh(); }}>
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { clearNotificationHistory(); refresh(); }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear history
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <BellOff className="w-10 h-10 text-muted-foreground/50" />
            <p className="font-medium text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Push alerts for tables, scores, raffles, and more will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.general;
            const Icon = meta.icon;
            return (
              <li key={item.id} ref={(el) => { itemRefs.current[item.id] = el; }}>
                <button
                  type="button"
                  onClick={() => handleOpen(item)}
                  className={cn(
                    'w-full text-left rounded-xl border bg-card p-4 transition-all active:scale-[0.99]',
                    'hover:border-primary/30 hover:shadow-sm',
                    !item.read && 'border-primary/20',
                    highlightId === item.id && 'ring-2 ring-amber-400 border-amber-300 bg-amber-50/50',
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', meta.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug">{item.title}</p>
                      {item.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className={cn('px-1.5 py-0.5 rounded font-medium', meta.color)}>{meta.label}</span>
                        <span>
                          {formatDistanceToNow(new Date(item.receivedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0 self-center" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
