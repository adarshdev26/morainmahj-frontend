import { useEffect, useState } from 'react';

/**
 * Hosted HTTPS bridge after Stripe Checkout on mobile.
 * Stripe requires https:// success URLs; this page immediately deep-links back into the app.
 */
export default function MobilePaymentReturn() {
  const [redirectPath, setRedirectPath] = useState('/app');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = params.get('redirect_url') || '/app';
    setRedirectPath(path);

    const deepLink = `morainmahj://?redirect_url=${encodeURIComponent(path)}`;
    window.location.href = deepLink;

    const timer = setTimeout(() => setShowManual(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const openApp = () => {
    const deepLink = `morainmahj://?redirect_url=${encodeURIComponent(redirectPath)}`;
    window.location.href = deepLink;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#1e2d4d',
        fontFamily: 'Georgia, serif',
        color: '#c5a95a',
        fontSize: '1.1rem',
        textAlign: 'center',
        padding: '24px',
        gap: '16px',
      }}
    >
      <p>{showManual ? 'Payment complete.' : 'Returning to Morain Mahj…'}</p>
      {showManual && (
        <button
          type="button"
          onClick={openApp}
          style={{
            background: '#c5a95a',
            color: '#1e2d4d',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Open Morain Mahj
        </button>
      )}
    </div>
  );
}
