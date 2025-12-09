/**
 * Database Exploration Script - Find Sales-Related Tables
 * 
 * This script explores the database to find:
 * 1. WooCommerce sale-related tables and data
 * 2. WT (WooCommerce/WordPress) tables that might store app-specific sales
 * 
 * Usage: cd backend && node explore-sales-tables.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function exploreSalesTables() {
    console.log('\n🔍 EXPLORING DATABASE FOR SALES-RELATED TABLES\n');
    console.log('='.repeat(70));

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
        });
        console.log(`✅ Connected to database: ${process.env.DB_NAME}\n`);

        // =====================================================
        // STEP 1: List ALL tables in the database
        // =====================================================
        console.log('📋 STEP 1: All Tables in Database\n');
        const [allTables] = await connection.query('SHOW TABLES');
        const tableNames = allTables.map(row => Object.values(row)[0]);

        console.log(`   Found ${tableNames.length} total tables:\n`);
        tableNames.forEach(name => {
            // Highlight potential sales/discount tables
            const lowerName = name.toLowerCase();
            if (lowerName.includes('sale') || lowerName.includes('discount') ||
                lowerName.includes('promo') || lowerName.includes('offer') ||
                lowerName.includes('wt_') || lowerName.includes('wdr')) {
                console.log(`   🎯 ${name} (POTENTIAL SALES TABLE)`);
            } else {
                console.log(`      ${name}`);
            }
        });

        // =====================================================
        // STEP 2: Check for WDR (WooCommerce Discount Rules) tables
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 STEP 2: WDR (Discount Rules) Tables\n');

        const wdrTables = tableNames.filter(name => name.toLowerCase().includes('wdr'));
        if (wdrTables.length > 0) {
            for (const table of wdrTables) {
                console.log(`\n   📌 Table: ${table}`);

                // Get table structure
                const [columns] = await connection.query(`DESCRIBE ${table}`);
                console.log('   Columns:');
                columns.forEach(col => {
                    console.log(`      - ${col.Field} (${col.Type})`);
                });

                // Get sample data
                const [sampleData] = await connection.query(`SELECT * FROM ${table} LIMIT 5`);
                console.log(`\n   Sample Data (${sampleData.length} rows):`);
                if (sampleData.length > 0) {
                    console.log('   ', JSON.stringify(sampleData[0], null, 2).split('\n').join('\n   '));
                } else {
                    console.log('   (no data)');
                }
            }
        } else {
            console.log('   No WDR tables found.');
        }

        // =====================================================
        // STEP 3: Check for WT tables (app-specific tables)
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 STEP 3: WT/Custom Tables (looking for patterns like wt_, custom_, app_)\n');

        const customTables = tableNames.filter(name => {
            const lower = name.toLowerCase();
            return lower.includes('wt_') || lower.includes('custom') ||
                lower.includes('app_') || lower.includes('loyalty');
        });

        if (customTables.length > 0) {
            for (const table of customTables) {
                console.log(`\n   📌 Table: ${table}`);
                const [columns] = await connection.query(`DESCRIBE ${table}`);
                console.log('   Columns:');
                columns.forEach(col => {
                    console.log(`      - ${col.Field} (${col.Type})`);
                });
            }
        } else {
            console.log('   No WT/custom tables found.');
        }

        // =====================================================
        // STEP 4: Find products currently on sale in WooCommerce
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 STEP 4: Products Currently On Sale (WooCommerce)\n');

        // Products with sale price in postmeta
        const [saleProducts] = await connection.query(`
            SELECT 
                p.ID as product_id,
                p.post_title as product_name,
                p.post_status,
                regular.meta_value as regular_price,
                sale.meta_value as sale_price,
                sale_from.meta_value as sale_from_date,
                sale_to.meta_value as sale_to_date
            FROM el1posts p
            LEFT JOIN el1postmeta regular ON p.ID = regular.post_id AND regular.meta_key = '_regular_price'
            LEFT JOIN el1postmeta sale ON p.ID = sale.post_id AND sale.meta_key = '_sale_price'
            LEFT JOIN el1postmeta sale_from ON p.ID = sale_from.post_id AND sale_from.meta_key = '_sale_price_dates_from'
            LEFT JOIN el1postmeta sale_to ON p.ID = sale_to.post_id AND sale_to.meta_key = '_sale_price_dates_to'
            WHERE p.post_type = 'product' 
              AND p.post_status = 'publish'
              AND sale.meta_value IS NOT NULL 
              AND sale.meta_value != ''
            ORDER BY p.post_title
            LIMIT 20
        `);

        console.log(`   Found ${saleProducts.length} products with sale prices:\n`);
        saleProducts.forEach(product => {
            const discount = product.regular_price && product.sale_price
                ? Math.round((1 - parseFloat(product.sale_price) / parseFloat(product.regular_price)) * 100)
                : 0;
            console.log(`   - ${product.product_name}`);
            console.log(`     Regular: ${product.regular_price} PLN → Sale: ${product.sale_price} PLN (${discount}% off)`);
            if (product.sale_from_date || product.sale_to_date) {
                console.log(`     Date range: ${product.sale_from_date || '(no start)'} to ${product.sale_to_date || '(no end)'}`);
            }
        });

        // =====================================================
        // STEP 5: Check WLR (WPLoyalty) tables for app-specific offers
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 STEP 5: WPLoyalty Tables (potential app-specific sales)\n');

        const wlrTables = tableNames.filter(name => name.toLowerCase().includes('wlr'));
        if (wlrTables.length > 0) {
            console.log(`   Found ${wlrTables.length} WLR tables:\n`);
            for (const table of wlrTables) {
                const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM ${table}`);
                console.log(`   - ${table} (${count[0].cnt} rows)`);
            }

            // Check for any discount/offer related columns in wlr_rewards
            console.log('\n   Checking el1wlr_rewards structure:');
            try {
                const [rewardsColumns] = await connection.query('DESCRIBE el1wlr_rewards');
                rewardsColumns.forEach(col => {
                    console.log(`      - ${col.Field} (${col.Type})`);
                });

                // Sample rewards data
                const [rewardsData] = await connection.query('SELECT * FROM el1wlr_rewards LIMIT 3');
                console.log('\n   Sample rewards:');
                rewardsData.forEach(reward => {
                    console.log(`      - ${reward.name} (${reward.points_required} points, status: ${reward.status})`);
                });
            } catch (e) {
                console.log(`      Error: ${e.message}`);
            }
        }

        // =====================================================
        // STEP 6: Look for coupon-related tables
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 STEP 6: Coupon/Promo Code Tables\n');

        // WooCommerce coupons are stored in wp_posts with post_type = 'shop_coupon'
        const [coupons] = await connection.query(`
            SELECT 
                p.ID,
                p.post_title as coupon_code,
                p.post_status,
                p.post_date,
                discount_type.meta_value as discount_type,
                coupon_amount.meta_value as coupon_amount,
                usage_limit.meta_value as usage_limit,
                usage_count.meta_value as usage_count,
                expiry_date.meta_value as expiry_date
            FROM el1posts p
            LEFT JOIN el1postmeta discount_type ON p.ID = discount_type.post_id AND discount_type.meta_key = 'discount_type'
            LEFT JOIN el1postmeta coupon_amount ON p.ID = coupon_amount.post_id AND coupon_amount.meta_key = 'coupon_amount'
            LEFT JOIN el1postmeta usage_limit ON p.ID = usage_limit.post_id AND usage_limit.meta_key = 'usage_limit'
            LEFT JOIN el1postmeta usage_count ON p.ID = usage_count.post_id AND usage_count.meta_key = 'usage_count'
            LEFT JOIN el1postmeta expiry_date ON p.ID = expiry_date.post_id AND expiry_date.meta_key = 'date_expires'
            WHERE p.post_type = 'shop_coupon'
              AND p.post_status = 'publish'
            ORDER BY p.post_date DESC
            LIMIT 10
        `);

        console.log(`   Found ${coupons.length} active coupons:\n`);
        coupons.forEach(coupon => {
            console.log(`   - ${coupon.coupon_code}`);
            console.log(`     Type: ${coupon.discount_type}, Amount: ${coupon.coupon_amount}`);
            console.log(`     Usage: ${coupon.usage_count || 0}/${coupon.usage_limit || 'unlimited'}`);
            if (coupon.expiry_date) {
                const expiryDate = new Date(parseInt(coupon.expiry_date) * 1000);
                console.log(`     Expires: ${expiryDate.toISOString()}`);
            }
        });

        // =====================================================
        // SUMMARY
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📊 SUMMARY\n');
        console.log('   Potential sources for "Sales" module:');
        console.log('');
        console.log('   1. PUBLIC SALES (WooCommerce website):');
        console.log(`      - Products with _sale_price in el1postmeta (${saleProducts.length} found)`);
        console.log('      - Scheduled sales via _sale_price_dates_from/to');
        console.log('');
        console.log('   2. APP-SPECIFIC SALES (potential locations):');
        if (wdrTables.length > 0) {
            console.log(`      - WDR tables for discount rules: ${wdrTables.join(', ')}`);
        }
        if (wlrTables.length > 0) {
            console.log(`      - WPLoyalty tables for loyalty rewards/offers`);
        }
        console.log(`      - Coupons in el1posts (post_type = 'shop_coupon'): ${coupons.length} found`);
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the database server is running and accessible.');
        }
    } finally {
        if (connection) await connection.end();
        console.log('\n' + '='.repeat(70) + '\n');
    }
}

exploreSalesTables();
