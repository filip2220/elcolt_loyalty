import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elcolt.loyalty',
  appName: 'El Colt Loyalty',
  webDir: 'dist',

  // Use HTTPS scheme for better security
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },

  // Plugin configurations
  plugins: {
    // Splash screen with El Colt branding
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0D0F12', // slate-950 from our theme
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },

    // Status bar configuration
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0D0F12' // Match app background
    },

    // Push notification presentation options
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
