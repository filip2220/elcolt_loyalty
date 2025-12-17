/**
 * Diagnostic script to check user order data relationships
 * Run with: node diagnose-user-orders.js
 */

const db = require('./db');

const USER_EMAIL = 'wcekot85@gmail.com';

async function diagnose() {
    try {
        console.log('='.repeat(60));
        console.log('DIAGNOSING USER:', USER_EMAIL);
        console.log('='.repeat(60));

        // 1. Get WordPress user info
        console.log('\n1. WordPress User (el1users):');
        const [wpUser] = await db.query(
            'SELECT ID, user_email, display_name FROM el1users WHERE user_email = ?',
            [USER_EMAIL]
        );
        console.log(wpUser);
        const wpUserId = wpUser[0]?.ID;

        // 2. Get WooCommerce customer lookup
        console.log('\n2. WooCommerce Customer Lookup (el1wc_customer_lookup):');
        const [wcCustomer] = await db.query(
            'SELECT * FROM el1wc_customer_lookup WHERE user_id = ? OR email = ?',
            [wpUserId, USER_EMAIL]
        );
        console.log(wcCustomer);
        const wcCustomerId = wcCustomer[0]?.customer_id;

        // 3. Check orders in HPOS by customer_id
        console.log('\n3. HPOS Orders by WC customer_id (el1wc_orders):');
        if (wcCustomerId) {
            const [hposOrdersByCustomerId] = await db.query(
                'SELECT id, customer_id, billing_email, status, total_amount, date_created_gmt FROM el1wc_orders WHERE customer_id = ? LIMIT 10',
                [wcCustomerId]
            );
            console.log(hposOrdersByCustomerId);
        } else {
            console.log('No WC customer_id found');
        }

        // 4. Check orders in HPOS by billing_email
        console.log('\n4. HPOS Orders by billing_email (el1wc_orders):');
        const [hposOrdersByEmail] = await db.query(
            'SELECT id, customer_id, billing_email, status, total_amount, date_created_gmt FROM el1wc_orders WHERE billing_email = ? LIMIT 10',
            [USER_EMAIL]
        );
        console.log(hposOrdersByEmail);

        // 5. Check orders in HPOS directly by WordPress user ID (in case customer_id = user_id)
        console.log('\n5. HPOS Orders by WordPress user_id as customer_id (el1wc_orders):');
        if (wpUserId) {
            const [hposOrdersByWpId] = await db.query(
                'SELECT id, customer_id, billing_email, status, total_amount, date_created_gmt FROM el1wc_orders WHERE customer_id = ? LIMIT 10',
                [wpUserId]
            );
            console.log(hposOrdersByWpId);
        }

        // 6. Check physical store orders by WordPress user ID
        console.log('\n6. Physical Store Orders by WordPress user_id (el1_physical_store_orders):');
        if (wpUserId) {
            const [physicalOrders] = await db.query(
                'SELECT * FROM el1_physical_store_orders WHERE customer_id = ? LIMIT 10',
                [wpUserId]
            );
            console.log(physicalOrders);
        }

        // 7. Check loyalty data
        console.log('\n7. Loyalty User (el1wlr_users):');
        const [loyaltyUser] = await db.query(
            'SELECT * FROM el1wlr_users WHERE user_email = ?',
            [USER_EMAIL]
        );
        console.log(loyaltyUser);

        // 8. Show all unique statuses in el1wc_orders
        console.log('\n8. All order statuses in el1wc_orders:');
        const [statuses] = await db.query(
            'SELECT DISTINCT status, COUNT(*) as count FROM el1wc_orders GROUP BY status'
        );
        console.log(statuses);

        // 9. Check el1wc_customer_lookup structure
        console.log('\n9. el1wc_customer_lookup table structure:');
        const [lookupCols] = await db.query('DESCRIBE el1wc_customer_lookup');
        console.log(lookupCols.map(c => c.Field));

        console.log('\n' + '='.repeat(60));
        console.log('DIAGNOSIS COMPLETE');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('Diagnosis error:', error);
        process.exit(1);
    }
}

diagnose();
