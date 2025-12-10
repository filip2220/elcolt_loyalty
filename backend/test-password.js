require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function testPassword() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Get user from database
    const [users] = await conn.query(
        'SELECT user_email, user_pass FROM el1users WHERE user_email = ?',
        ['fszymik@gmail.com']
    );

    if (users.length === 0) {
        console.log('User not found!');
        await conn.end();
        return;
    }

    const hash = users[0].user_pass;
    console.log('User:', users[0].user_email);
    console.log('Original hash:', hash);
    console.log('Hash starts with $wp$:', hash.startsWith('$wp$'));

    // Test the conversion
    const bcryptHash = hash.replace('$wp', '');
    console.log('Converted bcrypt hash:', bcryptHash);

    // Ask for password via command line argument
    const testPassword = process.argv[2] || 'test';
    console.log('\nTesting with password:', testPassword);

    try {
        const result = await bcrypt.compare(testPassword, bcryptHash);
        console.log('Password match result:', result);
    } catch (err) {
        console.log('Bcrypt error:', err.message);
    }

    await conn.end();
}

testPassword().catch(console.error);



