/**
 * Test WordPress 6.8+ password verification with SHA-384 pre-hash
 */
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function testWP68Password(password) {
    try {
        const email = 'test100@baletteam.testinator.email';
        const [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found!');
            process.exit(1);
        }

        const hash = users[0].user_pass;
        console.log('\n=== WordPress 6.8+ Password Test ===');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Hash in DB:', hash);

        // WordPress 6.8+ format: $wp$2y$10$...
        if (hash.startsWith('$wp$')) {
            console.log('\n✅ Detected WordPress 6.8+ format');

            // Step 1: Remove $wp prefix
            const bcryptHash = hash.replace('$wp', '');
            console.log('Bcrypt hash (after removing $wp):', bcryptHash);

            // Step 2: Pre-hash password with SHA-384 and base64 encode
            const sha384Hash = crypto.createHash('sha384').update(password).digest('base64');
            console.log('SHA-384 of password (base64):', sha384Hash);

            // Step 3: Compare using bcrypt
            const result = await bcrypt.compare(sha384Hash, bcryptHash);

            console.log('\n=== RESULT ===');
            if (result) {
                console.log('✅ PASSWORD MATCHES! Login should work now.');
            } else {
                console.log('❌ PASSWORD DOES NOT MATCH with SHA-384 pre-hash.');

                // Also try without pre-hash for comparison
                console.log('\nTrying without SHA-384 pre-hash...');
                const directResult = await bcrypt.compare(password, bcryptHash);
                console.log('Direct bcrypt compare:', directResult ? 'MATCH' : 'no match');
            }
        } else {
            console.log('Hash is not in WordPress 6.8+ format');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

testWP68Password(process.argv[2] || 'Flip5times.14');
