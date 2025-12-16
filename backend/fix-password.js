require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function fixPassword() {
    try {
        const email = 'test100@baletteam.testinator.email';
        const password = 'Flip5times.15';

        // Generate standard bcrypt hash
        const hash = await bcrypt.hash(password, 10);
        console.log('Generated standard bcrypt hash:', hash);

        // Update DB
        const [result] = await db.query('UPDATE el1users SET user_pass = ? WHERE user_email = ?', [hash, email]);

        console.log('Database updated:', result.affectedRows > 0 ? 'SUCCESS' : 'FAILURE');

        // Verify locally immediately
        const verify = await bcrypt.compare(password, hash);
        console.log('Local verification:', verify ? 'PASS' : 'FAIL');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
fixPassword();
