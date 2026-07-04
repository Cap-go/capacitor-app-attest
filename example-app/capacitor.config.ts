import type { CapacitorConfig } from '@capacitor/cli';

import pkg from './package.json';

const config: CapacitorConfig = {
  appId: 'app.capgo.app.attest',
  appName: '@capgo/capacitor-app-attest',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
    AppAttest: {
      cloudProjectNumber: '123456789012',
    },
    CapacitorUpdater: {
      appId: 'app.capgo.app.attest',
      autoUpdate: true,
      autoSplashscreen: true,
      directUpdate: 'always',
      version: pkg.version,
    },
  },
};

export default config;
