import { useState, useEffect } from 'react';
import { me as authMe, updateMe } from '@/services/authApi';
import { uploadFile } from '@/services/integrationsApi';
import { redirectToLogin } from '@/lib/capacitor-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Check, AlertCircle, Upload } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PlayerTournamentHistory from '@/components/player/PlayerTournamentHistory';
import LeagueAttendanceHistory from '@/components/player/LeagueAttendanceHistory';
import PlayerMatchups from '@/components/player/PlayerMatchups';

export default function PlayerProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    city_state: '',
    photo_url: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authMe();
        if (currentUser) {
          setUser(currentUser);
          setFormData({
            full_name: currentUser.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            city_state: currentUser.city_state || '',
            photo_url: currentUser.photo_url || '',
          });
        } else {
          setAuthError(true);
        }
      } catch {
        setAuthError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile({ file });
    setFormData(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        city_state: formData.city_state,
        photo_url: formData.photo_url,
      });
      const updated = await authMe();
      setUser(updated);
    } finally {
      setSaving(false);
    }
  };

  const profileLink = user ? `${window.location.origin}/player-signup?player_id=${user.id}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Not authenticated</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please sign in to access your profile.
            </p>
            <Button onClick={() => redirectToLogin('/app')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BackButton to="/app" />
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-800">Player Profile</h1>
            <p className="text-slate-500 mt-1">Manage your tournament profile information</p>
          </div>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Keep your profile up to date so tournament organizers can reach you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={formData.photo_url} />
                <AvatarFallback className="text-xl">
                  {(formData.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span><Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                  </Button>
                </Label>
                <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <p className="text-xs text-muted-foreground mt-1">Optional — shown to tournament organizers</p>
              </div>
            </div>

            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Your full name"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-1.5 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Your email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="city_state">City & State</Label>
              <Input
                id="city_state"
                name="city_state"
                value={formData.city_state}
                onChange={handleInputChange}
                placeholder="Chicago, IL"
                className="mt-1.5"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Tabs */}
        {user && (
          <Tabs defaultValue="tournaments">
            <TabsList className="w-full">
              <TabsTrigger value="tournaments" className="flex-1">Tournament History</TabsTrigger>
              <TabsTrigger value="matchups" className="flex-1">Matchups</TabsTrigger>
              <TabsTrigger value="attendance" className="flex-1">League Attendance</TabsTrigger>
            </TabsList>
            <TabsContent value="tournaments" className="mt-4">
              <PlayerTournamentHistory playerId={user.id} />
            </TabsContent>
            <TabsContent value="matchups" className="mt-4">
              <PlayerMatchups playerId={user.id} userEmail={user.email} />
            </TabsContent>
            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardContent className="pt-5">
                  <LeagueAttendanceHistory userEmail={user.email} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Shareable Link */}
        <Card>
          <CardHeader>
            <CardTitle>Share Your Profile</CardTitle>
            <CardDescription>Share this link with tournament organizers so they can invite you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={profileLink}
                readOnly
                className="bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-emerald-600">Copied to clipboard!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}