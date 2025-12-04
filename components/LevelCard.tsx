import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import * as api from '../services/api';
import { LevelDetails } from '../types';
import Spinner from './Spinner';
import { formatPolishInteger } from '../utils/format';

// Hunting rank icons
const RankBadge: React.FC<{ levelName: string }> = ({ levelName }) => {
    // Determine badge style based on level name
    const getBadgeColors = () => {
        const name = levelName.toLowerCase();
        if (name.includes('elite') || name.includes('elita') || name.includes('diament')) {
            return { ring: 'text-brass-400', fill: 'text-brass-500', glow: 'shadow-brass-500/30' };
        }
        if (name.includes('gold') || name.includes('złot') || name.includes('expert')) {
            return { ring: 'text-amber-500', fill: 'text-amber-600', glow: 'shadow-amber-500/30' };
        }
        if (name.includes('silver') || name.includes('srebrn') || name.includes('marksman')) {
            return { ring: 'text-stone-300', fill: 'text-stone-400', glow: 'shadow-stone-400/20' };
        }
        return { ring: 'text-olive-400', fill: 'text-olive-500', glow: 'shadow-olive-500/20' };
    };

    const colors = getBadgeColors();

    return (
        <div className={`relative w-16 h-16 ${colors.glow} shadow-lg rounded-full`}>
            <svg viewBox="0 0 64 64" className="w-full h-full">
                {/* Outer ring */}
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" className={`${colors.ring} opacity-60`} />
                <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="1" className={`${colors.ring} opacity-30`} />
                
                {/* Antler/trophy design */}
                <g className={colors.fill}>
                    {/* Left antler */}
                    <path d="M22 38 L22 30 L18 24 M22 30 L20 26 M22 30 L24 25" 
                          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    {/* Right antler */}
                    <path d="M42 38 L42 30 L46 24 M42 30 L44 26 M42 30 L40 25" 
                          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    {/* Center shield */}
                    <path d="M32 22 L38 26 L38 34 L32 40 L26 34 L26 26 Z" 
                          fill="currentColor" className="opacity-30" />
                    <path d="M32 22 L38 26 L38 34 L32 40 L26 34 L26 26 Z" 
                          fill="none" stroke="currentColor" strokeWidth="1.5" />
                    {/* Star in center */}
                    <circle cx="32" cy="31" r="3" fill="currentColor" />
                </g>
            </svg>
        </div>
    );
};

const LevelCard: React.FC = React.memo(() => {
    const { level: userLevelInfo, points } = useAuth();
    const [allLevels, setAllLevels] = useState<LevelDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const levelsData = await api.getLevels();
                const parsedLevels = levelsData.map(l => ({
                    ...l,
                    from_points: Number(l.from_points),
                    to_points: Number(l.to_points) === 0 ? Infinity : Number(l.to_points),
                })).sort((a, b) => a.from_points - b.from_points);
                setAllLevels(parsedLevels);
            } catch (error) {
                console.error("Failed to fetch levels", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLevels();
    }, []);

    const { currentLevel, nextLevel } = useMemo(() => {
        const current = allLevels.length > 0
            ? [...allLevels].reverse().find(l => points >= l.from_points)
            : undefined;

        const currentIndex = current ? allLevels.findIndex(l => l.id === current.id) : -1;
        const next = currentIndex !== -1 && currentIndex < allLevels.length - 1
            ? allLevels[currentIndex + 1]
            : undefined;

        return { currentLevel: current, nextLevel: next };
    }, [allLevels, points]);

    const displayName = currentLevel?.name || userLevelInfo?.name || "Członek";

    let progressElement = null;

    if (loading) {
        progressElement = <div className="h-20 flex justify-center items-center"><Spinner size="md" /></div>;
    } else if (currentLevel && nextLevel) {
        const levelPointRange = nextLevel.from_points - currentLevel.from_points;
        const userProgressInLevel = points - currentLevel.from_points;
        const progressPercentage = levelPointRange > 0
            ? Math.max(0, Math.min(100, (userProgressInLevel / levelPointRange) * 100))
            : 100;
        const pointsToNextLevel = nextLevel.from_points - points;

        progressElement = (
            <div className="mt-4 sm:mt-6" aria-live="polite">
                {/* Progress labels */}
                <div className="flex justify-between items-center text-[10px] sm:text-xs mb-2 px-1">
                    <span className="font-display font-semibold text-stone-400 uppercase tracking-wider">
                        {currentLevel.name}
                    </span>
                    <span className="font-display font-semibold text-brass-500 uppercase tracking-wider">
                        {nextLevel.name}
                    </span>
                </div>
                
                {/* Progress bar container */}
                <div
                    className="relative w-full h-2.5 sm:h-3 bg-slate-800 rounded-full border border-slate-700/50 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Postęp do poziomu ${nextLevel.name}`}
                >
                    {/* Progress fill */}
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-brass-600 via-brass-500 to-brass-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                    {/* Shine effect */}
                    <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                
                {/* Points needed message */}
                <p className="text-center text-xs sm:text-sm text-stone-400 mt-2 sm:mt-3">
                    {pointsToNextLevel > 0 ? (
                        <>
                            Jeszcze <span className="font-mono font-semibold text-brass-500">{formatPolishInteger(pointsToNextLevel)}</span> punktów do <span className="text-cream">{nextLevel.name}</span>
                        </>
                    ) : (
                        <span className="text-brass-500">Osiągnąłeś poziom {nextLevel.name}!</span>
                    )}
                </p>
            </div>
        );
    } else if (currentLevel && !nextLevel) {
        progressElement = (
            <div className="mt-6 text-center" aria-live="polite">
                <div className="inline-flex items-center gap-2 bg-brass-500/10 border border-brass-500/30 rounded-sm px-4 py-2">
                    <svg className="w-5 h-5 text-brass-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-brass-400">Najwyższy poziom osiągnięty!</span>
                </div>
            </div>
        );
    }

    return (
        <Card variant="bordered" className="relative overflow-hidden">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-l-2 border-t-2 border-brass-500/30 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-r-2 border-t-2 border-brass-500/30 rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-l-2 border-b-2 border-brass-500/30 rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-r-2 border-b-2 border-brass-500/30 rounded-br-sm" />
            
            <div className="relative text-center">
                {/* Badge and title */}
                <div className="flex flex-col items-center mb-3 sm:mb-4">
                    <RankBadge levelName={displayName} />
                    <h2 className="font-display text-xs sm:text-sm font-semibold text-brass-400 tracking-widest uppercase mt-3 sm:mt-4">
                        Poziom Lojalnościowy
                    </h2>
                </div>

                {/* Level name */}
                <p className="font-display text-3xl sm:text-4xl font-bold text-cream tracking-wide">
                    {displayName}
                </p>
                <p className="text-stone-500 mt-2 text-xs sm:text-sm">
                    Twój aktualny status w programie
                </p>
            </div>
            
            {progressElement}
        </Card>
    );
});

LevelCard.displayName = 'LevelCard';

export default LevelCard;
