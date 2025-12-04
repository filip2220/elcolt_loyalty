import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Reward } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';
import Card from './Card';
import Button from './Button';
import { formatPolishInteger } from '../utils/format';

interface RewardCardProps {
    reward: Reward;
    onRedeem: (rewardId: number) => void;
    isRedeeming: boolean;
    userPoints: number;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeem, isRedeeming, userPoints }) => {
    const canRedeem = userPoints >= reward.points;

    return (
        <Card className="flex flex-col h-full">
            <div className="flex-grow">
                <h3 className="text-lg font-bold text-gray-100">{reward.name}</h3>
                <p className="text-3xl font-bold text-green-500 my-2">{formatPolishInteger(reward.points)} pkt</p>
                <p className="text-gray-400 text-sm">{reward.description}</p>
            </div>
            <div className="mt-4">
                <Button
                    onClick={() => onRedeem(reward.id)}
                    disabled={!canRedeem || isRedeeming}
                    className="w-full"
                >
                    {isRedeeming ? <Spinner size="sm" /> : 'Odbierz'}
                </Button>
                {!canRedeem && <p className="text-xs text-center text-red-400 mt-2">Niewystarczająca liczba punktów</p>}
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
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <h1 className="text-3xl font-bold text-gray-100">Odbierz Swoje Punkty</h1>
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mt-4 sm:mt-0">
                    <span className="text-sm font-medium text-gray-400">Twoje Punkty: </span>
                    <span className="text-lg font-bold text-green-500">{formatPolishInteger(points)}</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-4" role="alert">
                    <p className="font-bold">Odbiór Nieudany</p>
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-900/50 border-l-4 border-green-500 text-green-200 p-4" role="alert">
                    <p className="font-bold">Sukces!</p>
                    <p>{success.message}</p>
                    <p className="mt-2">Twój kod kuponu: <strong className="font-mono bg-green-800 px-2 py-1 rounded">{success.coupon}</strong></p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rewards.map(reward => (
                    <RewardCard
                        key={reward.id}
                        reward={reward}
                        onRedeem={handleRedeem}
                        isRedeeming={redeemingId === reward.id}
                        userPoints={points}
                    />
                ))}
            </div>
        </div>
    );
};

export default RewardsView;