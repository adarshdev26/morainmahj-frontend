import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Loader2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';

/**
 * GetDirectionsButton — requests device location, then opens Apple Maps (iOS) or
 * Google Maps with turn-by-turn directions to the given address.
 */
export default function GetDirectionsButton({ address, className = '' }) {
  const [loading, setLoading] = useState(false);

  if (!address) return null;

  const openDirections = (origin) => {
    const dest = encodeURIComponent(address);
    // Use window.location.href so iOS opens the native Maps app directly
    // instead of launching an external browser window.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const from = origin ? `&saddr=${origin.lat},${origin.lng}` : '';
      window.location.href = `https://maps.apple.com/?daddr=${dest}${from}&dirflg=d`;
    } else {
      const from = origin ? `${origin.lat},${origin.lng}` : '';
      const originParam = from ? `&origin=${from}` : '';
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}${originParam}`;
    }
  };

  const handlePress = () => {
    haptics.light();
    if (!navigator.geolocation) {
      openDirections(null);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        openDirections({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLoading(false);
        openDirections(null); // permission denied — still open Maps without origin
      },
      { timeout: 5000 }
    );
  };

  return (
    <Button
      variant="outline"
      className={className}
      onClick={handlePress}
      disabled={loading}
    >
      {loading
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Locating…</>
        : <><Navigation className="h-4 w-4 mr-2" /> Get Directions</>
      }
    </Button>
  );
}