import React, { useState } from 'react';
import { forgotPassword } from '../services/api';
import Button from './Button';
import Spinner from './Spinner';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const result = await forgotPassword(email);
            setSuccess(result.message);
            setEmail('');

            setTimeout(() => {
                onClose();
                setSuccess(null);
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Wystąpił błąd podczas wysyłania emaila.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setError(null);
        setSuccess(null);
        onClose();
    };

    if (!isOpen) return null;

    const inputClasses = `
        w-full py-3 px-4
        bg-slate-800/80 
        border border-slate-600/50
        rounded-sm
        text-cream placeholder-stone-500
        font-body text-base
        transition-all duration-200
        focus:outline-none focus:border-brass-500/50 focus:ring-2 focus:ring-brass-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
            <div className="relative w-full sm:max-w-md animate-slide-up">
                {/* Glow effect - only on desktop */}
                <div className="hidden sm:block absolute -inset-px bg-gradient-to-b from-brass-500/20 via-transparent to-transparent rounded-sm blur-sm" />
                
                {/* Modal content */}
                <div className="relative bg-slate-900/95 backdrop-blur-sm border-t sm:border border-slate-700/50 rounded-t-xl sm:rounded-sm shadow-2xl shadow-black/50 p-5 sm:p-6">
                    {/* Mobile drag handle */}
                    <div className="sm:hidden w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
                    
                    <div className="flex justify-between items-start mb-5 sm:mb-6">
                        <div>
                            <h2 className="font-display text-xl sm:text-2xl font-bold text-cream tracking-wide">
                                Resetuj Hasło
                            </h2>
                            <p className="text-stone-500 text-sm mt-1">
                                Wyślemy Ci link do resetowania
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-stone-500 hover:text-cream active:text-cream transition-colors p-2 -mr-2 -mt-2"
                            disabled={loading}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="bg-rust-600/20 border border-rust-600/50 text-rust-500 px-4 py-3 rounded-sm mb-4 flex items-start gap-3" role="alert">
                            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-forest-700/30 border border-forest-600/50 text-forest-500 px-4 py-3 rounded-sm mb-4 flex items-start gap-3" role="alert">
                            <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-forest-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-sm">{success}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5 sm:mb-6">
                            <label className="block text-stone-300 text-sm font-semibold mb-2 tracking-wide" htmlFor="reset-email">
                                Adres Email
                            </label>
                            <input
                                className={inputClasses}
                                id="reset-email"
                                type="email"
                                placeholder="twoj@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading || !!success}
                                inputMode="email"
                                autoComplete="email"
                            />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            <Button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                variant="ghost"
                                className="flex-1"
                            >
                                Anuluj
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !!success}
                                className="flex-1"
                            >
                                {loading ? <Spinner size="sm" /> : 'Wyślij link'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
