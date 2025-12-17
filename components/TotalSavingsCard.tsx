import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Card from './Card';
import Spinner from './Spinner';
import { formatPolishCurrency } from '../utils/format';

// Savings/wallet icon
const SavingsIcon = React.memo(() => (
    <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Coin stack representation */}
        <ellipse cx="20" cy="28" rx="12" ry="4" className="text-olive-500 fill-current opacity-40" />
        <ellipse cx="20" cy="24" rx="12" ry="4" className="text-olive-500 fill-current opacity-50" />
        <ellipse cx="20" cy="20" rx="12" ry="4" className="text-olive-500 fill-current opacity-60" />
        <ellipse cx="20" cy="16" rx="12" ry="4" className="text-olive-400 fill-current opacity-70" />
        <ellipse cx="20" cy="12" rx="12" ry="4" className="text-olive-400 fill-current" />
        {/* Dollar sign on top coin */}
        <text x="20" y="15" textAnchor="middle" className="text-olive-600 fill-current" fontSize="8" fontWeight="bold">PLN</text>
    </svg>
));
SavingsIcon.displayName = 'SavingsIcon';

const TotalSavingsCard: React.FC = React.memo(() => {
    const { token, isAuthenticated } = useAuth();
    const [savings, setSavings] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSavings = async () => {
            if (!isAuthenticated) return;

            try {
                setLoading(true);
                setError(null);
                const authToken = token || 'cookie-auth';
                const result = await api.getTotalSavings(authToken);
                setSavings(result.totalSavings);
            } catch (err: any) {
                console.error("Failed to fetch total savings", err);
                setError(err.message || "Nie udało się załadować danych o oszczędnościach.");
            } finally {
                setLoading(false);
            }
        };

        fetchSavings();
    }, [token, isAuthenticated]);

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-24"><Spinner /></div>;
        }

        if (error) {
            return <p className="text-center text-rust-500 py-4 text-sm">{error}</p>;
        }

        return (
            <>
                <p className="font-mono text-3xl sm:text-4xl font-bold text-cream tracking-tight">
                    {formatPolishCurrency(savings)}
                </p>
                <p className="text-olive-400 mt-2 text-xs sm:text-sm">
                    zaoszczędzone z kuponów i zniżek
                </p>
            </>
        );
    };

    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-olive-600/20 via-slate-900 to-slate-900 border-olive-600/30">
            {/* Decorative pattern */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(110, 125, 64, 0.5) 10px,
                        rgba(110, 125, 64, 0.5) 11px
                    )`,
                }}
            />

            <div className="relative text-center">
                <div className="flex justify-center items-center mb-2">
                    <SavingsIcon />
                </div>
                <h2 className="font-display text-xs sm:text-sm font-semibold text-olive-400 tracking-widest uppercase mb-2 sm:mb-3">
                    Całkowite Oszczędności
                </h2>
                {renderContent()}
            </div>
        </Card>
    );
});

TotalSavingsCard.displayName = 'TotalSavingsCard';

export default TotalSavingsCard;
