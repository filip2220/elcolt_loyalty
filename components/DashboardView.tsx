import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import LevelCard from './LevelCard';
import TotalSavingsCard from './TotalSavingsCard';
import { formatPolishInteger } from '../utils/format';

// Compass icon for points
const CompassIcon = React.memo(() => (
    <svg className="w-12 h-12 text-forest-500" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="24" r="20" className="opacity-40" />
        <circle cx="24" cy="24" r="14" className="opacity-30" />
        <path d="M24 4v8M24 36v8M4 24h8M36 24h8" strokeLinecap="round" />
        <path d="M24 16l4 8-4 4-4-4 4-8z" fill="currentColor" className="opacity-60" />
        <path d="M24 32l-4-8 4-4 4 4-4 8z" fill="currentColor" className="opacity-30" />
    </svg>
));
CompassIcon.displayName = 'CompassIcon';

const PointsCard: React.FC = React.memo(() => {
    const { points } = useAuth();
    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 border-forest-600/50">
            {/* Decorative pattern */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0v40M0 20h40' stroke='%23fff' stroke-opacity='0.3' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative text-center">
                <div className="flex justify-center mb-2">
                    <CompassIcon />
                </div>
                <h2 className="font-display text-base sm:text-lg font-semibold text-forest-200 tracking-wide uppercase">
                    Twoje Saldo Punktów
                </h2>
                <p className="font-mono text-4xl sm:text-5xl font-bold mt-2 sm:mt-3 text-cream tracking-tight">
                    {formatPolishInteger(points)}
                </p>
                <p className="text-forest-300 mt-2 sm:mt-3 text-sm">
                    Rób zakupy, aby zdobyć więcej!
                </p>
            </div>
        </Card>
    );
});
PointsCard.displayName = 'PointsCard';

// Welcome banner with user greeting
const WelcomeBanner: React.FC<{ userName: string }> = React.memo(({ userName }) => (
    <div className="relative overflow-hidden rounded-sm bg-gradient-to-r from-slate-850 via-slate-900 to-slate-850 border border-slate-700/30 p-4 sm:p-6 mb-6 sm:mb-8">
        {/* Decorative element */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brass-500/5 to-transparent" />

        <div className="relative flex items-center justify-between">
            <div>
                <p className="text-stone-500 text-xs sm:text-sm uppercase tracking-wider mb-1">Witaj ponownie</p>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-cream tracking-wide">
                    {userName}
                </h1>
            </div>

            {/* Decorative badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-sm px-4 py-2">
                <svg className="w-5 h-5 text-brass-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
                </svg>
                <span className="text-stone-400 text-sm font-medium">Członek programu</span>
            </div>
        </div>
    </div>
));
WelcomeBanner.displayName = 'WelcomeBanner';

const DashboardView: React.FC = React.memo(() => {
    const { user } = useAuth();

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <WelcomeBanner userName={user?.name || 'Użytkownik'} />

            <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
                <div className="stagger-1 animate-slide-up">
                    <LevelCard />
                </div>
                <div className="stagger-2 animate-slide-up">
                    <PointsCard />
                </div>
                <div className="stagger-3 animate-slide-up">
                    <TotalSavingsCard />
                </div>
            </div>
        </div>
    );
});
DashboardView.displayName = 'DashboardView';

export default DashboardView;

