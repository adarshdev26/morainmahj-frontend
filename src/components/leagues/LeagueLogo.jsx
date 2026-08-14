import React, { useState } from 'react';
import Logo from '@/components/Logo';

/**
 * Displays a league's uploaded logo, or falls back to the default app monogram.
 *
 * @param {string} logoUrl  - Uploaded logo URL from league.logo_url
 * @param {string} name     - League name (used for alt text + fallback initial)
 * @param {number} size     - Pixel size of the logo container (default 48)
 */
export default function LeagueLogo({ logoUrl, name, size = 48 }) {
  const [imgError, setImgError] = useState(false);

  // Show fallback if no URL, or if the image previously failed to load
  if (!logoUrl || imgError) {
    return (
      <div
        className="rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Logo variant="icon" size="xs" theme="light" />
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={name ? `${name} logo` : 'League logo'}
      className="rounded-xl object-cover bg-muted shrink-0"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}