/**
 * User Routes
 * 
 * Handles user-related operations:
 * - GET /user/profile - Get user profile
 * - GET /user/points - Get loyalty points
 * - GET /user/activity - Get order activity
 * - GET /user/savings - Get total savings
 * - GET /user/qrcode-data - Get QR code data
 */

const express = require('express');
const db = require('../db');
const verifyToken = require('../authMiddleware');

const router = express.Router();

/**
 * GET /debug/orders (TEMPORARY - remove after debugging)
 * Diagnoses order data for a user
 */
router.get('/debug/orders', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;
        const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [userId]);
        const userEmail = users[0]?.user_email;

        const results = { userId, userEmail, tables: {} };

        // Check el1wc_order_product_lookup
        const [lookup] = await db.query(
            'SELECT COUNT(*) as count FROM el1wc_order_product_lookup WHERE customer_id = ?',
            [userId]
        );
        results.tables.wc_order_product_lookup_by_id = lookup[0].count;

        // Check HPOS orders table (el1wc_orders) - this is the new WooCommerce order storage
        try {
            const [hposOrders] = await db.query(
                'SELECT COUNT(*) as count FROM el1wc_orders WHERE customer_id = ?',
                [userId]
            );
            results.tables.wc_orders_by_customer_id = hposOrders[0].count;

            // Also check by billing email in HPOS
            const [hposOrdersByEmail] = await db.query(
                'SELECT COUNT(*) as count FROM el1wc_orders WHERE billing_email = ?',
                [userEmail]
            );
            results.tables.wc_orders_by_email = hposOrdersByEmail[0].count;

            // Get sample HPOS order IDs
            const [sampleHpos] = await db.query(
                'SELECT id FROM el1wc_orders WHERE billing_email = ? OR customer_id = ? ORDER BY date_created_gmt DESC LIMIT 10',
                [userEmail, userId]
            );
            results.hpos_order_ids = sampleHpos.map(o => o.id);

            // Show columns of wc_orders table
            const [cols] = await db.query('DESCRIBE el1wc_orders');
            results.wc_orders_columns = cols.map(c => c.Field);
        } catch (e) {
            results.tables.wc_orders = 'error: ' + e.message;
        }

        // Check woocommerce_order_items for HPOS orders
        try {
            const [hposItems] = await db.query(
                `SELECT COUNT(*) as count FROM el1woocommerce_order_items oi
                 INNER JOIN el1wc_orders o ON oi.order_id = o.id
                 WHERE o.billing_email = ? OR o.customer_id = ?`,
                [userEmail, userId]
            );
            results.tables.woocommerce_order_items_hpos = hposItems[0].count;
        } catch (e) {
            results.tables.woocommerce_order_items_hpos = 'error: ' + e.message;
        }

        res.json(results);
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /user/profile
 * Fetches user profile data
 */
router.get('/user/profile', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query('SELECT ID, display_name, user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }
        const user = users[0];
        res.json({
            id: user.ID,
            name: user.display_name,
            email: user.user_email
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania profilu.' });
    }
});

/**
 * GET /user/points
 * Fetches user's points and loyalty level
 */
router.get('/user/points', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono zalogowanego użytkownika.' });
        }
        const userEmail = users[0].user_email;

        const query = `
            SELECT
                u.earn_total_point,
                u.level_id,
                l.name AS level_name
            FROM
                el1wlr_users AS u
            LEFT JOIN
                el1wlr_levels AS l ON u.level_id = l.id
            WHERE
                u.user_email = ?
        `;
        const [loyaltyRows] = await db.query(query, [userEmail]);

        if (loyaltyRows.length === 0) {
            return res.json({
                points: 0,
                level: { name: 'Członek', level_id: null }
            });
        }

        const loyaltyData = loyaltyRows[0];
        const points = parseInt(loyaltyData.earn_total_point, 10) || 0;
        const levelId = loyaltyData.level_id != null ? parseInt(loyaltyData.level_id, 10) : null;
        const levelName = loyaltyData.level_name || 'Członek';

        res.json({
            points,
            level: { name: levelName, level_id: levelId }
        });
    } catch (error) {
        console.error('Get points error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania punktów.' });
    }
});

/**
 * GET /user/activity
 * Fetches user's order activity for loyalty points (product-level details)
 * Uses WooCommerce HPOS tables (el1wc_orders + el1woocommerce_order_items)
 */
router.get('/user/activity', verifyToken, async (req, res) => {
    try {
        console.log('Fetching activity for user ID:', req.userId);

        // First get the user's email to also find guest orders
        const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }
        const userEmail = users[0].user_email;
        console.log('User email:', userEmail);

        // Query HPOS tables - one row per ORDER (not per line item)
        // Filter by customer_id and only completed orders
        const query = `
            SELECT
                o.id as order_item_id,
                GROUP_CONCAT(oi.order_item_name SEPARATOR ', ') as product_name,
                o.date_created_gmt as date_created,
                SUM(CAST((SELECT meta_value FROM el1woocommerce_order_itemmeta WHERE order_item_id = oi.order_item_id AND meta_key = '_qty' LIMIT 1) AS UNSIGNED)) as product_qty,
                o.total_amount as product_gross_revenue
            FROM el1wc_orders o
            INNER JOIN el1woocommerce_order_items oi ON o.id = oi.order_id AND oi.order_item_type = 'line_item'
            WHERE o.customer_id = ? AND o.status = 'wc-completed'
            GROUP BY o.id, o.date_created_gmt, o.total_amount
            ORDER BY o.date_created_gmt DESC
            LIMIT 50
        `;
        const [orderItems] = await db.query(query, [req.userId]);
        console.log('Found', orderItems.length, 'order items for user');

        // Format response to match OrderActivity type
        const formattedActivity = orderItems.map(item => ({
            order_item_id: item.order_item_id,
            product_name: item.product_name || 'Produkt',
            date_created: item.date_created,
            product_qty: parseInt(item.product_qty, 10) || 1,
            product_gross_revenue: parseFloat(item.product_gross_revenue) || 0
        }));

        res.json(formattedActivity);
    } catch (error) {
        console.error('Get activity error:', error.message);
        console.error('Error code:', error.code);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania aktywności.' });
    }
});

/**
 * GET /user/savings
 * Fetches user's total savings from orders
 */
router.get('/user/savings', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono zalogowanego użytkownika.' });
        }
        const userEmail = users[0].user_email;

        // Calculate total savings from completed orders with discounts
        const query = `
            SELECT 
                COALESCE(SUM(CAST(discount.meta_value AS DECIMAL(10,2))), 0) as total_savings
            FROM el1posts o
            INNER JOIN el1postmeta email_meta ON o.ID = email_meta.post_id AND email_meta.meta_key = '_billing_email'
            LEFT JOIN el1postmeta discount ON o.ID = discount.post_id AND discount.meta_key = '_cart_discount'
            WHERE o.post_type = 'shop_order' 
            AND email_meta.meta_value = ?
        `;
        const [result] = await db.query(query, [userEmail]);

        res.json({
            totalSavings: parseFloat(result[0]?.total_savings) || 0
        });
    } catch (error) {
        console.error('Get savings error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania oszczędności.' });
    }
});

/**
 * GET /user/qrcode-data
 * Fetches data for QR code generation
 */
router.get('/user/qrcode-data', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query('SELECT display_name FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }

        const [phoneMeta] = await db.query(
            'SELECT meta_value FROM el1usermeta WHERE user_id = ? AND meta_key = ?',
            [req.userId, 'billing_phone']
        );

        res.json({
            name: users[0].display_name,
            phone: phoneMeta.length > 0 ? phoneMeta[0].meta_value : null
        });
    } catch (error) {
        console.error('Get QR code data error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania danych QR.' });
    }
});

module.exports = router;
