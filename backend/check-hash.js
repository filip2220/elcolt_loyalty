require('dotenv').config();
const db = require('./db');

async function run() {
    const [r] = await db.query('SELECT user_pass FROM el1users WHERE user_email = ?', ['test100@baletteam.testinator.email']);
    console.log('Current hash:', r[0].user_pass);
    process.exit(0);
}
run();
