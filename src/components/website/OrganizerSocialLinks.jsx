import React from 'react';
import { Facebook, Twitter, Instagram, Globe } from 'lucide-react';

// Renders the organizer's (Organization) social channels as icon links.
// Falls back to event-level social links if the org has none.
export default function OrganizerSocialLinks({ organization, eventSocial, className = '' }) {
  const orgSocial = organization?.social_links || {};
  const orgWebsite = organization?.website || '';

  // Merge: org-level first, event-level as fallback per channel
  const links = {
    facebook: orgSocial.facebook || eventSocial?.facebook,
    twitter: orgSocial.twitter || eventSocial?.twitter,
    instagram: orgSocial.instagram || eventSocial?.instagram,
    website: orgWebsite || eventSocial?.website,
  };

  const items = [
    { key: 'facebook', url: links.facebook, Icon: Facebook, label: 'Facebook' },
    { key: 'twitter', url: links.twitter, Icon: Twitter, label: 'Twitter / X' },
    { key: 'instagram', url: links.instagram, Icon: Instagram, label: 'Instagram' },
    { key: 'website', url: links.website, Icon: Globe, label: 'Website' },
  ].filter(i => i.url);

  if (items.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {items.map(({ key, url, Icon, label }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}