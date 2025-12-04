import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import { OrderActivity } from '../types';
import Card from './Card';
import Spinner from './Spinner';
import { formatPolishDate, formatPolishCurrency } from '../utils/format';

const ActivityItem: React.FC<{ item: OrderActivity }> = ({ item }) => {
    const date = new Date(item.date_created);
    const formattedDate = formatPolishDate(date);

    return (
        <li className="flex justify-between items-center py-3">
            <div>
                <p className="font-semibold text-gray-200">{item.product_name}</p>
                <p className="text-sm text-gray-400">
                    {formattedDate} &bull; Ilość: {item.product_qty}
                </p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-green-500">
                    {formatPolishCurrency(item.product_gross_revenue)}
                </p>
            </div>
        </li>
    );
};

const ActivityCard: React.FC = () => {
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
            return <div className="flex justify-center items-center h-40"><Spinner /></div>;
        }

        if (error) {
            return <p className="text-center text-red-400 py-4">{error}</p>;
        }

        if (activity.length === 0) {
            return <p className="text-center text-gray-400 py-4">Nie znaleziono ostatnich zakupów.</p>;
        }

        return (
            <ul className="divide-y divide-gray-800">
                {activity.map((item) => (
                    <ActivityItem key={item.order_item_id} item={item} />
                ))}
            </ul>
        );
    };

    return (
        <Card>
            <h2 className="text-lg font-semibold text-gray-200 mb-4 border-b border-gray-700 pb-3">Ostatnia Aktywność</h2>
            {renderContent()}
        </Card>
    );
};

export default ActivityCard;
