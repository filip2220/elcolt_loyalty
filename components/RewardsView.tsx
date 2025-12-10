import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppOffer } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';
import Card from './Card';
import Button from './Button';
import { formatPolishInteger } from '../utils/format';

// Gift/Offer icon
const OfferIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

// App Offer Card Component
interface AppOfferCardProps {
    offer: AppOffer;
    onRedeem: (offerId: number) => void;
    isRedeeming: boolean;
    userPoints: number;
}

const AppOfferCard: React.FC<AppOfferCardProps> = ({ offer, onRedeem, isRedeeming, userPoints }) => {
    const getDiscountLabel = () => {
        if (offer.discount_type === 'percent') {
            return `${offer.discount_value}% zniżki`;
        } else if (offer.discount_type === 'fixed_cart' || offer.discount_type === 'fixed_product') {
            return `${offer.discount_value} PLN rabatu`;
        }
        return `${offer.discount_value}`;
    };

    const isFreeOffer = offer.points_required === 0;
    const canRedeem = isFreeOffer || userPoints >= offer.points_required;
    const progressPercentage = isFreeOffer ? 100 : Math.min(100, (userPoints / offer.points_required) * 100);

    return (
        <Card variant="elevated" className="flex flex-col h-full group relative overflow-hidden">
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${canRedeem ? 'bg-gradient-to-r from-forest-600 via-forest-500 to-forest-600' : 'bg-slate-700'}`} />

            {/* Free offer tag or Available tag */}
            <div className="absolute top-3 right-3">
                {isFreeOffer ? (
                    <div className="bg-forest-500/20 border border-forest-500/40 rounded-sm px-2 py-0.5">
                        <span className="text-xs font-semibold text-forest-400 uppercase tracking-wider">Darmowe</span>
                    </div>
                ) : canRedeem ? (
                    <div className="bg-amber-500/20 border border-amber-500/40 rounded-sm px-2 py-0.5">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Dostępne</span>
                    </div>
                ) : null}
            </div>

            <div className="flex-grow pt-2">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center mb-4 ${canRedeem ? 'bg-forest-500/10' : 'bg-slate-800'}`}>
                    <OfferIcon className={`w-6 h-6 ${canRedeem ? 'text-forest-500' : 'text-stone-500'}`} />
                </div>

                {/* Title - Discount Label */}
                <h3 className="font-display text-lg font-bold text-cream tracking-wide mb-2 group-hover:text-forest-400 transition-colors">
                    {getDiscountLabel()}
                </h3>

                {/* Offer name & description */}
                <p className="text-brass-400 text-sm font-medium mb-2">{offer.name}</p>
                {offer.description && (
                    <p className="text-stone-400 text-sm leading-relaxed mb-2">
                        {offer.description}
                    </p>
                )}
                
                {/* Applicable products/categories */}
                {offer.applicable_products && offer.applicable_products.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-stone-500 text-xs uppercase tracking-wider mb-1.5">
                            {offer.applicable_products[0]?.isCategory ? 'Dotyczy kategorii:' : 'Dotyczy produktów:'}
                        </p>
                        <div className="space-y-1">
                            {offer.applicable_products.slice(0, 3).map((product, idx) => (
                                <p key={idx} className="text-stone-300 text-sm leading-snug flex items-start gap-1.5">
                                    <span className="text-forest-500 mt-0.5">•</span>
                                    <span className="line-clamp-2">{product.name}</span>
                                </p>
                            ))}
                            {offer.applicable_products.length > 3 && (
                                <p className="text-stone-500 text-xs">
                                    +{offer.applicable_products.length - 3} więcej...
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Points required */}
                {!isFreeOffer && (
                    <div className="inline-flex items-center bg-slate-800/80 border border-slate-700/50 rounded-sm px-3 py-1 mt-3">
                        <span className="font-mono text-lg font-bold text-amber-500">{formatPolishInteger(offer.points_required)}</span>
                        <span className="text-stone-500 text-sm ml-1.5">pkt</span>
                    </div>
                )}
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
                    onClick={() => onRedeem(offer.id)}
                    disabled={!canRedeem || isRedeeming}
                    variant={canRedeem ? 'primary' : 'secondary'}
                    className={`w-full ${canRedeem ? 'bg-forest-600 hover:bg-forest-500' : ''}`}
                >
                    {isRedeeming ? (
                        <Spinner size="sm" />
                    ) : canRedeem ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Odbierz ofertę
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
                        Brakuje <span className="text-stone-400 font-mono">{formatPolishInteger(offer.points_required - userPoints)}</span> punktów
                    </p>
                )}
            </div>
        </Card>
    );
};

const RewardsView: React.FC = () => {
    const { token, points, updatePoints } = useAuth();
    const [offers, setOffers] = useState<AppOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemingId, setRedeemingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ message: string, coupon: string } | null>(null);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const response = await api.getAppOffers();
                setOffers(response.offers);
            } catch (error) {
                console.error("Failed to fetch offers", error);
                setError("Nie udało się załadować ofert. Spróbuj ponownie później.");
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, []);

    const handleRedeem = async (offerId: number) => {
        if (!token) return;
        setRedeemingId(offerId);
        setError(null);
        setSuccess(null);
        try {
            const result = await api.redeemReward(token, offerId);
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
                <p className="text-stone-500 text-sm">Ładowanie ofert...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-cream tracking-wide">
                        Oferty dla Użytkowników
                    </h1>
                    <p className="text-stone-500 text-sm sm:text-base mt-1">Ekskluzywne oferty dostępne wyłącznie w aplikacji</p>
                </div>

                {/* Points badge */}
                <div className="flex items-center gap-3 bg-slate-850 border border-slate-700/50 rounded-sm px-3 sm:px-4 py-2 sm:py-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider">Twój stan konta</p>
                        <p className="font-mono text-lg sm:text-xl font-bold text-amber-500">{formatPolishInteger(points)} <span className="text-stone-500 text-xs sm:text-sm font-normal">pkt</span></p>
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

            {/* Offers grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {offers.map((offer, index) => (
                    <div key={offer.id} className={`stagger-${(index % 4) + 1} animate-slide-up`}>
                        <AppOfferCard
                            offer={offer}
                            onRedeem={handleRedeem}
                            isRedeeming={redeemingId === offer.id}
                            userPoints={points}
                        />
                    </div>
                ))}
            </div>

            {offers.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <OfferIcon className="w-8 h-8 text-stone-600" />
                    </div>
                    <p className="text-stone-500">Brak dostępnych ofert</p>
                </div>
            )}
        </div>
    );
};

export default RewardsView;
