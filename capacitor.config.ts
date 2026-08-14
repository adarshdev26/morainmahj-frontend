import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Do not change appId — it is the existing App Store / Play Store identity.
  appId: 'com.base69de6b05c2b11218fcffdf31.app',
  appName: 'Morain Mahj',
  webDir: 'dist',
  server: {
    allowNavigation: [
      'morainmahj.com',
      '*.morainmahj.com',
      // OAuth providers (if used later)
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
    ],
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#1e2d4d',
      showSpinner: false,
    },
  },
};

export default config;
