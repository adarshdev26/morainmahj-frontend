import { useEffect, useState } from 'react';

export default function MobileAuthReturn() {
  const [status, setStatus] = useState('redirecting');

  useEffect(() => {
    // Extract access_token and redirect_url from query string or hash
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const token = params.get('access_token') || hash.get('access_token');
    const redirectUrl = params.get('redirect_url') || hash.get('redirect_url') || '/app';

    if (token) {
      // Build morainmahj:// deep link so native app opens and gets the token
      const deepLink =
        'morainmahj://?access_token=' +
        encodeURIComponent(token) +
        '&redirect_url=' +
        encodeURIComponent(redirectUrl);
      window.location.href = deepLink;
    } else {
      setStatus('incomplete');
    }
  }, []);

  if (status === 'incomplete') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#1e2d4d',
          fontFamily: 'Georgia, serif',
          color: '#c5a95a',
          fontSize: '1.1rem',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        Sign-in incomplete. Please return to the app and try again.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#1e2d4d',
        fontFamily: 'Georgia, serif',
        color: '#c5a95a',
        fontSize: '1.1rem',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      Signing you in…
    </div>
  );
}