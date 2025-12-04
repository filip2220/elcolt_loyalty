import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Reward } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';
import Card from './Card';
import Button from './Button';
import { formatPolishInteger } from '../utils/format';

// Reward category icon
const RewardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

interface RewardCardProps {
    reward: Reward;
    onRedeem: (rewardId: number) => void;
    isRedeeming: boolean;
    userPoints: number;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeem, isRedeeming, userPoints }) => {
    const canRedeem = userPoints >= reward.points;
    const progressPercentage = Math.min(100, (userPoints / reward.points) * 100);

    return (
        <Card variant="elevated" className="flex flex-col h-full group relative overflow-hidden">
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${canRedeem ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600' : 'bg-slate-700'}`} />
            
            {/* Corner tag if affordable */}
            {canRedeem && (
                <div className="absolute top-3 right-3">
                    <div className="bg-amber-500/20 border border-amber-500/40 rounded-sm px-2 py-0.5">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Dostępne</span>
                    </div>
                </div>
            )}

            <div className="flex-grow pt-2">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center mb-4 ${canRedeem ? 'bg-amber-500/10' : 'bg-slate-800'}`}>
                    <RewardIcon className={`w-6 h-6 ${canRedeem ? 'text-amber-500' : 'text-stone-500'}`} />
                </div>
                
                {/* Title */}
                <h3 className="font-display text-lg font-bold text-cream tracking-wide mb-2 group-hover:text-brass-400 transition-colors">
                    {reward.name}
                </h3>
                
                {/* Points cost - dog tag style */}
                <div className="inline-flex items-center bg-slate-800/80 border border-slate-700/50 rounded-sm px-3 py-1 mb-3">
                    <span className="font-mono text-2xl font-bold text-amber-500">{formatPolishInteger(reward.points)}</span>
                    <span className="text-stone-500 text-sm ml-1.5">pkt</span>
                </div>
                
                {/* Description */}
                <p className="text-stone-400 text-sm leading-relaxed">
                    {reward.description}
                </p>
            </div>
            
            {/* Footer with progress and button */}
            <div className="mt-6 space-y-3">
                {/* Mini progress bar if not affordable */}
                {!canRedeem && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-stone-500">Postęp</span>
                            <span className="text-stone-400 font-mono">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-slate-600 to-slate-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                )}
                
                <Button
                    onClick={() => onRedeem(reward.id)}
                    disabled={!canRedeem || isRedeeming}
                    variant={canRedeem ? 'primary' : 'secondary'}
                    className="w-full"
                >
                    {isRedeeming ? (
                        <Spinner size="sm" />
                    ) : canRedeem ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Odbierz nagrodę
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Zablokowane
                        </>
                    )}
                </Button>
                
                {!canRedeem && (
                    <p className="text-xs text-center text-stone-600">
                        Brakuje <span className="text-stone-400 font-mono">{formatPolishInteger(reward.points - userPoints)}</span> punktów
                    </p>
                )}
            </div>
        </Card>
    );
};

const RewardsView: React.FC = () => {
    const { token, points, updatePoints } = useAuth();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemingId, setRedeemingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ message: string, coupon: string } | null>(null);

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const availableRewards = await api.getRewards();
                setRewards(availableRewards);
            } catch (error) {
                console.error("Failed to fetch rewards", error);
                setError("Nie udało się załadować nagród. Spróbuj ponownie później.");
            } finally {
                setLoading(false);
            }
        };
        fetchRewards();
    }, []);

    const handleRedeem = async (rewardId: number) => {
        if (!token) return;
        setRedeemingId(rewardId);
        setError(null);
        setSuccess(null);
        try {
            const result = await api.redeemReward(token, rewardId);
            updatePoints(result.newPoints);
            setSuccess({ message: result.message, coupon: result.coupon });
        } catch (err: any) {
            setError(err.message || "Wystąpił nieoczekiwany błąd.");
        } finally {
            setRedeemingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <Spinner size="lg" />
                <p className="text-stone-500 text-sm">Ładowanie nagród...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold text-cream tracking-wide">
                        Katalog Nagród
                    </h1>
                    <p className="text-stone-500 mt-1">Wymień swoje punkty na ekskluzywne nagrody</p>
                </div>
                
                {/* Points badge */}
                <div className="flex items-center gap-3 bg-slate-850 border border-slate-700/50 rounded-sm px-4 py-3">
                    <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">Twój stan konta</p>
                        <p className="font-mono text-xl font-bold text-amber-500">{formatPolishInteger(points)} <span className="text-stone-500 text-sm font-normal">pkt</span></p>
                    </div>
                </div>
            </div>

            {/* Error alert */}
            {error && (
                <div className="bg-rust-600/10 border-l-4 border-rust-500 rounded-sm p-4 flex items-start gap-3" role="alert">
                    <svg className="w-5 h-5 text-rust-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="font-display font-semibold text-rust-500">Odbiór nieudany</p>
                        <p className="text-rust-500/80 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Success alert with coupon */}
            {success && (
                <div className="bg-forest-700/20 border-l-4 border-forest-500 rounded-sm p-4" role="alert">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-forest-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <div className="flex-1">
                            <p className="font-display font-semibold text-forest-400">Sukces!</p>
                            <p className="text-forest-300/80 text-sm mt-1">{success.message}</p>
                            
                            {/* Coupon code display */}
                            <div className="mt-4 bg-slate-900/80 border border-slate-700/50 rounded-sm p-4">
                                <p className="text-stone-500 text-xs uppercase tracking-wider mb-2">Twój kod kuponu:</p>
                                <div className="flex items-center gap-3">
                                    <code className="font-mono text-xl font-bold text-brass-400 bg-brass-500/10 px-4 py-2 rounded-sm border border-brass-500/30">
                                        {success.coupon}
                                    </code>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(success.coupon)}
                                        className="text-stone-400 hover:text-cream transition-colors p-2"
                                        title="Kopiuj kod"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rewards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rewards.map((reward, index) => (
                    <div key={reward.id} className={`stagger-${(index % 4) + 1} animate-slide-up`}>
                        <RewardCard
                            reward={reward}
                            onRedeem={handleRedeem}
                            isRedeeming={redeemingId === reward.id}
                            userPoints={points}
                        />
                    </div>
                ))}
            </div>
            
            {rewards.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <RewardIcon className="w-8 h-8 text-stone-600" />
                    </div>
                    <p className="text-stone-500">Brak dostępnych nagród</p>
                </div>
            )}
        </div>
    );
};

export default RewardsView;
