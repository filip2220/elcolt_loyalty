import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Card from './Card';
import Spinner from './Spinner';
import { formatPolishCurrency } from '../utils/format';

const TotalSavingsCard: React.FC = () => {
    const { token } = useAuth();
    const [savings, setSavings] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSavings = async () => {
            if (!token) return;
            try {
                setLoading(true);
                setError(null);
                const result = await api.getTotalSavings(token);
                setSavings(result.totalSavings);
            } catch (err: any) {
                console.error("Failed to fetch total savings", err);
                setError(err.message || "Nie udało się załadować danych o oszczędnościach.");
            } finally {
                setLoading(false);
            }
        };

        fetchSavings();
    }, [token]);

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-24"><Spinner /></div>;
        }

        if (error) {
            return <p className="text-center text-red-400 py-4">{error}</p>;
        }

        return (
            <>
                <p className="text-5xl font-bold mt-2">
                    {formatPolishCurrency(savings)}
                </p>
                <p className="text-teal-300 mt-2">z kuponów i zniżek.</p>
            </>
        );
    };

    return (
        <Card className="bg-teal-800 text-white border-teal-600 text-center">
            <div className="flex justify-center items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-teal-300 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    <path d="M10 4a1 1 0 011 1v1.018a3.003 3.003 0 012.52 2.45l.23.002a2.5 2.5 0 012.25 2.499V12a1 1 0 11-2 0v-.03a.5.5 0 00-.5-.499l-.23-.002A3.003 3.003 0 0110.518 9H10a1 1 0 01-1-1V5a1 1 0 011-1zM9 11a1 1 0 011-1h.018A3.003 3.003 0 0112.47 7.55l.23-.002a2.5 2.5 0 012.25 2.499V12a1 1 0 11-2 0v-.03a.5.5 0 00-.5-.499l-.23-.002A3.003 3.003 0 018.518 9H8a1 1 0 011 1z" opacity="0.5" />
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-8a1 1 0 011-1h.018a3.003 3.003 0 012.52 2.45l.23.002a2.5 2.5 0 012.25 2.499V14a1 1 0 11-2 0v-.03a.5.5 0 00-.5-.499l-.23-.002A3.003 3.003 0 0110.518 11H10a1 1 0 01-1-1z" opacity="0.5" />
                </svg>
                <h2 className="text-lg font-semibold text-teal-200">Całkowite Oszczędności</h2>
            </div>
            {renderContent()}
        </Card>
    );
};

export default TotalSavingsCard;
