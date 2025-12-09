import React, { useState, useEffect, useCallback } from 'react';
import { ProductBasic, Product, ProductImage } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';
import Card from './Card';
import Button from './Button';

// Product placeholder icon when no image
const ProductPlaceholderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

// Close icon
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// Left arrow icon
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

// Right arrow icon
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

// Product Card Component
interface ProductCardProps {
    product: ProductBasic;
    onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);

    // Fetch thumbnail URL if product has thumbnail_id
    useEffect(() => {
        if (product.thumbnail_id) {
            setLoadingImage(true);
            api.getProductImages(product.id)
                .then(images => {
                    if (images.featured_image?.url) {
                        // Use the proxy to load images (bypasses CORS and hosting issues)
                        const proxiedUrl = api.getProxiedImageUrl(images.featured_image.url);
                        setThumbnailUrl(proxiedUrl);
                        // Log the URL for debugging
                        console.log(`Product ${product.id} image URL (original):`, images.featured_image.url);
                        console.log(`Product ${product.id} image URL (proxied):`, proxiedUrl);
                    } else {
                        console.log(`Product ${product.id}: No featured image found`);
                        setImageError(true);
                    }
                })
                .catch((err) => {
                    console.error(`Product ${product.id} image fetch error:`, err);
                    setImageError(true);
                })
                .finally(() => setLoadingImage(false));
        }
    }, [product.id, product.thumbnail_id]);

    // Strip HTML tags from description for preview
    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    };

    const shortDesc = stripHtml(product.short_description || product.description || '');
    const truncatedDesc = shortDesc.length > 100 ? shortDesc.slice(0, 100) + '...' : shortDesc;

    return (
        <Card 
            variant="elevated" 
            className="flex flex-col h-full group cursor-pointer hover:border-brass-500/50 transition-all duration-300"
            onClick={onClick}
        >
            {/* Image container */}
            <div className="relative w-full h-48 bg-slate-800 rounded-sm overflow-hidden mb-4">
                {loadingImage ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                        <Spinner size="sm" />
                    </div>
                ) : thumbnailUrl && !imageError ? (
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
                            onLoad={() => {
                                console.log(`Image loaded successfully: ${product.name}`);
                                setImageLoaded(true);
                            }}
                            onError={(e) => {
                                console.error(`Image failed to load for ${product.name}:`, thumbnailUrl);
                                console.error('Error event:', e);
                                setImageError(true);
                            }}
                            crossOrigin="anonymous"
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
                        <ProductPlaceholderIcon className="w-12 h-12 text-stone-600 mb-2" />
                        {imageError && (
                            <span className="text-xs text-stone-600">Brak zdjęcia</span>
                        )}
                    </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Product info */}
            <div className="flex-grow flex flex-col">
                <h3 className="font-display text-lg font-bold text-cream tracking-wide mb-2 group-hover:text-brass-400 transition-colors line-clamp-2">
                    {product.name}
                </h3>
                
                {truncatedDesc && (
                    <p className="text-stone-400 text-sm leading-relaxed line-clamp-3 flex-grow">
                        {truncatedDesc}
                    </p>
                )}
            </div>

            {/* View button */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
                <Button variant="secondary" className="w-full group-hover:bg-brass-500/10 group-hover:border-brass-500/50 group-hover:text-brass-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Zobacz szczegóły
                </Button>
            </div>
        </Card>
    );
};

// Product Detail Modal Component
interface ProductDetailModalProps {
    product: Product | null;
    loading: boolean;
    onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, loading, onClose }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Reset image index when product changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [product?.id]);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Combine all images and proxy their URLs
    const allImages: (ProductImage & { proxiedUrl: string })[] = product ? [
        ...(product.featured_image ? [{ ...product.featured_image, proxiedUrl: api.getProxiedImageUrl(product.featured_image.url) }] : []),
        ...product.gallery_images
            .filter(img => img.id !== product.featured_image?.id)
            .map(img => ({ ...img, proxiedUrl: api.getProxiedImageUrl(img.url) }))
    ] : [];

    const handlePrevImage = useCallback(() => {
        setCurrentImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1);
    }, [allImages.length]);

    const handleNextImage = useCallback(() => {
        setCurrentImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0);
    }, [allImages.length]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'ArrowRight') handleNextImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handlePrevImage, handleNextImage]);

    // Strip HTML but preserve some formatting
    const formatDescription = (html: string) => {
        // Create a temporary div to parse HTML
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    };

    const formatPrice = (price: string | null) => {
        if (!price) return null;
        const num = parseFloat(price);
        return new Intl.NumberFormat('pl-PL', { 
            style: 'currency', 
            currency: 'PLN' 
        }).format(num);
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative w-full sm:max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] bg-slate-900 border-t sm:border border-slate-700/50 rounded-t-xl sm:rounded-sm overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile drag handle */}
                <div className="sm:hidden w-12 h-1 bg-slate-600 rounded-full mx-auto mt-2 mb-1" />
                
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 w-10 h-10 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-stone-400 hover:text-cream rounded-sm transition-colors"
                    aria-label="Zamknij"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 sm:h-96 gap-4">
                        <Spinner size="lg" />
                        <p className="text-stone-500 text-sm">Ładowanie produktu...</p>
                    </div>
                ) : product ? (
                    <div className="flex flex-col lg:flex-row max-h-[calc(95vh-12px)] sm:max-h-[90vh] overflow-y-auto">
                        {/* Image Gallery */}
                        <div className="lg:w-1/2 bg-slate-800">
                            <div className="relative aspect-square sm:aspect-square">
                                {allImages.length > 0 ? (
                                    <>
                                        <img
                                            src={allImages[currentImageIndex]?.proxiedUrl}
                                            alt={allImages[currentImageIndex]?.title || product.name}
                                            className="w-full h-full object-contain"
                                        />
                                        
                                        {/* Image navigation */}
                                        {allImages.length > 1 && (
                                            <>
                                                <button
                                                    onClick={handlePrevImage}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-cream rounded-sm transition-colors"
                                                    aria-label="Poprzednie zdjęcie"
                                                >
                                                    <ChevronLeftIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={handleNextImage}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-cream rounded-sm transition-colors"
                                                    aria-label="Następne zdjęcie"
                                                >
                                                    <ChevronRightIcon className="w-5 h-5" />
                                                </button>
                                                
                                                {/* Image counter */}
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-3 py-1 rounded-sm">
                                                    <span className="text-cream text-sm font-mono">
                                                        {currentImageIndex + 1} / {allImages.length}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ProductPlaceholderIcon className="w-24 h-24 text-stone-600" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Thumbnail strip */}
                            {allImages.length > 1 && (
                                <div className="flex gap-2 p-4 overflow-x-auto">
                                    {allImages.map((img, index) => (
                                        <button
                                            key={img.id}
                                            onClick={() => setCurrentImageIndex(index)}
                                            className={`flex-shrink-0 w-16 h-16 rounded-sm overflow-hidden border-2 transition-colors ${
                                                index === currentImageIndex 
                                                    ? 'border-brass-500' 
                                                    : 'border-transparent hover:border-slate-600'
                                            }`}
                                        >
                                            <img
                                                src={img.proxiedUrl}
                                                alt={img.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Details */}
                        <div className="lg:w-1/2 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                            {/* SKU */}
                            {product.sku && (
                                <p className="text-stone-500 text-[10px] sm:text-xs uppercase tracking-wider mb-2">
                                    SKU: {product.sku}
                                </p>
                            )}

                            {/* Title */}
                            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-cream tracking-wide mb-3 sm:mb-4">
                                {product.name}
                            </h2>

                            {/* Price */}
                            {(product.price || product.regular_price) && (
                                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-4 sm:mb-6">
                                    {product.sale_price && product.regular_price ? (
                                        <>
                                            <span className="font-mono text-2xl sm:text-3xl font-bold text-brass-500">
                                                {formatPrice(product.sale_price)}
                                            </span>
                                            <span className="font-mono text-lg sm:text-xl text-stone-500 line-through">
                                                {formatPrice(product.regular_price)}
                                            </span>
                                            <span className="bg-rust-600/20 text-rust-400 text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-sm uppercase">
                                                Promocja
                                            </span>
                                        </>
                                    ) : (
                                        <span className="font-mono text-2xl sm:text-3xl font-bold text-brass-500">
                                            {formatPrice(product.price || product.regular_price)}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Short description */}
                            {product.short_description && (
                                <div className="mb-6 pb-6 border-b border-slate-700/50">
                                    <p className="text-stone-300 leading-relaxed">
                                        {formatDescription(product.short_description)}
                                    </p>
                                </div>
                            )}

                            {/* Full description */}
                            {product.description && (
                                <div className="space-y-4">
                                    <h3 className="font-display text-lg font-semibold text-cream uppercase tracking-wider">
                                        Opis
                                    </h3>
                                    <div className="text-stone-400 leading-relaxed prose prose-invert prose-sm max-w-none">
                                        {formatDescription(product.description)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-96 gap-4">
                        <ProductPlaceholderIcon className="w-16 h-16 text-stone-600" />
                        <p className="text-stone-500">Nie znaleziono produktu</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Main ProductsView Component
const ProductsView: React.FC = () => {
    const [products, setProducts] = useState<ProductBasic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 });

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await api.getProducts(pagination.limit, pagination.offset);
                setProducts(response.products);
                setPagination(response.pagination);
            } catch (err) {
                console.error("Failed to fetch products", err);
                setError("Nie udało się załadować produktów. Spróbuj ponownie później.");
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [pagination.limit, pagination.offset]);

    // Fetch selected product details
    useEffect(() => {
        if (selectedProductId) {
            const fetchProduct = async () => {
                try {
                    setLoadingProduct(true);
                    const product = await api.getProduct(selectedProductId);
                    setSelectedProduct(product);
                } catch (err) {
                    console.error("Failed to fetch product", err);
                    setSelectedProduct(null);
                } finally {
                    setLoadingProduct(false);
                }
            };
            fetchProduct();
        }
    }, [selectedProductId]);

    const handleProductClick = (productId: number) => {
        setSelectedProductId(productId);
    };

    const handleCloseModal = () => {
        setSelectedProductId(null);
        setSelectedProduct(null);
    };

    const handleLoadMore = () => {
        setPagination(prev => ({
            ...prev,
            offset: prev.offset + prev.limit
        }));
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

    if (loading && products.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <Spinner size="lg" />
                <p className="text-stone-500 text-sm">Ładowanie produktów...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-cream tracking-wide">
                        Produkty
                    </h1>
                    <p className="text-stone-500 text-sm sm:text-base mt-1">
                        Przeglądaj naszą ofertę produktów
                    </p>
                </div>
                
                {/* Product count badge */}
                <div className="flex items-center gap-3 bg-slate-850 border border-slate-700/50 rounded-sm px-3 sm:px-4 py-2 sm:py-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm bg-forest-700/20 flex items-center justify-center">
                        <ProductPlaceholderIcon className="w-4 h-4 sm:w-5 sm:h-5 text-forest-500" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider">Liczba produktów</p>
                        <p className="font-mono text-lg sm:text-xl font-bold text-cream">{pagination.total}</p>
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
                        <p className="font-display font-semibold text-rust-500">Błąd ładowania</p>
                        <p className="text-rust-500/80 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map((product, index) => (
                    <div key={product.id} className={`stagger-${(index % 4) + 1} animate-slide-up`}>
                        <ProductCard
                            product={product}
                            onClick={() => handleProductClick(product.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {products.length === 0 && !loading && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <ProductPlaceholderIcon className="w-8 h-8 text-stone-600" />
                    </div>
                    <p className="text-stone-500">Brak dostępnych produktów</p>
                </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-700/50">
                    <p className="text-stone-500 text-xs sm:text-sm order-2 sm:order-1">
                        Wyświetlono {Math.min(pagination.offset + pagination.limit, pagination.total)} z {pagination.total} produktów
                    </p>
                    <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.offset === 0}
                            onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                            className="flex-1 sm:flex-none"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Poprzednie</span>
                        </Button>
                        <span className="text-stone-400 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.offset + pagination.limit >= pagination.total}
                            onClick={handleLoadMore}
                            className="flex-1 sm:flex-none"
                        >
                            <span className="hidden sm:inline">Następne</span>
                            <ChevronRightIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProductId && (
                <ProductDetailModal
                    product={selectedProduct}
                    loading={loadingProduct}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default ProductsView;

