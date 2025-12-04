/**
 * Database Verification Script
 * 
 * Run this script to check if your database is properly configured
 * and all required tables exist.
 * 
 * Usage: node verify-database.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Required tables for the app to function
const REQUIRED_TABLES = [
    { name: 'el1users', description: 'User accounts', critical: true },
    { name: 'el1usermeta', description: 'User profile data', critical: true },
    { name: 'el1wlr_users', description: 'Loyalty points per user', critical: true },
    { name: 'el1wlr_levels', description: 'Loyalty level definitions', critical: true },
    { name: 'el1wlr_rewards', description: 'Available rewards', critical: true },
    { name: 'el1wlr_user_rewards', description: 'Redeemed rewards history', critical: true },
    { name: 'el1wc_order_product_lookup', description: 'Order history', critical: false },
    { name: 'el1posts', description: 'Product information', critical: false },
    { name: 'el1postmeta', description: 'Product metadata (images, attributes)', critical: false },
    { name: 'el1wdr_order_item_discounts', description: 'Discount tracking (for savings)', critical: false },
    { name: 'el1password_reset_tokens', description: 'Password reset feature', critical: false },
];

async function verifyDatabase() {
    console.log('\n🔍 EL COLT LOYALTY APP - Database Verification\n');
    console.log('='.repeat(60));

    // Check environment variables
    console.log('\n📋 Step 1: Checking Environment Variables...\n');
    
    const envVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
    let envOk = true;
    
    for (const varName of envVars) {
        if (process.env[varName]) {
            console.log(`   ✅ ${varName} is set`);
        } else {
            console.log(`   ❌ ${varName} is MISSING`);
            envOk = false;
        }
    }

    if (!envOk) {
        console.log('\n❌ Some environment variables are missing!');
        console.log('   Please check your .env file and try again.\n');
        process.exit(1);
    }

    // Try to connect to database
    console.log('\n📋 Step 2: Testing Database Connection...\n');
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
        });
        console.log(`   ✅ Successfully connected to database!`);
        console.log(`   📍 Host: ${process.env.DB_HOST}`);
        console.log(`   📁 Database: ${process.env.DB_NAME}`);
    } catch (error) {
        console.log(`   ❌ Failed to connect to database!`);
        console.log(`\n   Error: ${error.message}\n`);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('   💡 Tip: The database server is not reachable.');
            console.log('      - Check if DB_HOST is correct');
            console.log('      - Check if the database server is running');
            console.log('      - Check if your IP is allowed for remote access\n');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('   💡 Tip: Username or password is incorrect.');
            console.log('      - Double-check your DB_USER and DB_PASSWORD\n');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('   💡 Tip: The database does not exist.');
            console.log('      - Check if DB_NAME is spelled correctly\n');
        }
        process.exit(1);
    }

    // Check for required tables
    console.log('\n📋 Step 3: Checking Required Tables...\n');
    
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0].toLowerCase());
    
    let criticalMissing = false;
    let optionalMissing = [];
    
    for (const table of REQUIRED_TABLES) {
        const exists = tableNames.includes(table.name.toLowerCase());
        
        if (exists) {
            console.log(`   ✅ ${table.name} - ${table.description}`);
        } else if (table.critical) {
            console.log(`   ❌ ${table.name} - ${table.description} [CRITICAL - MISSING]`);
            criticalMissing = true;
        } else {
            console.log(`   ⚠️  ${table.name} - ${table.description} [OPTIONAL - MISSING]`);
            optionalMissing.push(table.name);
        }
    }

    // Check user count
    console.log('\n📋 Step 4: Checking Data...\n');
    
    try {
        const [users] = await connection.query('SELECT COUNT(*) as count FROM el1users');
        console.log(`   👥 Users in database: ${users[0].count}`);
    } catch (e) {
        console.log(`   ⚠️  Could not count users`);
    }

    try {
        const [levels] = await connection.query('SELECT COUNT(*) as count FROM el1wlr_levels');
        console.log(`   🏆 Loyalty levels defined: ${levels[0].count}`);
    } catch (e) {
        console.log(`   ⚠️  Could not count loyalty levels`);
    }

    try {
        const [rewards] = await connection.query('SELECT COUNT(*) as count FROM el1wlr_rewards WHERE status = "wlr_active"');
        console.log(`   🎁 Active rewards: ${rewards[0].count}`);
    } catch (e) {
        console.log(`   ⚠️  Could not count rewards`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 VERIFICATION SUMMARY\n');
    
    if (criticalMissing) {
        console.log('   ❌ FAILED - Critical tables are missing!');
        console.log('\n   The WooCommerce Loyalty plugin may not be installed.');
        console.log('   Install it on your WordPress site first.\n');
    } else if (optionalMissing.length > 0) {
        console.log('   ⚠️  PARTIAL SUCCESS - Some optional tables are missing:');
        for (const table of optionalMissing) {
            console.log(`      - ${table}`);
        }
        if (optionalMissing.includes('wp_password_reset_tokens')) {
            console.log('\n   💡 To enable password reset, create the table by running:');
            console.log('      See CREATE_PASSWORD_RESET_TABLE.txt for the SQL script\n');
        }
        console.log('\n   The app will work but some features may be limited.\n');
    } else {
        console.log('   ✅ SUCCESS - All tables found!');
        console.log('\n   Your database is ready to use.\n');
    }

    await connection.end();
    console.log('='.repeat(60) + '\n');
}

// Run verification
verifyDatabase().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});

