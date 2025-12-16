/**
 * Try ALL possible password verification methods including edge cases
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

        const fullHash = users[0].user_pass;
        console.log('=== Exhaustive Password Test ===\n');
        console.log('Password:', password);
        console.log('Full hash:', fullHash);

        // Extract bcrypt portion
        const bcryptHash = fullHash.substring(3);
        console.log('Bcrypt portion:', bcryptHash);

        console.log('\n--- Testing all methods ---\n');

        // 1. HMAC-SHA384 (WordPress 6.8+)
        const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
        console.log('1. HMAC-SHA384 pre-hash:', await bcrypt.compare(hmacHash, bcryptHash) ? '✅' : '❌');

        // 2. Direct bcrypt
        console.log('2. Direct bcrypt:', await bcrypt.compare(password, bcryptHash) ? '✅' : '❌');

        // 3. wordpress-hash-node on full hash
        console.log('3. wphash on full hash:', wphash.CheckPassword(password, fullHash) ? '✅' : '❌');

        // 4. wordpress-hash-node on bcrypt portion
        console.log('4. wphash on bcrypt:', wphash.CheckPassword(password, bcryptHash) ? '✅' : '❌');

        // 5. Maybe the hash in DB includes a null terminator or something weird?
        const trimmedHash = fullHash.trim();
        const trimmedBcrypt = trimmedHash.substring(3);
        console.log('5. Trimmed bcrypt:', await bcrypt.compare(password, trimmedBcrypt) ? '✅' : '❌');

        // 6. What if WordPress is NOT using the $wp prefix correctly?
        // Check if the hash after $wp might include another prefix
        console.log('6. Hash after $wp starts with:', bcryptHash.substring(0, 7));

        // 7. Try SHA-384 (not HMAC) just in case
        const sha384Hash = crypto.createHash('sha384').update(password).digest('base64');
        console.log('7. SHA-384 (no HMAC):', await bcrypt.compare(sha384Hash, bcryptHash) ? '✅' : '❌');

        // 8. Try trimming the password in HMAC
        const hmacTrimmed = crypto.createHmac('sha384', 'wp-sha384').update(password.trim()).digest('base64');
        console.log('8. HMAC with trimmed pwd:', await bcrypt.compare(hmacTrimmed, bcryptHash) ? '✅' : '❌');

        // Show what the HMAC produces
        console.log('\nHMAC output:', hmacHash);
        console.log('SHA-384 output:', sha384Hash);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

test();
