import React, { useState, useMemo } from 'react';
import { callAction } from '@/services/actions';
import { courseEnrollments as courseEnrollmentsApi, courses as coursesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Mail, UserPlus, History } from 'lucide-react';

function formatOneSignalErrors(oneSignalResponse) {
  if (!oneSignalResponse) return null;
  const errors = oneSignalResponse.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join(' · ');
  }
  if (typeof oneSignalResponse === 'string') return oneSignalResponse;
  if (typeof oneSignalResponse === 'object') {
    return JSON.stringify(oneSignalResponse);
  }
  return null;
}

function describeNotificationFailure(data) {
  const status = data?.oneSignalStatus ?? data?.notification?.oneSignalStatus;
  const response = data?.oneSignalResponse ?? data?.notification?.oneSignalResponse;
  const fromResponse = formatOneSignalErrors(response);
  const error = data?.error ?? data?.notification?.error;

  if (fromResponse) {
    return status ? `${status} - ${fromResponse}` : fromResponse;
  }
  if (error) {
    return status ? `${status} - ${error}` : error;
  }
  if (response) {
    const body = typeof response === 'string' ? response : JSON.stringify(response);
    return status ? `${status} - ${body}` : body;
  }
  return 'OneSignal returned no error details — check traceVersion in response';
}

export default function CourseStudentsTab({ courseId, course }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ player_name: '', player_email: '', player_phone: '', status: 'enrolled', payment_status: 'not_required' });
  const setF = (f, v) => setAddForm(p => ({ ...p, [f]: v }));

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', courseId],
    queryFn: () => courseEnrollmentsApi.filter({ course_id: courseId }, '-created_date'),
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['allEnrollments'],
    queryFn: () => courseEnrollmentsApi.list(),
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['allCourses'],
    queryFn: () => coursesApi.list(),
  });

  const historicalProfiles = useMemo(() => {
    const currentEmails = new Set(enrollments.map(e => e.player_email));
    
    // Find enrollments with cancelled or incomplete status (not enrolled in any other active course)
    const incomplete = allEnrollments.filter(e => {
      if (currentEmails.has(e.player_email)) return false; // Already in this course
      return e.status === 'cancelled' || !e.player_id; // Never completed or no user account
    });

    // Dedupe by email and get unique profiles
    const seen = new Set();
    return incomplete.filter(e => {
      if (seen.has(e.player_email)) return false;
      seen.add(e.player_email);
      return true;
    }).slice(0, 20); // Show top 20
  }, [enrollments, allEnrollments]);

  const addMutation = useMutation({
    mutationFn: (data) => courseEnrollmentsApi.create({ ...data, course_id: courseId, enrolled_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', courseId] });
      setShowAdd(false);
      setAddForm({ player_name: '', player_email: '', player_phone: '', status: 'enrolled', payment_status: 'not_required' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => courseEnrollmentsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments', courseId] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ enrollmentId, forceNotify = false }) => {
      console.log('[OneSignal] Calling notification function', {
        functionName: 'markCourseEnrollmentPaid',
        enrollmentId,
        forceNotify,
      });
      const result = await callAction('markCourseEnrollmentPaid', { enrollmentId, forceNotify });
      const data = result;
      console.log('[OneSignal] Notification function response received', data);
      if (!String(data?.traceVersion || '').includes('markCourseEnrollmentPaid-v4-raw-onesignal')) {
        console.warn(
          '[OneSignal] STALE SERVER FUNCTION — expected markCourseEnrollmentPaid-v4-raw-onesignal-auth, got:',
          data?.traceVersion ?? '(missing). Port markCourseEnrollmentPaid on the backend.',
        );
      }
      if (data?.authDebug) {
        console.log('[OneSignal] authDebug:', data.authDebug);
      }
      return result;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', courseId] });
      const data = res?.data ?? res;

      if (data?.skipped) {
        console.log('[CourseStudentsTab] mark paid skipped:', data);
        toast({
          title: 'Already paid',
          description: data.hint || 'Use Resend Push to deliver the notification again.',
          variant: 'destructive',
        });
        return;
      }

      if (!data?.success) {
        console.warn('[CourseStudentsTab] mark paid failed:', data);
        toast({
          title: 'Mark paid failed',
          description: data?.error || data?.reason || 'Could not update enrollment.',
          variant: 'destructive',
        });
        return;
      }

      console.log('[CourseStudentsTab] mark paid success:', data);

      if (data.pushSent) {
        toast({
          title: data.paymentUpdated ? 'Payment marked & push sent' : 'Push notification sent',
          description: [
            data?.debug?.studentEmail && `To: ${data.debug.studentEmail}`,
            data?.debug?.onesignalExternalId && `external_id: ${data.debug.onesignalExternalId}`,
          ].filter(Boolean).join(' · ') || 'Enrollment notification sent.',
        });
        return;
      }

      const pushError = describeNotificationFailure(data);
      console.warn('[CourseStudentsTab] push not delivered:', data);
      toast({
        title: 'Push not delivered',
        description: data.paymentUpdated
          ? `Payment marked paid. ${pushError}`
          : pushError,
        variant: 'destructive',
      });
    },
    onError: (err) => {
      console.error('[CourseStudentsTab] mark paid request failed:', err);
      toast({
        title: 'Mark paid failed',
        description: err.message || 'Could not update enrollment.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => courseEnrollmentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments', courseId] }),
  });

  const enrolled = enrollments.filter(e => e.status === 'enrolled').length;
  const waitlisted = enrollments.filter(e => e.status === 'waitlisted').length;

  const STATUS_COLOR = { enrolled: 'default', waitlisted: 'secondary', cancelled: 'outline' };
  const PAY_COLOR = { not_required: 'outline', pending: 'secondary', paid: 'default', refunded: 'destructive' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-slate-700">{enrolled} enrolled</span>
          {waitlisted > 0 && <span className="text-sm text-slate-400">{waitlisted} waitlisted</span>}
          {course?.enrollment_cap && <span className="text-sm text-slate-400">/ {course.enrollment_cap} cap</span>}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input className="mt-1" value={addForm.player_name} onChange={e => setF('player_name', e.target.value)} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input className="mt-1" type="email" value={addForm.player_email} onChange={e => setF('player_email', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input className="mt-1" value={addForm.player_phone} onChange={e => setF('player_phone', e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={addForm.status} onValueChange={v => setF('status', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={addForm.payment_status} onValueChange={v => setF('payment_status', v)}>
                <SelectTrigger className="mt-1 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_required">Not Required</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addMutation.mutate(addForm)} disabled={!addForm.player_name || !addForm.player_email || addMutation.isPending}>
                {addMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {enrollments.map(e => (
          <Card key={e.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800">{e.player_name}</span>
                    <Badge variant={STATUS_COLOR[e.status]} className="text-xs">{e.status}</Badge>
                    <Badge variant={PAY_COLOR[e.payment_status]} className="text-xs">{e.payment_status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{e.player_email}</span>
                    {e.player_phone && <span>{e.player_phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.payment_status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        console.log('[OneSignal] Mark Paid clicked', {
                          enrollmentId: e.id,
                          playerEmail: e.player_email,
                          playerName: e.player_name,
                          paymentStatus: e.payment_status,
                        });
                        markPaidMutation.mutate({ enrollmentId: e.id });
                      }}
                      disabled={markPaidMutation.isPending}
                    >
                      Mark Paid
                    </Button>
                  )}
                  {e.payment_status === 'paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        console.log('[OneSignal] Mark Paid clicked', {
                          enrollmentId: e.id,
                          playerEmail: e.player_email,
                          playerName: e.player_name,
                          paymentStatus: e.payment_status,
                          forceNotify: true,
                        });
                        markPaidMutation.mutate({ enrollmentId: e.id, forceNotify: true });
                      }}
                      disabled={markPaidMutation.isPending}
                    >
                      Resend Push
                    </Button>
                  )}
                  <Select value={e.status} onValueChange={v => updateMutation.mutate({ id: e.id, data: { status: v } })}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enrolled">Enrolled</SelectItem>
                      <SelectItem value="waitlisted">Waitlisted</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                    if (confirm('Remove this student?')) deleteMutation.mutate(e.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {enrollments.length === 0 && !showAdd && (
          <div className="text-center py-12 text-slate-400">
            <p>No students enrolled yet.</p>
          </div>
        )}
      </div>

      {historicalProfiles.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <History className="h-4 w-4" /> Historical Profiles
          </h3>
          <p className="text-sm text-slate-500 mb-3">Players from previous courses who never enrolled or didn't complete:</p>
          <div className="space-y-2">
            {historicalProfiles.map(h => (
              <Card key={`${h.player_email}`} className="hover:shadow-sm transition-shadow bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800">{h.player_name}</div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{h.player_email}</span>
                        {h.player_phone && <span>{h.player_phone}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="default" onClick={() => {
                      setAddForm({ player_name: h.player_name, player_email: h.player_email, player_phone: h.player_phone || '', status: 'enrolled', payment_status: 'not_required' });
                      setShowAdd(true);
                    }}>
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}