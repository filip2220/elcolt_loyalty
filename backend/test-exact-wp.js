/**
 * Test the exact WordPress 6.8+ password check implementation
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
        console.log('=== WordPress 6.8+ Exact Implementation Test ===\n');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Full hash in DB:', wpHash);
        console.log('Hash length:', wpHash.length);

        // WordPress uses substr($hash, 3) to remove '$wp' (3 characters)
        // NOT '$wp$' (4 characters)
        const bcryptHash = wpHash.substring(3);  // Remove first 3 chars: '$wp'
        console.log('\nAfter substring(3):', bcryptHash);
        console.log('Bcrypt hash length:', bcryptHash.length);

        // WordPress: base64_encode(hash_hmac('sha384', $password, 'wp-sha384', true))
        const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
        console.log('\nHMAC-SHA384 (base64):', hmacHash);
        console.log('HMAC length:', hmacHash.length);

        // Compare using password_verify equivalent
        const result = await bcrypt.compare(hmacHash, bcryptHash);

        console.log('\n=== RESULT ===');
        if (result) {
            console.log('✅✅✅ PASSWORD MATCHES! ✅✅✅');
        } else {
            console.log('❌ Still no match.');

            // Debug: Let's also try with the old method (replace)
            const bcryptHash2 = wpHash.replace('$wp', '');
            console.log('\nTrying with replace method:');
            console.log('After replace:', bcryptHash2);
            const result2 = await bcrypt.compare(hmacHash, bcryptHash2);
            console.log('Result:', result2 ? 'MATCH' : 'no match');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

test();
