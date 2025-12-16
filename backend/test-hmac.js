/**
 * Test WordPress 6.8+ HMAC-SHA384 password verification
 */
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function test() {
    try {
        const email = 'test100@baletteam.testinator.email';
        const password = 'Flip5times.14';

        const [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found!');
            process.exit(1);
        }

        const wpHash = users[0].user_pass;
        console.log('=== WordPress 6.8+ HMAC-SHA384 Test ===\n');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Full hash in DB:', wpHash);

        // Remove $wp prefix
        const bcryptHash = wpHash.replace('$wp', '');
        console.log('\nBcrypt hash (after removing $wp):', bcryptHash);

        // WordPress uses HMAC-SHA384 with key 'wp-sha384'
        // PHP: base64_encode(hash_hmac('sha384', $password, 'wp-sha384', true))
        const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
        console.log('HMAC-SHA384 (base64):', hmacHash);

        // Compare
        const result = await bcrypt.compare(hmacHash, bcryptHash);

        console.log('\n=== RESULT ===');
        if (result) {
            console.log('✅✅✅ PASSWORD MATCHES! ✅✅✅');
            console.log('The fix is working! Login should now work.');
        } else {
            console.log('❌ Still no match.');
            console.log('\nDebug info:');
            console.log('HMAC output length:', hmacHash.length);

            // Also test direct comparison (no HMAC)
            const directResult = await bcrypt.compare(password, bcryptHash);
            console.log('Direct bcrypt (without HMAC):', directResult ? 'MATCH' : 'no match');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

test();
