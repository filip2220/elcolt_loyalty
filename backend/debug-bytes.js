/**
 * Debug: Check exact bytes of password and hash
 */
require('dotenv').config();
const db = require('./db');

async function debug() {
    try {
        const email = 'test100@baletteam.testinator.email';
        const password = 'Flip5times.15';

        const [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found!');
            process.exit(1);
        }

        const hash = users[0].user_pass;

        console.log('=== Debug Info ===\n');
        console.log('Password:', password);
        console.log('Password length:', password.length);
        console.log('Password bytes:', Buffer.from(password).toString('hex'));

        console.log('\nHash:', hash);
        console.log('Hash length:', hash.length);
        console.log('Hash bytes:', Buffer.from(hash).toString('hex'));

        // Check if there are any hidden characters
        console.log('\nHash characters:');
        for (let i = 0; i < Math.min(20, hash.length); i++) {
            console.log(`  [${i}] '${hash[i]}' = ${hash.charCodeAt(i)}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

debug();
