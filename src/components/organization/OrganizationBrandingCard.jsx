import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizations as organizationsApi } from '@/services/resources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/shared/ImageUpload';
import { toast } from 'sonner';

// Lets the organization owner/admin edit branding + social links that surface
// on all public tournament/league/course pages.
export default function OrganizationBrandingCard({ organization }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(organization.name || '');
  const [description, setDescription] = useState(organization.description || '');
  const [publicDescription, setPublicDescription] = useState(organization.public_description || '');
  const [website, setWebsite] = useState(organization.website || '');
  const [contactEmail, setContactEmail] = useState(organization.contact_email || '');
  const [phone, setPhone] = useState(organization.phone || '');
  const [location, setLocation] = useState(organization.location || '');
  const [primaryColor, setPrimaryColor] = useState(organization.primary_color || '#6D28D9');
  const [logoUrl, setLogoUrl] = useState(organization.logo_url || '');
  const [social, setSocial] = useState(organization.social_links || {});

  useEffect(() => {
    if (!organization) return;
    setName(organization.name || '');
    setDescription(organization.description || '');
    setPublicDescription(organization.public_description || '');
    setWebsite(organization.website || '');
    setContactEmail(organization.contact_email || '');
    setPhone(organization.phone || '');
    setLocation(organization.location || '');
    setPrimaryColor(organization.primary_color || '#6D28D9');
    setLogoUrl(organization.logo_url || '');
    setSocial(organization.social_links || {});
  }, [organization.id]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      await organizationsApi.update(organization.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', organization.id] });
      toast.success('Organization branding saved');
    },
    onError: (err) => toast.error(err.message || 'Failed to save'),
  });

  const save = () => {
    updateMutation.mutate({
      name,
      description,
      public_description: publicDescription,
      website,
      contact_email: contactEmail,
      phone,
      location,
      primary_color: primaryColor,
      logo_url: logoUrl,
      social_links: social,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Branding & Social</CardTitle>
        <CardDescription>
          These details appear on all your public tournament, league, and course pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Organization Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your organization" />
        </div>

        <div>
          <Label>Logo</Label>
          <ImageUpload value={logoUrl} onChange={setLogoUrl} label="Organization logo" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Website</Label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourorg.com" />
          </div>
          <div>
            <Label>Public Contact Email</Label>
            <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@yourorg.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" />
          </div>
        </div>

        <div>
          <Label>Brand Color</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-9 rounded border cursor-pointer" />
            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#6D28D9" />
          </div>
        </div>

        <div>
          <Label>Internal Description (admin only)</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes about your organization" />
        </div>

        <div>
          <Label>Public Description</Label>
          <Textarea value={publicDescription} onChange={e => setPublicDescription(e.target.value)} rows={3} placeholder="Shown to the public on your event pages" />
        </div>

        <div className="pt-2 border-t">
          <Label>Social Media Links</Label>
          <p className="text-xs text-muted-foreground mb-2">These appear as icons in the footer of your public pages.</p>
          <div className="space-y-2">
            <Input value={social.facebook || ''} onChange={e => setSocial(s => ({ ...s, facebook: e.target.value }))} placeholder="Facebook URL" />
            <Input value={social.twitter || ''} onChange={e => setSocial(s => ({ ...s, twitter: e.target.value }))} placeholder="Twitter / X URL" />
            <Input value={social.instagram || ''} onChange={e => setSocial(s => ({ ...s, instagram: e.target.value }))} placeholder="Instagram URL" />
          </div>
        </div>

        <Button onClick={save} disabled={updateMutation.isPending} className="w-full">
          {updateMutation.isPending ? 'Saving…' : 'Save Branding'}
        </Button>
      </CardContent>
    </Card>
  );
}