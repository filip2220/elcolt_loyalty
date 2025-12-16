/**
 * Test all possible password verification methods
 */
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const wphash = require('wordpress-hash-node');

async function test() {
    try {
        const email = 'test100@baletteam.testinator.email';
        const password = 'Flip5times.15';

        const [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found!');
            process.exit(1);
        }

        const wpHash = users[0].user_pass;
        console.log('=== Testing All Methods ===\n');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Hash in DB:', wpHash);
        console.log('Hash prefix:', wpHash.substring(0, 4));

        // Method 1: WordPress 6.8+ with HMAC-SHA384
        console.log('\n--- Method 1: WordPress 6.8+ HMAC-SHA384 ---');
        const bcryptHash = wpHash.substring(3);
        const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
        console.log('HMAC result:', hmacHash);
        const result1 = await bcrypt.compare(hmacHash, bcryptHash);
        console.log('Result:', result1 ? '✅ MATCH' : '❌ no match');

        // Method 2: Direct bcrypt (no pre-hash, just strip $wp)
        console.log('\n--- Method 2: Direct bcrypt (no pre-hash) ---');
        const result2 = await bcrypt.compare(password, bcryptHash);
        console.log('Result:', result2 ? '✅ MATCH' : '❌ no match');

        // Method 3: wordpress-hash-node on the full hash
        console.log('\n--- Method 3: wordpress-hash-node (full hash) ---');
        const result3 = wphash.CheckPassword(password, wpHash);
        console.log('Result:', result3 ? '✅ MATCH' : '❌ no match');

        // Method 4: wordpress-hash-node on bcrypt portion
        console.log('\n--- Method 4: wordpress-hash-node (bcrypt portion) ---');
        const result4 = wphash.CheckPassword(password, bcryptHash);
        console.log('Result:', result4 ? '✅ MATCH' : '❌ no match');

        // Method 5: Try with trimmed password
        console.log('\n--- Method 5: HMAC-SHA384 with trimmed password ---');
        const hmacHash5 = crypto.createHmac('sha384', 'wp-sha384').update(password.trim()).digest('base64');
        const result5 = await bcrypt.compare(hmacHash5, bcryptHash);
        console.log('Result:', result5 ? '✅ MATCH' : '❌ no match');

        // Show what we expect
        console.log('\n=== Summary ===');
        console.log('All methods failed. The password or hash is different from expected.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

test();
