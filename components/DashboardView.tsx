import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import LevelCard from './LevelCard';
import TotalSavingsCard from './TotalSavingsCard';
import { formatPolishInteger } from '../utils/format';

const PointsCard: React.FC = () => {
    const { points } = useAuth();
    return (
        <Card className="bg-green-800 text-white border-green-600 text-center">
            <h2 className="text-lg font-semibold text-green-200">Twoje Saldo Punktów</h2>
            <p className="text-5xl font-bold mt-2">{formatPolishInteger(points)}</p>
            <p className="text-green-300 mt-2">Rób zakupy, aby zdobyć więcej!</p>
        </Card>
    );
}

const DashboardView: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-100">Witaj ponownie, {user?.name}!</h1>

            <div className="max-w-xl mx-auto pt-8 space-y-6">
                <LevelCard />
                <PointsCard />
                <TotalSavingsCard />
            </div>
        </div>
    );
};

export default DashboardView;
