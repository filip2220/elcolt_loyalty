import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import { OrderActivity } from '../types';
import Card from './Card';
import Spinner from './Spinner';
import { formatPolishDate, formatPolishCurrency } from '../utils/format';

const ActivityItem: React.FC<{ item: OrderActivity; index: number }> = ({ item, index }) => {
    const date = new Date(item.date_created);
    const formattedDate = formatPolishDate(date);

    return (
        <li 
            className={`
                flex justify-between items-center py-4 px-4 -mx-4
                transition-colors duration-200
                hover:bg-slate-800/50
                ${index !== 0 ? 'border-t border-slate-800/50' : ''}
            `}
        >
            <div className="flex items-start gap-4">
                {/* Item icon */}
                <div className="w-10 h-10 rounded-sm bg-forest-700/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-forest-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                
                <div>
                    <p className="font-semibold text-cream">{item.product_name}</p>
                    <p className="text-sm text-stone-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formattedDate}
                        </span>
                        <span className="mx-2 text-slate-700">•</span>
                        <span>Ilość: {item.product_qty}</span>
                    </p>
                </div>
            </div>
            
            <div className="text-right">
                <p className="font-mono font-semibold text-forest-500 text-lg">
                    {formatPolishCurrency(item.product_gross_revenue)}
                </p>
            </div>
        </li>
    );
};

const ActivityView: React.FC = () => {
    const { token } = useAuth();
    const [activity, setActivity] = useState<OrderActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!token) return;
            try {
                setLoading(true);
                setError(null);
                const userActivity = await api.getUserActivity(token);
                setActivity(userActivity);
            } catch (err: any) {
                console.error("Failed to fetch activity", err);
                setError(err.message || "Nie udało się załadować ostatniej aktywności.");
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [token]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col justify-center items-center h-40 gap-3">
                    <Spinner />
                    <p className="text-stone-500 text-sm">Ładowanie aktywności...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-12 h-12 rounded-full bg-rust-600/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-rust-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-rust-500 text-sm">{error}</p>
                </div>
            );
        }

        if (activity.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <p className="text-stone-500">Nie znaleziono ostatnich zakupów</p>
                    <p className="text-stone-600 text-sm">Twoje zakupy pojawią się tutaj</p>
                </div>
            );
        }

        return (
            <ul>
                {activity.map((item, index) => (
                    <ActivityItem key={item.order_item_id} item={item} index={index} />
                ))}
            </ul>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl font-bold text-cream tracking-wide">
                    Historia Zakupów
                </h1>
                <p className="text-stone-500 mt-1">Twoje ostatnie transakcje</p>
            </div>
            
            {/* Activity summary if we have data */}
            {!loading && !error && activity.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-850 border border-slate-700/30 rounded-sm p-4">
                        <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Liczba zakupów</p>
                        <p className="font-mono text-2xl font-bold text-cream">{activity.length}</p>
                    </div>
                    <div className="bg-slate-850 border border-slate-700/30 rounded-sm p-4">
                        <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Łączna wartość</p>
                        <p className="font-mono text-2xl font-bold text-forest-500">
                            {formatPolishCurrency(activity.reduce((sum, item) => sum + item.product_gross_revenue, 0))}
                        </p>
                    </div>
                </div>
            )}
            
            {/* Activity list */}
            <Card>
                {renderContent()}
            </Card>
        </div>
    );
};

export default ActivityView;
