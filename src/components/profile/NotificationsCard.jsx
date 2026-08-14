import React, { useState, useEffect } from 'react';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import { syncPushUserWeb, waitForWebPushInit } from '@/lib/onesignal-web';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function NotificationsCard({ userId, userEmail }) {
  const [status, setStatus] = useState('loading'); // loading | unsupported | default | granted | denied
  const [working, setWorking] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (isCapacitorNative()) {
      setStatus('unsupported');
      return;
    }
    const webPushReady = await waitForWebPushInit();
    if (!webPushReady || !window.OneSignal) {
      setStatus('unsupported');
      return;
    }
    try {
      const permission = await window.OneSignal.Notifications.permissionNative;
      setStatus(permission || 'default');
    } catch {
      setStatus('unsupported');
    }
  };

  const handleEnable = async () => {
    if (!window.OneSignal) return;
    setWorking(true);
    try {
      await syncPushUserWeb({ id: userId, email: userEmail });
      const permission = await window.OneSignal.Notifications.permissionNative;
      setStatus(permission || 'granted');
    } catch (e) {
      console.error('OneSignal enable error', e);
    }
    setWorking(false);
  };

  const handleDisable = async () => {
    if (!window.OneSignal) return;
    setWorking(true);
    try {
      await window.OneSignal.logout();
      setStatus('default');
    } catch (e) {
      console.error('OneSignal disable error', e);
    }
    setWorking(false);
  };

  if (status === 'loading') return null;
  if (status === 'unsupported') return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4" /> Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'granted' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Notifications are enabled on this device.
            </div>
            <p className="text-xs text-muted-foreground">
              You'll receive alerts for table assignments, score verifications, and session invites.
            </p>
            <Button variant="outline" size="sm" onClick={handleDisable} disabled={working} className="gap-2">
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              Disable Notifications
            </Button>
          </div>
        ) : status === 'denied' ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Notifications are blocked. To enable them, update your browser/device settings for this site and then reload the page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Allow Morain Mahj to send you push notifications so you never miss a table assignment, score verification, league session invite, or tournament update.
            </p>
            <Button onClick={handleEnable} disabled={working} className="w-full gap-2">
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Enable Notifications
            </Button>
            <p className="text-xs text-muted-foreground text-center">You can turn this off anytime in your device settings.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}