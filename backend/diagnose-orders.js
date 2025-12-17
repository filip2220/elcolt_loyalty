const db = require('./db');

async function diagnose() {
    try {
        // Check total records in the lookup table
        const [total] = await db.query('SELECT COUNT(*) as count FROM el1wc_order_product_lookup');
        console.log('Total order items in table:', total[0].count);

        // Check how many unique customers
        const [customers] = await db.query('SELECT DISTINCT customer_id, COUNT(*) as items FROM el1wc_order_product_lookup GROUP BY customer_id ORDER BY items DESC LIMIT 10');
        console.log('\nCustomer IDs with order counts:');
        customers.forEach(c => console.log('  customer_id:', c.customer_id, '- items:', c.items));

        // Check user 2's email
        const [user] = await db.query('SELECT ID, user_email, display_name FROM el1users WHERE ID = 2');
        if (user.length > 0) {
            console.log('\nUser ID 2:', user[0].user_email, '-', user[0].display_name);

            // Check if there are orders by email in postmeta
            const [ordersByEmail] = await db.query(
                "SELECT COUNT(DISTINCT pm.post_id) as order_count FROM el1postmeta pm WHERE pm.meta_key = '_billing_email' AND pm.meta_value = ?",
                [user[0].user_email]
            );
            console.log('Orders found by email in postmeta:', ordersByEmail[0].order_count);
        }

        // Show sample of lookup table structure
        const [sample] = await db.query('SELECT * FROM el1wc_order_product_lookup LIMIT 1');
        console.log('\nTable columns:', Object.keys(sample[0] || {}));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

diagnose();
