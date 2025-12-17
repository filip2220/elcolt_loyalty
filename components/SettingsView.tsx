import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import Button from './Button';
import Spinner from './Spinner';
import { openExternalUrl, isNativePlatform } from '../utils/platform';
import { usePushNotifications } from '../hooks/usePushNotifications';
import * as api from '../services/api';

// Legal URLs - replace with actual URLs when ready
const PRIVACY_POLICY_URL = 'https://elcolt.pl/polityka-prywatnosci';
const TERMS_OF_SERVICE_URL = 'https://elcolt.pl/regulamin';

// App version - update for each release
const APP_VERSION = '1.0.0';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting
}) => {
    const [confirmText, setConfirmText] = useState('');
    const canConfirm = confirmText.toLowerCase() === 'usuń konto';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-850 rounded-xl border border-slate-700 p-6 max-w-md w-full shadow-2xl animate-fade-in">
                <h3 className="text-xl font-display font-bold text-cream mb-4">
                    ⚠️ Usuń Konto
                </h3>

                <div className="space-y-4 text-stone-300">
                    <p>
                        Czy na pewno chcesz usunąć swoje konto? Ta operacja jest <span className="text-rust-500 font-semibold">nieodwracalna</span>.
                    </p>

                    <div className="bg-rust-600/20 border border-rust-600/40 rounded-lg p-4">
                        <p className="text-sm text-rust-500 font-medium">
                            Usunięte zostaną:
                        </p>
                        <ul className="text-sm text-stone-400 mt-2 space-y-1">
                            <li>• Twój profil i dane osobowe</li>
                            <li>• Wszystkie punkty lojalnościowe</li>
                            <li>• Historia aktywności</li>
                            <li>• Zrealizowane nagrody</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm text-stone-400 mb-2">
                            Wpisz <span className="font-mono text-brass-400">usuń konto</span> aby potwierdzić:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="usuń konto"
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-cream placeholder-slate-500 focus:outline-none focus:border-brass-500"
                            disabled={isDeleting}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1"
                        disabled={isDeleting}
                    >
                        Anuluj
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="primary"
                        className="flex-1 !bg-rust-600 hover:!bg-rust-500"
                        disabled={!canConfirm || isDeleting}
                    >
                        {isDeleting ? <Spinner size="sm" /> : 'Usuń Konto'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const SettingsView: React.FC = () => {
    const { user, token, logout, isAuthenticated } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Push notifications hook
    const push = usePushNotifications();

    // Register push token when it becomes available
    useEffect(() => {
        if (push.token && isAuthenticated) {
            const authToken = token || 'cookie-auth';
            push.registerToken(authToken);
        }
    }, [push.token, token, isAuthenticated, push.registerToken]);

    const handleOpenLink = async (url: string) => {
        await openExternalUrl(url);
    };

    const handleTogglePush = async () => {
        if (!push.isEnabled) {
            // Request permission
            const granted = await push.requestPermission();
            if (granted && isAuthenticated && push.token) {
                const authToken = token || 'cookie-auth';
                await push.registerToken(authToken);
            }
        }
        // Note: Disabling push requires going to device settings on most platforms
    };

    const handleDeleteAccount = async () => {
        if (!isAuthenticated) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const authToken = token || 'cookie-auth';
            await api.deleteAccount(authToken);
            // Account deleted successfully - log out
            logout();
        } catch (error) {
            console.error('Delete account error:', error);
            setDeleteError(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania konta');
            setIsDeleting(false);
        }
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-cream tracking-wide">
                        Ustawienia
                    </h1>
                    <p className="text-stone-400 mt-1">
                        Zarządzaj swoim kontem i preferencjami
                    </p>
                </div>
            </div>

            {/* Profile Section */}
            <Card className="p-6">
                <h2 className="text-lg font-display font-semibold text-cream mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brass-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profil
                </h2>

                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-stone-400">Imię i nazwisko</span>
                        <span className="text-cream font-medium">{user?.name || 'Nieznane'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-stone-400">Email</span>
                        <span className="text-cream font-medium">{user?.email || 'Nieznany'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-stone-400">ID użytkownika</span>
                        <span className="text-stone-500 font-mono text-sm">#{user?.id}</span>
                    </div>
                </div>
            </Card>

            {/* Push Notifications - Only show on mobile */}
            {push.isSupported && (
                <Card className="p-6">
                    <h2 className="text-lg font-display font-semibold text-cream mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-brass-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Powiadomienia
                    </h2>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-cream">Powiadomienia push</p>
                                <p className="text-sm text-stone-400">Otrzymuj informacje o promocjach i nagrodach</p>
                            </div>
                            <button
                                onClick={handleTogglePush}
                                disabled={push.isLoading}
                                className={`relative w-12 h-6 rounded-full transition-colors ${push.isEnabled ? 'bg-brass-500' : 'bg-slate-700'
                                    } ${push.isLoading ? 'opacity-50' : ''}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${push.isEnabled ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {push.error && (
                            <p className="text-rust-400 text-sm">{push.error}</p>
                        )}

                        {push.isEnabled && (
                            <p className="text-green-400 text-sm flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                Powiadomienia włączone
                            </p>
                        )}
                    </div>
                </Card>
            )}

            {/* Legal Section */}
            <Card className="p-6">
                <h2 className="text-lg font-display font-semibold text-cream mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brass-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Informacje Prawne
                </h2>

                <div className="space-y-2">
                    <button
                        onClick={() => handleOpenLink(PRIVACY_POLICY_URL)}
                        className="w-full flex justify-between items-center py-3 px-4 bg-slate-800 hover:bg-slate-750 rounded-lg transition-colors group"
                    >
                        <span className="text-cream">Polityka Prywatności</span>
                        <svg className="w-5 h-5 text-stone-500 group-hover:text-brass-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>

                    <button
                        onClick={() => handleOpenLink(TERMS_OF_SERVICE_URL)}
                        className="w-full flex justify-between items-center py-3 px-4 bg-slate-800 hover:bg-slate-750 rounded-lg transition-colors group"
                    >
                        <span className="text-cream">Regulamin</span>
                        <svg className="w-5 h-5 text-stone-500 group-hover:text-brass-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                </div>
            </Card>

            {/* About Section */}
            <Card className="p-6">
                <h2 className="text-lg font-display font-semibold text-cream mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brass-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    O Aplikacji
                </h2>

                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-stone-400">Wersja aplikacji</span>
                        <span className="text-cream font-mono">{APP_VERSION}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-stone-400">Platforma</span>
                        <span className="text-cream capitalize">
                            {isNativePlatform() ? (
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Aplikacja mobilna
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Przeglądarka
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-stone-400">Kontakt</span>
                        <button
                            onClick={() => handleOpenLink('mailto:kontakt@elcolt.pl')}
                            className="text-brass-400 hover:text-brass-300 transition-colors"
                        >
                            kontakt@elcolt.pl
                        </button>
                    </div>
                </div>
            </Card>

            {/* Actions Section */}
            <Card className="p-6">
                <h2 className="text-lg font-display font-semibold text-cream mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brass-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Konto
                </h2>

                <div className="space-y-3">
                    {/* Logout Button */}
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full justify-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Wyloguj się
                    </Button>

                    {/* Delete Account Button */}
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-rust-500 hover:text-rust-400 hover:bg-rust-600/10 rounded-lg transition-colors text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Usuń konto
                    </button>

                    {deleteError && (
                        <p className="text-rust-500 text-sm text-center mt-2">{deleteError}</p>
                    )}
                </div>
            </Card>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default SettingsView;
