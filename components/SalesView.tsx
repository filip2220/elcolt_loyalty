import React, { useState, useEffect } from 'react';
import { SaleProduct, Product } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';
import Card from './Card';
import Button from './Button';

// Sale tag icon
const SaleTagIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
);

// Product placeholder icon
const ProductPlaceholderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

// Format price helper
const formatPrice = (price: string | null): string => {
    if (!price) return '';
    const num = parseFloat(price);
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN'
    }).format(num);
};

// Sale Product Card Component
interface SaleProductCardProps {
    product: SaleProduct;
    onClick: () => void;
}

const SaleProductCard: React.FC<SaleProductCardProps> = ({ product, onClick }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const thumbnailUrl = product.thumbnail_url || null;

    return (
        <Card
            variant="elevated"
            className="flex flex-col h-full group cursor-pointer hover:border-rust-500/50 transition-all duration-300 relative overflow-hidden"
            onClick={onClick}
        >
            {/* Discount badge */}
            {product.discount_percent > 0 && (
                <div className="absolute top-3 right-3 z-10 bg-rust-600 text-cream text-xs font-bold px-2 py-1 rounded-sm shadow-lg">
                    -{product.discount_percent}%
                </div>
            )}

            {/* Image container */}
            <div className="relative w-full h-40 bg-slate-800 rounded-sm overflow-hidden mb-4">
                {thumbnailUrl && !imageError ? (
                    <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner size="sm" />
                            </div>
                        )}
                        <img
                            src={thumbnailUrl}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            referrerPolicy="no-referrer"
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
                        <ProductPlaceholderIcon className="w-10 h-10 text-stone-600 mb-2" />
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Product info */}
            <div className="flex-grow flex flex-col">
                <h3 className="font-display text-base font-bold text-cream tracking-wide mb-2 group-hover:text-rust-400 transition-colors line-clamp-2">
                    {product.name}
                </h3>

                {/* Price section */}
                <div className="flex flex-wrap items-baseline gap-2 mb-3">
                    <span className="font-mono text-lg font-bold text-rust-500">
                        {formatPrice(product.sale_price)}
                    </span>
                    {product.regular_price && (
                        <span className="font-mono text-sm text-stone-500 line-through">
                            {formatPrice(product.regular_price)}
                        </span>
                    )}
                </div>
            </div>

            {/* View button */}
            <div className="mt-auto pt-3 border-t border-slate-700/50">
                <Button variant="secondary" className="w-full text-sm group-hover:bg-rust-500/10 group-hover:border-rust-500/50 group-hover:text-rust-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Zobacz
                </Button>
            </div>
        </Card>
    );
};

// Main SalesView Component
const SalesView: React.FC = () => {
    const [publicSales, setPublicSales] = useState<SaleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loadingProduct, setLoadingProduct] = useState(false);

    // Fetch public sales
    useEffect(() => {
        const fetchPublicSales = async () => {
            try {
                setLoading(true);
                const response = await api.getPublicSales();
                setPublicSales(response.sales);
            } catch (err) {
                console.error("Failed to fetch public sales", err);
                setError("Nie udało się załadować promocji.");
            } finally {
                setLoading(false);
            }
        };
        fetchPublicSales();
    }, []);

    const handleProductClick = async (productId: number) => {
        try {
            setLoadingProduct(true);
            const product = await api.getProduct(productId);
            setSelectedProduct(product);
        } catch (err) {
            console.error("Failed to fetch product", err);
        } finally {
            setLoadingProduct(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <Spinner size="lg" />
                <p className="text-stone-500 text-sm">Ładowanie promocji...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-cream tracking-wide">
                        Promocje Sklepowe
                    </h1>
                    <p className="text-stone-500 text-sm sm:text-base mt-1">
                        Produkty aktualnie w promocyjnych cenach
                    </p>
                </div>

                {/* Count badge */}
                <div className="flex items-center gap-3 bg-slate-850 border border-slate-700/50 rounded-sm px-3 sm:px-4 py-2 sm:py-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm bg-rust-500/10 flex items-center justify-center">
                        <SaleTagIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rust-500" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider">Produkty w promocji</p>
                        <p className="font-mono text-lg sm:text-xl font-bold text-cream">
                            {publicSales.length}
                        </p>
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
                        <p className="font-display font-semibold text-rust-500">Błąd</p>
                        <p className="text-rust-500/80 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {publicSales.map((product, index) => (
                    <div key={product.id} className={`stagger-${(index % 4) + 1} animate-slide-up`}>
                        <SaleProductCard
                            product={product}
                            onClick={() => handleProductClick(product.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {publicSales.length === 0 && !loading && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <SaleTagIcon className="w-8 h-8 text-stone-600" />
                    </div>
                    <p className="text-stone-500">Brak aktualnych promocji</p>
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in"
                    onClick={handleCloseModal}
                >
                    <div
                        className="relative w-full sm:max-w-2xl h-[80vh] sm:h-auto sm:max-h-[80vh] bg-slate-900 border-t sm:border border-slate-700/50 rounded-t-xl sm:rounded-sm overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 w-10 h-10 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-stone-400 hover:text-cream rounded-sm transition-colors"
                            aria-label="Zamknij"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex flex-col sm:flex-row max-h-[80vh] overflow-y-auto">
                            {/* Image */}
                            <div className="sm:w-1/2 bg-slate-800">
                                <div className="aspect-square">
                                    {selectedProduct.featured_image ? (
                                        <img
                                            src={selectedProduct.featured_image.url}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-contain"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ProductPlaceholderIcon className="w-24 h-24 text-stone-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="sm:w-1/2 p-4 sm:p-6">
                                <h2 className="font-display text-xl sm:text-2xl font-bold text-cream tracking-wide mb-3">
                                    {selectedProduct.name}
                                </h2>

                                {/* Price */}
                                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-4">
                                    {selectedProduct.sale_price && selectedProduct.regular_price ? (
                                        <>
                                            <span className="font-mono text-2xl font-bold text-rust-500">
                                                {formatPrice(selectedProduct.sale_price)}
                                            </span>
                                            <span className="font-mono text-lg text-stone-500 line-through">
                                                {formatPrice(selectedProduct.regular_price)}
                                            </span>
                                            <span className="bg-rust-600/20 text-rust-400 text-xs font-semibold px-2 py-1 rounded-sm uppercase">
                                                Promocja
                                            </span>
                                        </>
                                    ) : (
                                        <span className="font-mono text-2xl font-bold text-brass-500">
                                            {formatPrice(selectedProduct.price || selectedProduct.regular_price)}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {selectedProduct.short_description && (
                                    <p className="text-stone-300 leading-relaxed text-sm">
                                        {new DOMParser().parseFromString(selectedProduct.short_description, 'text/html').body.textContent}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesView;
