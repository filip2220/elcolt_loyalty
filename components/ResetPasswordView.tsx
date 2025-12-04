import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';
import Button from './Button';
import Spinner from './Spinner';

// Crosshairs Logo (shared with LoginView)
const Logo = () => (
    <div className="flex flex-col items-center mb-8">
        <div className="relative w-16 h-16 mb-4">
            <svg 
                viewBox="0 0 40 40" 
                className="w-full h-full text-brass-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
            >
                <circle cx="20" cy="20" r="16" className="opacity-60" />
                <circle cx="20" cy="20" r="10" className="opacity-40" />
                <circle cx="20" cy="20" r="4" className="opacity-30" />
                <line x1="20" y1="0" x2="20" y2="14" />
                <line x1="20" y1="26" x2="20" y2="40" />
                <line x1="0" y1="20" x2="14" y2="20" />
                <line x1="26" y1="20" x2="40" y2="20" />
                <circle cx="20" cy="20" r="1.5" fill="currentColor" />
            </svg>
        </div>
        
        <h1 className="font-display text-4xl font-bold tracking-wide text-cream">
            EL COLT
        </h1>
        <p className="text-stone-400 text-sm tracking-widest uppercase mt-1">
            Program Lojalnościowy
        </p>
    </div>
);

// Mountain background (shared with LoginView)
const MountainBackground = () => (
    <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-forest-900 via-slate-950 to-slate-950" />
        
        <div 
            className="absolute inset-0 opacity-30"
            style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(201, 162, 39, 0.3) 1px, transparent 0)`,
                backgroundSize: '50px 50px',
            }}
        />
        
        <svg 
            className="absolute bottom-0 w-full h-2/3 opacity-40"
            viewBox="0 0 1440 600" 
            preserveAspectRatio="xMidYMax slice"
            fill="none"
        >
            <path 
                d="M0 600V400L120 320L240 380L360 280L480 340L600 260L720 320L840 240L960 300L1080 220L1200 280L1320 200L1440 260V600H0Z"
                fill="url(#mountain-gradient-1)"
            />
            <path 
                d="M0 600V450L100 400L200 440L350 350L500 400L650 320L800 380L950 300L1100 360L1250 280L1350 340L1440 300V600H0Z"
                fill="url(#mountain-gradient-2)"
            />
            <path 
                d="M0 600V500L80 470L180 510L300 450L450 490L600 420L750 470L900 400L1050 450L1200 390L1350 440L1440 400V600H0Z"
                fill="url(#mountain-gradient-3)"
            />
            
            <defs>
                <linearGradient id="mountain-gradient-1" x1="720" y1="200" x2="720" y2="600" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#1B3A2F" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#0D0F12" />
                </linearGradient>
                <linearGradient id="mountain-gradient-2" x1="720" y1="280" x2="720" y2="600" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#152B22" stopOpacity="0.7" />
                    <stop offset="1" stopColor="#0D0F12" />
                </linearGradient>
                <linearGradient id="mountain-gradient-3" x1="720" y1="380" x2="720" y2="600" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#14171C" />
                    <stop offset="1" stopColor="#0D0F12" />
                </linearGradient>
            </defs>
        </svg>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
    </div>
);

const ResetPasswordView: React.FC = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tokenParam = params.get('token');

        if (!tokenParam) {
            setError('Nieprawidłowy link resetowania hasła.');
        } else {
            setToken(tokenParam);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError('Hasła nie są identyczne.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Hasło musi mieć co najmniej 8 znaków.');
            return;
        }

        if (!token) {
            setError('Brak tokenu resetowania hasła.');
            return;
        }

        setLoading(true);

        try {
            const result = await resetPassword(token, newPassword);
            setSuccess(result.message);

            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Wystąpił błąd podczas resetowania hasła.');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = `
        w-full py-3 px-4
        bg-slate-800/80 
        border border-slate-600/50
        rounded-sm
        text-cream placeholder-stone-500
        font-body
        transition-all duration-200
        focus:outline-none focus:border-brass-500/50 focus:ring-2 focus:ring-brass-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const labelClasses = "block text-stone-300 text-sm font-semibold mb-2 tracking-wide";

    return (
        <div className="min-h-screen relative flex flex-col justify-center items-center py-12 px-4">
            <MountainBackground />
            
            <div className="relative z-10 w-full max-w-md animate-slide-up">
                <div className="relative">
                    <div className="absolute -inset-px bg-gradient-to-b from-brass-500/20 via-transparent to-transparent rounded-sm blur-sm" />
                    
                    <div className="relative bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-sm shadow-2xl shadow-black/50 p-8">
                        <Logo />
                        
                        <h2 className="font-display text-2xl font-bold text-center text-cream mb-2 tracking-wide">
                            Resetuj Hasło
                        </h2>
                        <p className="text-center text-stone-400 mb-8">
                            Wprowadź nowe hasło do swojego konta
                        </p>

                        {error && (
                            <div className="bg-rust-600/20 border border-rust-600/50 text-rust-500 px-4 py-3 rounded-sm mb-6 flex items-start gap-3" role="alert">
                                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="bg-forest-700/30 border border-forest-600/50 px-4 py-3 rounded-sm mb-6 flex items-start gap-3" role="alert">
                                <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-forest-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <div>
                                    <p className="text-sm text-forest-400">{success}</p>
                                    <p className="text-xs text-forest-500 mt-1">Przekierowywanie do logowania...</p>
                                </div>
                            </div>
                        )}

                        {!success && token && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className={labelClasses} htmlFor="newPassword">
                                        Nowe hasło
                                    </label>
                                    <input
                                        className={inputClasses}
                                        id="newPassword"
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                        minLength={8}
                                    />
                                    <p className="text-stone-600 text-xs mt-1">Minimum 8 znaków</p>
                                </div>

                                <div>
                                    <label className={labelClasses} htmlFor="confirmPassword">
                                        Potwierdź hasło
                                    </label>
                                    <input
                                        className={inputClasses}
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                        minLength={8}
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" disabled={loading} className="w-full">
                                        {loading ? <Spinner size="sm" /> : 'Zresetuj hasło'}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {!token && !success && (
                            <div className="text-center">
                                <Button onClick={() => navigate('/')} className="w-full">
                                    Powrót do logowania
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                
                <p className="text-center text-stone-600 text-xs mt-8 tracking-wider uppercase">
                    Precyzja • Tradycja • Lojalność
                </p>
            </div>
        </div>
    );
};

export default ResetPasswordView;
