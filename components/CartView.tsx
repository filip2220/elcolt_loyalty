import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Card from './Card';
import Button from './Button';
import Spinner from './Spinner';

// Format price helper
const formatPrice = (price: string | null): string => {
    if (!price) return '';
    const num = parseFloat(price);
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN'
    }).format(num);
};

// Cart icon
const CartIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
));
CartIcon.displayName = 'CartIcon';

// Product placeholder icon
const ProductPlaceholderIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
));
ProductPlaceholderIcon.displayName = 'ProductPlaceholderIcon';

const CartView: React.FC = React.memo(() => {
    const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
    const { user, token } = useAuth();
    const [checkingOut, setCheckingOut] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);

    const handleQuantityChange = (productId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            removeFromCart(productId);
        } else {
            updateQuantity(productId, newQuantity);
        }
    };

    const handleCheckout = async () => {
        if (!token || !user) {
            setOrderError('Musisz być zalogowany, aby złożyć zamówienie.');
            return;
        }

        if (cart.items.length === 0) {
            return;
        }

        setCheckingOut(true);
        setOrderError(null);

        try {
            // Prepare order items (only product_id and quantity needed)
            const orderItems = cart.items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity
            }));

            // Create checkout order via WooCommerce API
            const result = await api.createCheckout(token, orderItems);

            // Clear cart before redirect
            clearCart();

            // Redirect to WooCommerce checkout page
            window.location.href = result.checkoutUrl;

        } catch (error) {
            console.error('Checkout failed', error);
            setOrderError('Nie udało się utworzyć zamówienia. Spróbuj ponownie.');
        } finally {
            setCheckingOut(false);
        }
    };


    if (orderSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-olive-500/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-olive-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="font-display text-2xl font-bold text-cream">Zamówienie złożone!</h2>
                <p className="text-stone-400">Dziękujemy za zakup. Skontaktujemy się z Tobą wkrótce.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-cream tracking-wide">
                        Koszyk
                    </h1>
                    <p className="text-stone-500 text-sm sm:text-base mt-1">
                        Twoje wybrane produkty
                    </p>
                </div>

                {/* Cart badge */}
                <div className="flex items-center gap-3 bg-slate-850 border border-slate-700/50 rounded-sm px-3 sm:px-4 py-2 sm:py-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm bg-brass-500/10 flex items-center justify-center">
                        <CartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brass-500" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider">Produkty</p>
                        <p className="font-mono text-lg sm:text-xl font-bold text-cream">
                            {cart.itemCount}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error alert */}
            {orderError && (
                <div className="bg-rust-600/10 border-l-4 border-rust-500 rounded-sm p-4 flex items-start gap-3" role="alert">
                    <svg className="w-5 h-5 text-rust-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="font-display font-semibold text-rust-500">Błąd</p>
                        <p className="text-rust-500/80 text-sm mt-1">{orderError}</p>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {cart.items.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <CartIcon className="w-8 h-8 text-stone-600" />
                    </div>
                    <p className="text-stone-500 mb-4">Twój koszyk jest pusty</p>
                    <p className="text-stone-600 text-sm">Dodaj produkty z sekcji Promocje</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cart items */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.items.map((item) => {
                            const price = parseFloat(item.product.sale_price || item.product.price || item.product.regular_price || '0');
                            const itemTotal = price * item.quantity;

                            return (
                                <Card key={item.product.id} variant="elevated" className="!p-4">
                                    <div className="flex gap-4">
                                        {/* Product image */}
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800 rounded-sm flex-shrink-0 overflow-hidden">
                                            {item.product.featured_image?.url ? (
                                                <img
                                                    src={item.product.featured_image.url}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ProductPlaceholderIcon className="w-8 h-8 text-stone-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Product details */}
                                        <div className="flex-grow">
                                            <h3 className="font-display text-base font-bold text-cream mb-2 line-clamp-2">
                                                {item.product.name}
                                            </h3>

                                            <div className="flex items-baseline gap-2 mb-3">
                                                <span className="font-mono text-lg font-bold text-brass-500">
                                                    {formatPrice(item.product.sale_price || item.product.price || item.product.regular_price)}
                                                </span>
                                                {item.product.sale_price && item.product.regular_price && (
                                                    <span className="font-mono text-sm text-stone-500 line-through">
                                                        {formatPrice(item.product.regular_price)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quantity controls */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center border border-slate-700 rounded-sm">
                                                    <button
                                                        onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                                                        className="px-3 py-1 hover:bg-slate-800 transition-colors"
                                                        aria-label="Zmniejsz ilość"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                                        </svg>
                                                    </button>
                                                    <span className="px-4 py-1 font-mono text-cream min-w-[3rem] text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                                                        className="px-3 py-1 hover:bg-slate-800 transition-colors"
                                                        aria-label="Zwiększ ilość"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="text-rust-500 hover:text-rust-400 transition-colors"
                                                    aria-label="Usuń z koszyka"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Item total */}
                                            <div className="mt-2 text-right">
                                                <span className="text-xs text-stone-500 uppercase tracking-wider">Suma: </span>
                                                <span className="font-mono text-lg font-bold text-cream ml-2">
                                                    {formatPrice(itemTotal.toFixed(2))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Order summary */}
                    <div className="lg:col-span-1">
                        <Card variant="bordered" className="sticky top-20">
                            <h2 className="font-display text-xl font-bold text-cream mb-4">Podsumowanie</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-stone-400">
                                    <span>Produkty ({cart.itemCount})</span>
                                    <span className="font-mono">{formatPrice(cart.total.toFixed(2))}</span>
                                </div>
                                <div className="flex justify-between text-stone-400">
                                    <span>Dostawa</span>
                                    <span className="font-mono">0,00 zł</span>
                                </div>
                                <div className="border-t border-slate-700 pt-3 flex justify-between">
                                    <span className="font-display font-bold text-cream">Razem</span>
                                    <span className="font-mono text-xl font-bold text-brass-500">
                                        {formatPrice(cart.total.toFixed(2))}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                className="w-full mb-3"
                                onClick={handleCheckout}
                                disabled={checkingOut}
                            >
                                {checkingOut ? (
                                    <>
                                        <Spinner size="sm" />
                                        Przetwarzanie...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Zamów
                                    </>
                                )}
                            </Button>

                            <button
                                onClick={clearCart}
                                className="w-full text-rust-500 hover:text-rust-400 text-sm transition-colors"
                            >
                                Wyczyść koszyk
                            </button>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
});

CartView.displayName = 'CartView';

export default CartView;

