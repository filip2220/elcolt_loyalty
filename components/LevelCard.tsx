import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import * as api from '../services/api';
import { LevelDetails } from '../types';
import Spinner from './Spinner';
import { formatPolishInteger } from '../utils/format';

// PERFORMANCE: Memoize LevelCard to prevent unnecessary re-renders
const LevelCard: React.FC = React.memo(() => {
    const { level: userLevelInfo, points } = useAuth(); // level has name and id
    const [allLevels, setAllLevels] = useState<LevelDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const levelsData = await api.getLevels();
                // Ensure points are numbers and handle the top level's 'to_points' being 0, which we treat as infinity
                const parsedLevels = levelsData.map(l => ({
                    ...l,
                    from_points: Number(l.from_points),
                    // The highest level often has to_points set to 0. We'll treat this as Infinity.
                    to_points: Number(l.to_points) === 0 ? Infinity : Number(l.to_points),
                })).sort((a, b) => a.from_points - b.from_points); // Ensure sorted ascending
                setAllLevels(parsedLevels);
            } catch (error) {
                console.error("Failed to fetch levels", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLevels();
    }, []);

    // PERFORMANCE: Memoize expensive level calculations
    const { currentLevel, nextLevel } = useMemo(() => {
        // Determine current level based on points, which is more reliable than the stored level_id
        // We reverse the sorted list to find the highest level the user has achieved.
        const current = allLevels.length > 0
            ? [...allLevels].reverse().find(l => points >= l.from_points)
            : undefined;

        // Find the next level in the progression
        const currentIndex = current ? allLevels.findIndex(l => l.id === current.id) : -1;
        const next = currentIndex !== -1 && currentIndex < allLevels.length - 1
            ? allLevels[currentIndex + 1]
            : undefined;

        return { currentLevel: current, nextLevel: next };
    }, [allLevels, points]);

    // Use the determined level name, but fall back to the one from the auth context or 'Member'
    const displayName = currentLevel?.name || userLevelInfo?.name || "Członek";
    const description = "Twój aktualny status lojalnościowy.";

    let progressElement = null;

    if (loading) {
        progressElement = <div className="h-20 flex justify-center items-center"><Spinner size="md" /></div>;
    } else if (currentLevel && nextLevel) {
        // We need to handle the case where the range is 0 to avoid division by zero.
        const levelPointRange = nextLevel.from_points - currentLevel.from_points;
        const userProgressInLevel = points - currentLevel.from_points;

        // Calculate progress percentage, ensuring it's between 0 and 100.
        const progressPercentage = levelPointRange > 0
            ? Math.max(0, Math.min(100, (userProgressInLevel / levelPointRange) * 100))
            : 100;

        const pointsToNextLevel = nextLevel.from_points - points;

        progressElement = (
            <div className="mt-4" aria-live="polite">
                <div className="flex justify-between items-center text-xs text-gray-300 mb-1 px-1">
                    <span className="font-bold">{currentLevel.name}</span>
                    <span className="font-bold">{nextLevel.name}</span>
                </div>
                <div
                    className="w-full bg-gray-700 rounded-full h-3 border border-gray-600"
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Postęp do poziomu ${nextLevel.name}`}
                >
                    <div
                        className="bg-yellow-400 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                <p className="text-center text-sm text-yellow-200 mt-2">
                    {pointsToNextLevel > 0
                        ? `Potrzebujesz jeszcze ${formatPolishInteger(pointsToNextLevel)} punktów, aby osiągnąć ${nextLevel.name}.`
                        : `Osiągnąłeś poziom ${nextLevel.name}!`}
                </p>
            </div>
        );
    } else if (currentLevel && !nextLevel) {
        // This means the user is at the highest possible level.
        progressElement = (
            <p className="text-center text-sm text-yellow-200 mt-4 font-semibold" aria-live="polite">
                Osiągnąłeś najwyższy poziom! Gratulacje!
            </p>
        );
    }

    return (
        <Card className="border-yellow-500">
            <div className="text-center">
                <div className="flex justify-center items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-yellow-300">Poziom Lojalnościowy</h2>
                </div>

                <p className="text-4xl font-bold mt-2 text-white">{displayName}</p>
                <p className="text-yellow-200 mt-2 text-sm">{description}</p>
            </div>
            {progressElement}
        </Card>
    );
});

LevelCard.displayName = 'LevelCard';

export default LevelCard;
