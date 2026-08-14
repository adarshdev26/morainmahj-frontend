import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import ImageUpload from '@/components/shared/ImageUpload';
import { Check, ImageIcon, Palette } from 'lucide-react';
import { BANNER_THEME_LIST } from '@/lib/banner-themes';

export default function BannerThemePicker({ entity, updateEntity, titleLabel = 'Banner' }) {
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(entity.banner_theme || 'elegant_classic');
  const [customUrl, setCustomUrl] = useState(entity.banner_custom_url || '');

  const handleSelect = (themeId) => {
    setSelectedTheme(themeId);
  };

  const handleSave = () => {
    const updates = {
      banner_theme: selectedTheme,
      banner_custom_url: selectedTheme === 'custom' ? customUrl : '',
    };
    updateEntity.mutate(updates, {
      onSuccess: () => toast({ title: 'Banner theme saved' }),
      onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Manage {titleLabel} Banner</CardTitle>
        <p className="text-sm text-muted-foreground">Choose a banner style for this {titleLabel.toLowerCase()}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BANNER_THEME_LIST.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-video group ${
                selectedTheme === theme.id ? 'border-green-500 ring-2 ring-green-500/30' : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <img src={theme.imageUrl} alt={theme.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: theme.overlay }} />
              <div className="absolute inset-0 flex flex-col justify-end p-2">
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: theme.textColor }}
                >
                  {theme.name}
                  {theme.isDefault && <span className="ml-1 opacity-60">(Default)</span>}
                </span>
              </div>
              {selectedTheme === theme.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: theme.accentColor }}
              />
            </button>
          ))}
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={() => handleSelect('custom')}
            className={`w-full rounded-xl border-2 border-dashed p-4 flex items-center justify-center gap-2 transition-all ${
              selectedTheme === 'custom' ? 'border-green-500 bg-green-50' : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
            }`}
          >
            {selectedTheme === 'custom' ? (
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
            ) : (
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">Upload Custom Banner</span>
          </button>
          {selectedTheme === 'custom' && (
            <div className="mt-3 space-y-2">
              <ImageUpload
                value={customUrl}
                onChange={setCustomUrl}
                label="Banner Image"
              />
              {customUrl && (
                <div className="relative rounded-lg overflow-hidden border aspect-video">
                  <img src={customUrl} alt="Custom banner preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Recommended size: 1920×600px. A dark overlay will be applied for text readability.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={updateEntity.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {updateEntity.isPending ? 'Saving…' : 'Save Banner'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}