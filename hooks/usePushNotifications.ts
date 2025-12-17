import { useEffect, useState, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNativePlatform, canUsePushNotifications } from '../utils/platform';

// API base URL - same as api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface PushNotificationState {
    isEnabled: boolean;
    isSupported: boolean;
    token: string | null;
    error: string | null;
    isLoading: boolean;
}

interface UsePushNotificationsReturn extends PushNotificationState {
    requestPermission: () => Promise<boolean>;
    registerToken: (authToken: string) => Promise<void>;
}

/**
 * Hook for managing push notifications
 * This hook handles:
 * - Permission requests
 * - Token registration with backend
 * - Notification listeners
 * 
 * Note: Requires Firebase setup:
 * - Android: Place google-services.json in android/app/
 * - iOS: Place GoogleService-Info.plist in ios/App/App/
 */
export const usePushNotifications = (): UsePushNotificationsReturn => {
    const [state, setState] = useState<PushNotificationState>({
        isEnabled: false,
        isSupported: canUsePushNotifications(),
        token: null,
        error: null,
        isLoading: false,
    });

    /**
     * Request push notification permission from the user
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        // Only available on native platforms
        if (!isNativePlatform()) {
            console.log('[Push] Not a native platform, skipping permission request');
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Check current permission status
            const permStatus = await PushNotifications.checkPermissions();
            console.log('[Push] Current permission status:', permStatus.receive);

            let currentStatus = permStatus.receive;

            // Request permission if not already granted
            if (currentStatus !== 'granted') {
                const result = await PushNotifications.requestPermissions();
                currentStatus = result.receive;
                console.log('[Push] Permission request result:', currentStatus);
            }

            if (currentStatus === 'granted') {
                // Register with APNS/FCM
                await PushNotifications.register();
                setState(prev => ({ ...prev, isEnabled: true, isLoading: false }));
                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    isEnabled: false,
                    isLoading: false,
                    error: currentStatus === 'denied'
                        ? 'Powiadomienia zostały zablokowane. Włącz je w ustawieniach urządzenia.'
                        : 'Nie udało się uzyskać uprawnień do powiadomień.'
                }));
                return false;
            }
        } catch (error) {
            console.error('[Push] Error requesting permission:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Wystąpił błąd podczas konfiguracji powiadomień.'
            }));
            return false;
        }
    }, []);

    /**
     * Register the device token with the backend
     */
    const registerToken = useCallback(async (authToken: string): Promise<void> => {
        if (!state.token) {
            console.log('[Push] No token to register');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/push/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: state.token,
                    platform: isNativePlatform() ?
                        (navigator.userAgent.includes('Android') ? 'android' : 'ios') : 'web'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to register push token');
            }

            console.log('[Push] Token registered successfully');
        } catch (error) {
            console.error('[Push] Error registering token:', error);
            setState(prev => ({
                ...prev,
                error: 'Nie udało się zarejestrować urządzenia dla powiadomień.'
            }));
        }
    }, [state.token]);

    // Set up push notification listeners on mount
    useEffect(() => {
        if (!isNativePlatform()) {
            console.log('[Push] Not a native platform, skipping listener setup');
            return;
        }

        console.log('[Push] Setting up push notification listeners');

        // Handle successful registration
        const registrationListener = PushNotifications.addListener(
            'registration',
            (token: Token) => {
                console.log('[Push] Registration successful, token:', token.value.substring(0, 20) + '...');
                setState(prev => ({ ...prev, token: token.value, isEnabled: true }));
            }
        );

        // Handle registration errors
        const registrationErrorListener = PushNotifications.addListener(
            'registrationError',
            (error: { error: string }) => {
                console.error('[Push] Registration error:', error);
                setState(prev => ({
                    ...prev,
                    error: 'Nie można zarejestrować urządzenia: ' + error.error
                }));
            }
        );

        // Handle notification received while app is in foreground
        const notificationReceivedListener = PushNotifications.addListener(
            'pushNotificationReceived',
            (notification: PushNotificationSchema) => {
                console.log('[Push] Notification received:', notification);
                // You could show an in-app toast/banner here
                // Or update app state based on notification content
            }
        );

        // Handle notification action (user tapped on notification)
        const notificationActionListener = PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (action: ActionPerformed) => {
                console.log('[Push] Notification action performed:', action);
                // Navigate to specific screen based on notification data
                // action.notification.data contains custom payload
            }
        );

        // Cleanup listeners on unmount
        return () => {
            registrationListener.then(l => l.remove());
            registrationErrorListener.then(l => l.remove());
            notificationReceivedListener.then(l => l.remove());
            notificationActionListener.then(l => l.remove());
        };
    }, []);

    return {
        ...state,
        requestPermission,
        registerToken,
    };
};

export default usePushNotifications;
