import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Globe, Copy, Eye, Plus, Trash2 } from 'lucide-react';
import BannerThemePicker from '@/components/tournament-website/BannerThemePicker';
import EventContentManager from '@/components/shared/EventContentManager';

function slugify(text) {
  return (text || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function LeagueWebsiteTab({ league, updateLeague }) {
  const { toast } = useToast();
  const [slug, setSlug] = useState(league.website_slug || slugify(league.name));
  const [description, setDescription] = useState(league.website_description || '');
  const [contactEmail, setContactEmail] = useState(league.website_contact_email || '');
  const [primaryColor, setPrimaryColor] = useState(league.website_primary_color || '#6D28D9');
  const [highlights, setHighlights] = useState(league.website_highlights || []);
  const [sponsors, setSponsors] = useState(league.website_sponsors || []);
  const [social, setSocial] = useState(league.website_social_links || {});
  const [aboutContent, setAboutContent] = useState(league.website_about_content || '');
  const [galleryImages, setGalleryImages] = useState(league.website_gallery_images || []);
  const [documents, setDocuments] = useState(league.website_documents || []);

  const cleanSlug = slugify(slug);
  const publicUrl = `${window.location.origin}/league/${cleanSlug}`;
  const isEnabled = league.website_enabled;
  const isPublished = league.website_status === 'published';

  const toggleEnabled = (val) => {
    updateLeague.mutate({ website_enabled: val, website_slug: cleanSlug }, {
      onSuccess: () => toast({ title: val ? 'Website enabled' : 'Website disabled' }),
    });
  };

  const togglePublish = () => {
    const newStatus = isPublished ? 'draft' : 'published';
    updateLeague.mutate({ website_status: newStatus, website_slug: cleanSlug }, {
      onSuccess: () => toast({ title: newStatus === 'published' ? 'Website published!' : 'Reverted to draft' }),
    });
  };

  const saveContent = () => {
    updateLeague.mutate({
      website_slug: cleanSlug,
      website_description: description,
      website_contact_email: contactEmail,
      website_primary_color: primaryColor,
      website_highlights: highlights.filter(Boolean),
      website_sponsors: sponsors.filter(s => s.name),
      website_social_links: social,
      website_about_content: aboutContent,
      website_gallery_images: galleryImages.filter(Boolean),
      website_documents: documents.filter(d => d.file_url),
    }, {
      onSuccess: () => toast({ title: 'Website content saved' }),
      onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: 'URL copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <BannerThemePicker entity={league} updateEntity={updateLeague} titleLabel="League" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Public Website</CardTitle>
            <Badge className={isEnabled ? (isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700') : 'bg-slate-100 text-slate-500'}>
              {isEnabled ? (isPublished ? 'Published' : 'Draft') : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable Public Website</p>
              <p className="text-xs text-slate-500">Show or hide your league's public page.</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={toggleEnabled} />
          </div>
          {isEnabled && (
            <>
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-medium text-sm">Publish Status</p>
                  <p className="text-xs text-slate-500">{isPublished ? 'Publicly accessible via shareable URL.' : 'Only visible to admins via preview.'}</p>
                </div>
                <Button variant={isPublished ? 'destructive' : 'default'} onClick={togglePublish} disabled={updateLeague.isPending}>
                  {isPublished ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
              <div className="pt-4 border-t space-y-2">
                <Label>Public URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={publicUrl} className="flex-1" />
                  <Button variant="outline" onClick={copyUrl} className="gap-1"><Copy className="h-4 w-4" /> Copy</Button>
                  <a href={`/league/${cleanSlug}?preview=true`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="gap-1"><Eye className="h-4 w-4" /> Preview</Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Website Content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL Slug</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} onBlur={() => setSlug(slugify(slug))} placeholder="my-league" />
            <p className="text-xs text-slate-400 mt-1">URL: /league/{cleanSlug}</p>
          </div>
          <div>
            <Label>Public Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your league for the public..." rows={4} />
          </div>
          <div>
            <Label>Primary Brand Color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-9 rounded border cursor-pointer" />
              <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#6D28D9" />
            </div>
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@example.com" />
          </div>
          <div>
            <Label>Event Highlights</Label>
            <div className="space-y-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={h} onChange={e => setHighlights(arr => arr.map((x, j) => j === i ? e.target.value : x))} placeholder="e.g., 6 Rounds per session" />
                  <Button variant="outline" size="icon" onClick={() => setHighlights(arr => arr.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setHighlights(arr => [...arr, ''])} className="gap-1"><Plus className="h-4 w-4" /> Add Highlight</Button>
            </div>
          </div>
          <div>
            <Label>Sponsors</Label>
            <div className="space-y-2">
              {sponsors.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s.name || ''} onChange={e => setSponsors(arr => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Sponsor name" className="flex-1" />
                  <Input value={s.logo_url || ''} onChange={e => setSponsors(arr => arr.map((x, j) => j === i ? { ...x, logo_url: e.target.value } : x))} placeholder="Logo URL" className="flex-1" />
                  <Button variant="outline" size="icon" onClick={() => setSponsors(arr => arr.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSponsors(arr => [...arr, { name: '', logo_url: '' }])} className="gap-1"><Plus className="h-4 w-4" /> Add Sponsor</Button>
            </div>
          </div>
          <div>
            <Label>Social Media Links</Label>
            <div className="space-y-2">
              <Input value={social.facebook || ''} onChange={e => setSocial(s => ({ ...s, facebook: e.target.value }))} placeholder="Facebook URL" />
              <Input value={social.twitter || ''} onChange={e => setSocial(s => ({ ...s, twitter: e.target.value }))} placeholder="Twitter / X URL" />
              <Input value={social.instagram || ''} onChange={e => setSocial(s => ({ ...s, instagram: e.target.value }))} placeholder="Instagram URL" />
              <Input value={social.website || ''} onChange={e => setSocial(s => ({ ...s, website: e.target.value }))} placeholder="Your website URL" />
            </div>
          </div>
        </CardContent>
      </Card>

      {isEnabled && (
        <EventContentManager
          aboutContent={aboutContent}
          setAboutContent={setAboutContent}
          galleryImages={galleryImages}
          setGalleryImages={setGalleryImages}
          documents={documents}
          setDocuments={setDocuments}
        />
      )}

      <Button onClick={saveContent} disabled={updateLeague.isPending} className="w-full">
        {updateLeague.isPending ? 'Saving…' : 'Save Website Content'}
      </Button>
    </div>
  );
}