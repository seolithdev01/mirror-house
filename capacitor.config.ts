import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amtocsoft.mirrorhouse',
  appName: 'Mirror House',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
