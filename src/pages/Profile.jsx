import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { me as authMe, updateMe } from '@/services/authApi';
import { uploadFile } from '@/services/integrationsApi';
import { callAction } from '@/services/actions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, Save, User, Lock, Trash2, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/ThemeProvider';
import BackButton from '@/components/shared/BackButton';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import MyPrizeEarnings from '@/components/prizes/MyPrizeEarnings';
import NotificationsCard from '@/components/profile/NotificationsCard';

// Wipe every local storage layer — mirrors AuthContext.nukeAllStorage
const nukeAllStorageForProfile = async () => {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (!name) return;
      const exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `${name}=;${exp};path=/`;
      document.cookie = `${name}=;${exp};path=/;domain=.morainmahj.com`;
    });
  } catch {}
  try {
    const dbs = await window.indexedDB?.databases?.();
    if (dbs?.length) {
      await Promise.all(dbs.map((db) => db.name && window.indexedDB.deleteDatabase(db.name)));
    }
  } catch {}
  if (Capacitor.isNativePlatform()) {
    try { await Preferences.clear(); } catch {}
  }
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', city_state: '', photo_url: '', profile_emoji: '', age_range: '', gender: '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const { toast } = useToast();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleDeleteAccount = async () => {
    console.log('[Profile] handleDeleteAccount: button clicked');
    setDeleting(true);
    try {
      const data = await callAction('deleteAccount', { confirmEmail });
      console.log('[Profile] parsed response:', JSON.stringify(data));

      if (data?.success !== true) {
        const errMsg = data?.error || data?.message || data?.detail || 'Delete failed';
        throw new Error(errMsg);
      }

      console.log('[Profile] deletion confirmed (success: true) — clearing all storage...');
      await nukeAllStorageForProfile();
      console.log('[Profile] storage cleared — navigating to /');
      window.location.href = '/';
    } catch (err) {
      console.error('[Profile] handleDeleteAccount FAILED:', err);
      setDeleting(false);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        String(err);
      window.alert('Failed to delete account:\n' + msg);
    }
  };

  useEffect(() => {
    authMe().then(u => {
      setUser(u);
      setForm({
        full_name: u.full_name || '',
        phone: u.phone || '',
        city_state: u.city_state || '',
        photo_url: u.photo_url || '',
        profile_emoji: u.profile_emoji || '',
        age_range: u.age_range || '',
        gender: u.gender || '',
      });
    });
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      setForm(f => ({ ...f, photo_url: file_url }));
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateMe({
        phone: form.phone,
        city_state: form.city_state,
        photo_url: form.photo_url,
        profile_emoji: form.profile_emoji,
        age_range: form.age_range,
        gender: form.gender,
        profile_complete: true,
      });
      const updated = await authMe();
      setUser(updated);
      setForm({
        full_name: updated.full_name || '',
        phone: updated.phone || '',
        city_state: updated.city_state || '',
        photo_url: updated.photo_url || '',
        profile_emoji: updated.profile_emoji || '',
        age_range: updated.age_range || '',
        gender: updated.gender || '',
      });
      toast({ title: 'Profile saved!' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (!user) return null;

  const initials = (user.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
  const isNative = isCapacitorNative();

  const headerBlock = (
    <div className="flex items-center gap-3 mb-6">
      <BackButton to="/app" />
      <div>
        <h2 className={`font-heading font-bold ${isNative ? 'text-xl' : 'text-2xl pt-8'}`}>My Profile</h2>
        <p className="text-sm text-muted-foreground">Update your information for tournament registration</p>
      </div>
    </div>
  );

  const profileBody = (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={form.photo_url} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span><Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                </Button>
              </Label>
              <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <p className="text-xs text-muted-foreground mt-1">Optional — or pick an emoji below</p>
            </div>
          </div>

          {/* Emoji avatar picker */}
          <div className="space-y-2">
            <Label>Profile Emoji <span className="text-muted-foreground text-xs">(shown in app if no photo)</span></Label>
            <div className="flex flex-wrap gap-2">
              {['🐼','🦊','🐻','🐯','🦁','🐸','🐙','🦋','🌸','⭐','🎭','🎯','🀄','🎲','🌙','🔥'].map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, profile_emoji: f.profile_emoji === e ? '' : e }))}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${form.profile_emoji === e ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input value={form.full_name} disabled placeholder="Your full name (managed by account)" />
            <p className="text-xs text-muted-foreground">Name is set by your account login</p>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input value={user.email} disabled />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="555-555-5555" />
          </div>

          {/* City/State */}
          <div className="space-y-1">
            <Label>City / State <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.city_state} onChange={e => setForm(f => ({ ...f, city_state: e.target.value }))} placeholder="e.g. Austin, TX" />
          </div>

          {/* Analytics-only section */}
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 space-y-4">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Community Analytics Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The following information is used <strong>for aggregate analytics only</strong> and is never displayed publicly or shared with other players. Only tournament administrators can access this data in anonymized reports.
                </p>
              </div>
            </div>

            {/* Age Range */}
            <div className="space-y-1">
              <Label>Age Range <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={form.age_range} onValueChange={v => setForm(f => ({ ...f, age_range: v }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_18">Under 18</SelectItem>
                  <SelectItem value="18_24">18–24</SelectItem>
                  <SelectItem value="25_34">25–34</SelectItem>
                  <SelectItem value="35_44">35–44</SelectItem>
                  <SelectItem value="45_54">45–54</SelectItem>
                  <SelectItem value="55_64">55–64</SelectItem>
                  <SelectItem value="65_plus">65+</SelectItem>
                  <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <Label>Gender <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="prefer_not">Decline to state</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <NotificationsCard userId={user?.id} userEmail={user?.email} />

      {/* Prize Earnings - visible only to this player */}
      <MyPrizeEarnings userId={user?.id} />

      {/* Theme Selection */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="w-4 h-4" /> Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Choose how the app looks. This overrides your device settings.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <Sun className="w-6 h-6 text-amber-500" />
              <span className="text-sm font-medium">Light Mode</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <Moon className="w-6 h-6 text-indigo-400" />
              <span className="text-sm font-medium">Dark Mode</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full mt-6"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>

      {/* Legal */}
      <p className="mt-3 text-xs text-center text-muted-foreground">
        <Link to="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>
        {' · '}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>
      </p>

      {/* Account Deletion */}
      <Card className="mt-4 border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive text-base">
            <Trash2 className="w-4 h-4" /> Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="destructive" className="w-full" disabled={deleting} onClick={() => { setConfirmEmail(''); setShowDeleteDialog(true); }}>
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete My Account'}
          </Button>

          {showDeleteDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="text-lg font-bold text-destructive mb-1">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete your account and anonymize all your data. <strong>This cannot be undone.</strong>
                </p>
                <p className="text-sm font-medium mb-2">Type your email address to confirm:</p>
                <p className="text-xs text-muted-foreground mb-2 font-mono bg-muted px-2 py-1 rounded">{user.email}</p>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-4 focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>Cancel</Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={deleting || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? 'Deleting...' : 'Delete Forever'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  if (isNative) {
    return (
      <div className="h-full flex flex-col native-app-shell">
        <div
          className="native-app-header shrink-0 px-4 pb-4 bg-background border-b border-border"
          style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}
        >
          {headerBlock}
        </div>
        <div className="flex-1 overflow-y-auto native-app-scroll px-4 py-4 native-bottom-scroll-pad max-w-lg mx-auto w-full">
          {profileBody}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 pb-32 max-w-lg mx-auto">
      {headerBlock}
      {profileBody}
    </div>
  );
}