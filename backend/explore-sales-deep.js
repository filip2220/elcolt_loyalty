/**
 * Deep Dive into Sales Data Sources
 * 
 * This script provides detailed exploration of:
 * 1. el1wdr_rules - WooCommerce Discount Rules plugin
 * 2. el1wlr_rewards - WPLoyalty rewards
 * 3. el1wlr_earn_campaign - WPLoyalty campaigns (potential offers)
 * 
 * Usage: cd backend && node explore-sales-deep.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function exploreSalesDeep() {
    console.log('\n🔍 DEEP DIVE: SALES DATA SOURCES\n');
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

        // =====================================================
        // WDR RULES - Full Details (Discount Rules Plugin)
        // =====================================================
        console.log('\n📋 1. WDR RULES (WooCommerce Discount Rules)\n');

        const [wdrRules] = await connection.query(`
            SELECT * FROM el1wdr_rules WHERE deleted = 0 ORDER BY priority
        `);

        console.log(`   Found ${wdrRules.length} active/non-deleted rules:\n`);

        for (const rule of wdrRules) {
            console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`   📌 Rule ID: ${rule.id}`);
            console.log(`      Title: ${rule.title}`);
            console.log(`      Enabled: ${rule.enabled ? 'YES' : 'NO'}`);
            console.log(`      Priority: ${rule.priority}`);
            console.log(`      Discount Type: ${rule.discount_type}`);

            // Parse product adjustments
            if (rule.product_adjustments) {
                try {
                    const adj = JSON.parse(rule.product_adjustments);
                    console.log(`      Product Adjustment: ${adj.type} - ${adj.value}%`);
                } catch (e) {
                    console.log(`      Product Adjustment: ${rule.product_adjustments}`);
                }
            }

            // Parse filters to see what products it applies to
            if (rule.filters) {
                try {
                    const filters = JSON.parse(rule.filters);
                    console.log(`      Applies to: ${JSON.stringify(filters)}`);
                } catch (e) {
                    console.log(`      Filters: ${rule.filters}`);
                }
            }

            // Date range
            if (rule.date_from || rule.date_to) {
                const fromDate = rule.date_from ? new Date(rule.date_from * 1000).toISOString() : 'N/A';
                const toDate = rule.date_to ? new Date(rule.date_to * 1000).toISOString() : 'N/A';
                console.log(`      Valid: ${fromDate} to ${toDate}`);
            }

            console.log(`      Created: ${rule.created_on}`);
        }

        // =====================================================
        // WPLoyalty REWARDS - Full Details
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 2. WPLR REWARDS (WPLoyalty Rewards)\n');

        const [wlrRewards] = await connection.query(`
            SELECT * FROM el1wlr_rewards ORDER BY ordering
        `);

        console.log(`   Found ${wlrRewards.length} rewards:\n`);

        for (const reward of wlrRewards) {
            console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`   📌 Reward ID: ${reward.id}`);
            console.log(`      Name: ${reward.name}`);
            console.log(`      Display Name: ${reward.display_name}`);
            console.log(`      Description: ${reward.description || '(none)'}`);
            console.log(`      Active: ${reward.active ? 'YES' : 'NO'}`);
            console.log(`      Type: ${reward.reward_type}`);
            console.log(`      Discount Type: ${reward.discount_type}`);
            console.log(`      Discount Value: ${reward.discount_value}`);
            console.log(`      Required Points: ${reward.require_point}`);
            console.log(`      Min/Max Points: ${reward.minimum_point} - ${reward.maximum_point}`);
            console.log(`      Usage Limits: ${reward.usage_limits || 'unlimited'}`);
            console.log(`      Show in Rewards: ${reward.is_show_reward ? 'YES' : 'NO'}`);
        }

        // =====================================================
        // WPLoyalty EARN CAMPAIGNS
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 3. WPLR EARN CAMPAIGNS (Points Earning Campaigns)\n');

        const [campaigns] = await connection.query(`
            SELECT * FROM el1wlr_earn_campaign ORDER BY id
        `);

        console.log(`   Found ${campaigns.length} campaigns:\n`);

        for (const campaign of campaigns) {
            console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`   📌 Campaign ID: ${campaign.id}`);
            console.log(`      Name: ${campaign.name}`);
            console.log(`      Active: ${campaign.active ? 'YES' : 'NO'}`);
            console.log(`      Action Type: ${campaign.action_type}`);
            console.log(`      Campaign Type: ${campaign.campaign_type}`);

            // Parse point rule
            if (campaign.point_rule) {
                try {
                    const rule = JSON.parse(campaign.point_rule);
                    console.log(`      Point Rule: ${JSON.stringify(rule, null, 8)}`);
                } catch (e) {
                    console.log(`      Point Rule: ${campaign.point_rule}`);
                }
            }
        }

        // =====================================================
        // Check for WPLoyalty settings/options
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📋 4. WORDPRESS OPTIONS (WPLoyalty/WDR related)\n');

        const [options] = await connection.query(`
            SELECT option_name, LEFT(option_value, 200) as option_value_truncated
            FROM el1options 
            WHERE option_name LIKE 'wlr%' 
               OR option_name LIKE 'wdr%'
               OR option_name LIKE '%loyalty%'
               OR option_name LIKE '%discount%'
            ORDER BY option_name
            LIMIT 20
        `);

        console.log(`   Found ${options.length} relevant options:\n`);
        for (const opt of options) {
            console.log(`   - ${opt.option_name}: ${opt.option_value_truncated?.substring(0, 100)}...`);
        }

        // =====================================================
        // CONCLUSION / RECOMMENDATIONS
        // =====================================================
        console.log('\n' + '='.repeat(70));
        console.log('\n📊 CONCLUSIONS & RECOMMENDATIONS\n');

        console.log('   Based on the database exploration:\n');

        console.log('   ┌─────────────────────────────────────────────────────────────────┐');
        console.log('   │ GROUP 1: PUBLIC SALES (Available on WooCommerce website)       │');
        console.log('   ├─────────────────────────────────────────────────────────────────┤');
        console.log('   │ Source: el1postmeta with _sale_price                           │');
        console.log('   │ Query: Products WHERE _sale_price IS NOT NULL AND != \'\'        │');
        console.log('   │ Optional: Filter by _sale_price_dates_from/to for scheduled    │');
        console.log('   └─────────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('   ┌─────────────────────────────────────────────────────────────────┐');
        console.log('   │ GROUP 2: APP-EXCLUSIVE OFFERS                                  │');
        console.log('   ├─────────────────────────────────────────────────────────────────┤');
        console.log('   │ Option A: el1wlr_rewards (WPLoyalty rewards - most suitable)   │');
        console.log('   │   - Already used by app for point redemptions                  │');
        console.log('   │   - Has discount_type, discount_value, is_show_reward          │');
        console.log('   │                                                                 │');
        console.log('   │ Option B: el1wdr_rules (Discount Rules plugin)                 │');
        console.log('   │   - WooCommerce Discount Rules plugin                          │');
        console.log('   │   - Has complex conditions, date ranges, etc.                  │');
        console.log('   │   - Currently has sample rules but not active                  │');
        console.log('   │                                                                 │');
        console.log('   │ Option C: Create custom table (e.g., el1app_sales)             │');
        console.log('   │   - Full control over structure                                │');
        console.log('   │   - Need to create and manage manually                         │');
        console.log('   └─────────────────────────────────────────────────────────────────┘');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
        console.log('\n' + '='.repeat(70) + '\n');
    }
}

exploreSalesDeep();
