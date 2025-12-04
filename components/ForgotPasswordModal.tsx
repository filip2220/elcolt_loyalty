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

            // Auto-close modal after 3 seconds on success
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-100">Zapomniałeś hasła?</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                <p className="text-gray-400 mb-6">
                    Podaj swój adres email, a wyślemy Ci link do resetowania hasła.
                </p>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-4" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-4" role="alert">
                        <p>{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="reset-email">
                            Adres Email
                        </label>
                        <input
                            className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            id="reset-email"
                            type="email"
                            placeholder="twoj@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading || !!success}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 bg-gray-700 hover:bg-gray-600"
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
    );
};

export default ForgotPasswordModal;
