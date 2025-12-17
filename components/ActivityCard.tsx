import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import { OrderActivity } from '../types';
import Card from './Card';
import Spinner from './Spinner';
import { formatPolishDate, formatPolishCurrency } from '../utils/format';

const ActivityItem: React.FC<{ item: OrderActivity; isLast: boolean }> = React.memo(({ item, isLast }) => {
    const date = new Date(item.date_created);
    const formattedDate = formatPolishDate(date);

    return (
        <li className={`
            flex justify-between items-center py-3
            ${!isLast ? 'border-b border-slate-800/50' : ''}
        `}>
            <div>
                <p className="font-semibold text-cream">{item.product_name}</p>
                <p className="text-sm text-stone-500 mt-0.5">
                    {formattedDate} • Ilość: {item.product_qty}
                </p>
            </div>
            <div className="text-right">
                <p className="font-mono font-semibold text-forest-500">
                    {formatPolishCurrency(item.product_gross_revenue)}
                </p>
            </div>
        </li>
    );
});

ActivityItem.displayName = 'ActivityItem';

const ActivityCard: React.FC = () => {
    const { token, isAuthenticated } = useAuth();
    const [activity, setActivity] = useState<OrderActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!isAuthenticated) return;
            try {
                setLoading(true);
                setError(null);
                const authToken = token || 'cookie-auth';
                const userActivity = await api.getUserActivity(authToken);
                setActivity(userActivity);
            } catch (err: any) {
                console.error("Failed to fetch activity", err);
                setError(err.message || "Nie udało się załadować ostatniej aktywności.");
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [token, isAuthenticated]);

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-40"><Spinner /></div>;
        }

        if (error) {
            return <p className="text-center text-rust-500 py-4 text-sm">{error}</p>;
        }

        if (activity.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <svg className="w-10 h-10 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-stone-500 text-sm">Nie znaleziono ostatnich zakupów</p>
                </div>
            );
        }

        return (
            <ul>
                {activity.map((item, index) => (
                    <ActivityItem
                        key={item.order_item_id}
                        item={item}
                        isLast={index === activity.length - 1}
                    />
                ))}
            </ul>
        );
    };

    return (
        <Card>
            <h2 className="font-display text-lg font-semibold text-cream tracking-wide mb-4 pb-3 border-b border-slate-800/50">
                Ostatnia Aktywność
            </h2>
            {renderContent()}
        </Card>
    );
};

export default ActivityCard;
