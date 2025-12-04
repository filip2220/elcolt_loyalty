import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';
import Button from './Button';
import Spinner from './Spinner';

const ResetPasswordView: React.FC = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        // Extract token from URL query parameters
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

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('Hasła nie są identyczne.');
            return;
        }

        // Validate password strength
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

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Wystąpił błąd podczas resetowania hasła.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 flex flex-col justify-center items-center py-12 px-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg shadow-md p-8">
                <h1 className="text-3xl font-bold text-center text-gray-100 mb-2">
                    Resetuj hasło
                </h1>
                <p className="text-center text-gray-400 mb-8">
                    Wprowadź nowe hasło do swojego konta
                </p>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-4" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-4" role="alert">
                        <p>{success}</p>
                        <p className="text-sm mt-2">Przekierowywanie do logowania...</p>
                    </div>
                )}

                {!success && token && (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="newPassword">
                                Nowe hasło
                            </label>
                            <input
                                className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                id="newPassword"
                                type="password"
                                placeholder="******************"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={loading}
                                minLength={8}
                            />
                            <p className="text-gray-500 text-xs mt-1">Minimum 8 znaków</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
                                Potwierdź hasło
                            </label>
                            <input
                                className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                id="confirmPassword"
                                type="password"
                                placeholder="******************"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                minLength={8}
                            />
                        </div>

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Spinner size="sm" /> : 'Zresetuj hasło'}
                        </Button>
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
    );
};

export default ResetPasswordView;
