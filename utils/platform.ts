import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for hybrid app compatibility
 * Ensures web app continues to work while mobile gets native features
 */

// Check if running as native mobile app (iOS or Android)
export const isNativePlatform = (): boolean => {
    return Capacitor.isNativePlatform();
};

// Get current platform: 'web' | 'ios' | 'android'
export const getPlatform = (): 'web' | 'ios' | 'android' => {
    return Capacitor.getPlatform() as 'web' | 'ios' | 'android';
};

// Check if a specific plugin is available
export const isPluginAvailable = (pluginName: string): boolean => {
    return Capacitor.isPluginAvailable(pluginName);
};

// Check if push notifications are available (mobile only)
export const canUsePushNotifications = (): boolean => {
    return isNativePlatform() && isPluginAvailable('PushNotifications');
};

// Check if we can control the splash screen
export const canControlSplashScreen = (): boolean => {
    return isNativePlatform() && isPluginAvailable('SplashScreen');
};

// Check if we can control the status bar
export const canControlStatusBar = (): boolean => {
    return isNativePlatform() && isPluginAvailable('StatusBar');
};

// Check if we should use native browser plugin for links
export const canUseNativeBrowser = (): boolean => {
    return isNativePlatform() && isPluginAvailable('Browser');
};

/**
 * Open a URL - uses native browser on mobile, window.open on web
 */
export const openExternalUrl = async (url: string): Promise<void> => {
    if (canUseNativeBrowser()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

/**
 * Get platform-specific info for debugging/analytics
 */
export const getPlatformInfo = () => {
    return {
        platform: getPlatform(),
        isNative: isNativePlatform(),
        plugins: {
            pushNotifications: canUsePushNotifications(),
            splashScreen: canControlSplashScreen(),
            statusBar: canControlStatusBar(),
            browser: canUseNativeBrowser()
        }
    };
};
