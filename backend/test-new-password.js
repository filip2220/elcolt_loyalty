/**
 * Test the new password with the updated implementation
 */
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function test() {
    try {
        const email = 'test100@baletteam.testinator.email';
        const password = 'Flip5times.15';  // New password

        const [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found!');
            process.exit(1);
        }

        const wpHash = users[0].user_pass;
        console.log('=== Testing New Password ===\n');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Hash in DB:', wpHash);

        // Test with our implementation
        if (wpHash.startsWith('$wp')) {
            const bcryptHash = wpHash.substring(3);
            const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');

            console.log('\nBcrypt hash:', bcryptHash);
            console.log('HMAC-SHA384:', hmacHash);

            const result = await bcrypt.compare(hmacHash, bcryptHash);

            console.log('\n=== RESULT ===');
            if (result) {
                console.log('✅✅✅ PASSWORD MATCHES! ✅✅✅');
                console.log('Login should now work!');
            } else {
                console.log('❌ PASSWORD DOES NOT MATCH');
            }
        } else {
            console.log('Hash is not in WordPress 6.8+ format');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

test();
