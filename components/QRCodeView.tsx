import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Card from './Card';
import Spinner from './Spinner';

// QR Code icon for the header
const QRHeaderIcon = () => (
    <svg className="w-12 h-12 text-brass-500" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Outer frame */}
        <rect x="4" y="4" width="14" height="14" rx="2" className="opacity-60" />
        <rect x="30" y="4" width="14" height="14" rx="2" className="opacity-60" />
        <rect x="4" y="30" width="14" height="14" rx="2" className="opacity-60" />
        {/* Inner squares */}
        <rect x="8" y="8" width="6" height="6" fill="currentColor" className="opacity-80" />
        <rect x="34" y="8" width="6" height="6" fill="currentColor" className="opacity-80" />
        <rect x="8" y="34" width="6" height="6" fill="currentColor" className="opacity-80" />
        {/* Data pattern */}
        <rect x="22" y="4" width="4" height="4" fill="currentColor" className="opacity-40" />
        <rect x="22" y="12" width="4" height="4" fill="currentColor" className="opacity-40" />
        <rect x="22" y="22" width="4" height="4" fill="currentColor" className="opacity-60" />
        <rect x="30" y="22" width="4" height="4" fill="currentColor" className="opacity-40" />
        <rect x="40" y="22" width="4" height="4" fill="currentColor" className="opacity-40" />
        <rect x="22" y="30" width="4" height="4" fill="currentColor" className="opacity-40" />
        <rect x="30" y="30" width="14" height="14" rx="2" className="opacity-40" />
    </svg>
);

// Phone icon
const PhoneIcon = () => (
    <svg className="w-5 h-5 text-brass-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);

// User icon
const UserIcon = () => (
    <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

// Warning icon for missing phone
const WarningIcon = () => (
    <svg className="w-16 h-16 text-amber-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

/**
 * Formats a phone number for display
 * @param phone - Raw phone number string
 * @returns Formatted phone number string
 */
const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Handle Polish numbers
    if (digits.length === 9) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('48')) {
        return `+48 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    if (digits.length === 12 && digits.startsWith('48')) {
        return `+48 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }

    // Return original if can't format
    return phone;
};

/**
 * Cleans phone number for QR code generation
 * Removes country code (+48 or 48) and non-digits to get raw 9-digit number
 */
const cleanPhoneNumberForQR = (phone: string): string => {
    // Remove all non-digit characters first
    let cleaned = phone.replace(/\D/g, '');

    // Check for Polish country code prefix (48)
    // Common length with country code is 11 digits (48 + 9 digits)
    if (cleaned.length === 11 && cleaned.startsWith('48')) {
        return cleaned.substring(2);
    }

    return cleaned;
};

const QRCodeView: React.FC = () => {
    const { token, isAuthenticated } = useAuth();
    const [qrData, setQrData] = useState<{ name: string; phone: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQRData = async () => {
            if (!isAuthenticated) return;
            try {
                setLoading(true);
                setError(null);
                const authToken = token || 'cookie-auth';
                const data = await api.getQRCodeData(authToken);
                setQrData(data);
            } catch (err: any) {
                setError(err.message || 'Nie udało się załadować danych.');
            } finally {
                setLoading(false);
            }
        };
        fetchQRData();
    }, [token, isAuthenticated]);

    // Loading state
    if (loading) {
        return (
            <div className="animate-fade-in">
                <div className="max-w-md mx-auto">
                    <Card className="flex flex-col items-center justify-center min-h-[400px]">
                        <Spinner size="lg" />
                        <p className="mt-4 text-stone-500 text-sm">Ładowanie kodu QR...</p>
                    </Card>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="animate-fade-in">
                <div className="max-w-md mx-auto">
                    <Card className="text-center">
                        <div className="flex justify-center mb-4">
                            <WarningIcon />
                        </div>
                        <h2 className="font-display text-xl font-semibold text-cream mb-2">
                            Błąd
                        </h2>
                        <p className="text-stone-400 mb-6">
                            {error}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-brass-500 hover:bg-brass-400 text-slate-900 font-semibold rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brass-500/50"
                        >
                            Spróbuj ponownie
                        </button>
                    </Card>
                </div>
            </div>
        );
    }

    // No phone number state
    if (!qrData?.phone) {
        return (
            <div className="animate-fade-in">
                <div className="max-w-md mx-auto">
                    <Card className="text-center">
                        <div className="flex justify-center mb-4">
                            <WarningIcon />
                        </div>
                        <h2 className="font-display text-xl font-semibold text-cream mb-2">
                            Brak numeru telefonu
                        </h2>
                        <p className="text-stone-400 mb-4">
                            Numer telefonu nie jest przypisany do Twojego konta.
                        </p>
                        <p className="text-stone-500 text-sm">
                            Aby wygenerować kod QR, zaktualizuj swój numer telefonu w ustawieniach konta.
                        </p>
                    </Card>
                </div>
            </div>
        );
    }

    // Success state - show QR code
    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="text-center mb-6 sm:mb-8">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-cream tracking-wide">
                    Twój Kod QR
                </h1>
                <p className="text-stone-500 text-sm mt-2">
                    Zeskanuj przy kasie aby zdobyć punkty
                </p>
            </div>

            <div className="max-w-md mx-auto">
                {/* Main QR Code Card */}
                <Card
                    className="relative overflow-hidden bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 border-forest-600/50 animate-slide-up"
                >
                    {/* Decorative pattern */}
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0v40M0 20h40' stroke='%23fff' stroke-opacity='0.3' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
                        }}
                    />

                    <div className="relative">
                        {/* Icon and title */}
                        <div className="flex justify-center mb-4">
                            <QRHeaderIcon />
                        </div>

                        {/* QR Code container */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                {/* Outer glow effect */}
                                <div className="absolute -inset-2 bg-brass-500/20 rounded-lg blur-md" />

                                {/* QR Code wrapper with white background */}
                                <div className="relative bg-cream rounded-lg p-4 sm:p-6 border-2 border-brass-500/40 shadow-2xl shadow-black/30">
                                    <QRCodeSVG
                                        value={cleanPhoneNumberForQR(qrData.phone)}
                                        size={200}
                                        level="H"
                                        bgColor="#F5F0E6"
                                        fgColor="#0f172a"
                                        includeMargin={false}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* User info section */}
                        <div className="space-y-3 text-center">
                            {/* Name */}
                            <div className="flex items-center justify-center gap-2">
                                <UserIcon />
                                <span className="font-display text-lg font-semibold text-cream">
                                    {qrData.name}
                                </span>
                            </div>

                            {/* Phone number - shows cleaned 9-digit number matching QR code */}
                            <div className="flex items-center justify-center gap-2 bg-slate-900/40 rounded-sm px-4 py-2 mx-auto w-fit border border-slate-700/50">
                                <PhoneIcon />
                                <span className="font-mono text-2xl text-brass-400 tracking-widest">
                                    {cleanPhoneNumberForQR(qrData.phone)}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Instructions Card */}
                <Card className="mt-4 sm:mt-6 animate-slide-up stagger-1">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-brass-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-display text-sm font-semibold text-cream uppercase tracking-wide mb-1">
                                Jak używać
                            </h3>
                            <p className="text-stone-400 text-sm leading-relaxed">
                                Pokaż ten kod pracownikowi przy kasie, aby zdobyć punkty lojalnościowe za zakupy.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Scan quality tip */}
                <div className="mt-4 text-center">
                    <p className="text-stone-600 text-xs">
                        Upewnij się, że ekran jest jasny dla łatwiejszego skanowania
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRCodeView;
