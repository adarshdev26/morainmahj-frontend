import React, { useState } from 'react';
import { callAction } from '@/services/actions';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isSubscriptionActive, getSubscriptionStatus } from '@/lib/subscriptionPlans';

export default function SidebarCancelSubscription({ user, subscription }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelLoading, setCancelLoading] = useState(false);

  const isOrganizerAdmin = user?.role === 'organizer_admin';
  const isActive = isSubscriptionActive(subscription);
  const status = getSubscriptionStatus(subscription);

  if (!isOrganizerAdmin || !isActive) return null;

  const handleCancel = async () => {
    try {
      setCancelLoading(true);
      const res = await callAction('cancelSubscription', {});
      toast({
        title: res?.message?.includes('period') ? 'Scheduled for cancellation' : 'Subscription cancelled',
        description: res?.message,
      });
      await queryClient.invalidateQueries({ queryKey: ['my-subscription', user?.id] });
      window.location.reload();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, variant: 'destructive' });
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 h-8"
        >
          <XCircle className="h-3.5 w-3.5" />
          {status === 'trialing' ? 'Cancel Trial' : 'Cancel Subscription'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {status === 'trialing' ? 'Cancel your free trial?' : 'Cancel your subscription?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {status === 'trialing'
              ? 'Your admin access will end immediately. You can restart anytime by choosing a plan.'
              : 'Your subscription will be cancelled at the end of the current billing period. You\'ll retain access until then.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Plan</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={cancelLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {cancelLoading ? 'Cancelling…' : 'Yes, Cancel'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}