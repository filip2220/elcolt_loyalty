/**
 * Checkout Routes
 * 
 * Handles checkout operations:
 * - POST /checkout/create-order - Create pending WooCommerce order
 */

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const verifyToken = require('../authMiddleware');

const router = express.Router();

/**
 * POST /checkout/create-order
 * Creates a pending order via WooCommerce REST API
 */
router.post('/checkout/create-order', verifyToken, async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Zamówienie musi zawierać przynajmniej jeden produkt.' });
    }

    // Validate each item
    for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity < 1) {
            return res.status(400).json({ message: 'Każdy produkt musi mieć prawidłowe ID i ilość.' });
        }
    }

    try {
        // Get user info
        const [users] = await db.query('SELECT user_email, display_name FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }
        const user = users[0];

        // Get phone from usermeta
        const [phoneMeta] = await db.query(
            'SELECT meta_value FROM el1usermeta WHERE user_id = ? AND meta_key = ?',
            [req.userId, 'billing_phone']
        );
        const phone = phoneMeta.length > 0 ? phoneMeta[0].meta_value : '';

        // Get first and last name from usermeta
        const [firstNameMeta] = await db.query(
            'SELECT meta_value FROM el1usermeta WHERE user_id = ? AND meta_key = ?',
            [req.userId, 'first_name']
        );
        const [lastNameMeta] = await db.query(
            'SELECT meta_value FROM el1usermeta WHERE user_id = ? AND meta_key = ?',
            [req.userId, 'last_name']
        );
        const firstName = firstNameMeta.length > 0 ? firstNameMeta[0].meta_value : user.display_name.split(' ')[0] || '';
        const lastName = lastNameMeta.length > 0 ? lastNameMeta[0].meta_value : user.display_name.split(' ').slice(1).join(' ') || '';

        // WooCommerce API credentials
        const wcStoreUrl = process.env.WC_STORE_URL || 'https://etaktyczne.pl';
        const wcConsumerKey = process.env.WC_CONSUMER_KEY;
        const wcConsumerSecret = process.env.WC_CONSUMER_SECRET;

        if (!wcConsumerKey || !wcConsumerSecret) {
            console.error('WooCommerce API credentials not configured');
            return res.status(500).json({ message: 'Konfiguracja sklepu jest nieprawidłowa. Skontaktuj się z obsługą.' });
        }

        // Prepare order data
        const lineItems = items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));

        const orderData = {
            status: 'pending',
            billing: {
                first_name: firstName,
                last_name: lastName,
                email: user.user_email,
                phone: phone
            },
            line_items: lineItems,
            customer_id: req.userId,
            set_paid: false
        };

        // Make request to WooCommerce REST API
        const wcApiUrl = `${wcStoreUrl}/wp-json/wc/v3/orders`;
        const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');

        const response = await fetch(wcApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('WooCommerce API error:', response.status, errorData);
            return res.status(500).json({
                message: 'Nie udało się utworzyć zamówienia w sklepie. Spróbuj ponownie.'
            });
        }

        const wcOrder = await response.json();

        // Build checkout URL
        const finalCheckoutUrl = `${wcStoreUrl}/kasa/order-pay/${wcOrder.id}/?pay_for_order=true&key=${wcOrder.order_key}`;

        // Generate one-time login token
        const loginToken = crypto.randomBytes(32).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

        await db.query(
            `INSERT INTO el1app_login_tokens (user_id, token, redirect_url, created_at, expires_at, used) 
             VALUES (?, ?, ?, ?, ?, 0)`,
            [req.userId, loginToken, finalCheckoutUrl, now, expiresAt]
        );

        // Build auto-login URL
        const autoLoginUrl = `${wcStoreUrl}/?app_login_token=${loginToken}`;

        res.status(201).json({
            orderId: wcOrder.id,
            checkoutUrl: autoLoginUrl,
            orderKey: wcOrder.order_key,
            total: wcOrder.total
        });

    } catch (error) {
        console.error('Create checkout order error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas tworzenia zamówienia.' });
    }
});

module.exports = router;
