/**
 * Test script to debug password hashing for a specific user
 */
require('dotenv').config();
const db = require('./db');
const wphash = require('wordpress-hash-node');
const bcrypt = require('bcrypt');

async function testPasswordForUser(email) {
    try {
        console.log('='.repeat(60));
        console.log('Testing password hash for user:', email);
        console.log('='.repeat(60));

        // Get user from database
        const [users] = await db.query('SELECT ID, user_pass, user_email FROM el1users WHERE user_email = ?', [email]);

        if (users.length === 0) {
            console.log('❌ User not found in database!');
            process.exit(1);
        }

        const user = users[0];
        const hash = user.user_pass;

        console.log('\n📧 User email:', user.user_email);
        console.log('🆔 User ID:', user.ID);
        console.log('🔐 Password hash:', hash);
        console.log('📏 Hash length:', hash.length);
        console.log('🏷️  Hash prefix:', hash.substring(0, 10));

        // Determine hash type
        console.log('\n--- Hash Type Analysis ---');
        if (hash.startsWith('$wp$')) {
            console.log('✅ This is a NEW WordPress bcrypt format ($wp$...)');
            console.log('   This was created by our app signup or password reset');
        } else if (hash.startsWith('$P$')) {
            console.log('✅ This is an OLD WordPress phpass format ($P$...)');
            console.log('   This was created by WordPress itself (WooCommerce signup, etc)');
        } else if (hash.startsWith('$2')) {
            console.log('✅ This is a standard bcrypt format ($2...)');
        } else {
            console.log('⚠️  Unknown hash format!');
        }

        // Test password verification
        console.log('\n--- Password Verification Test ---');
        console.log('Enter a test password to check (default: "test123"):');

        // Test with common passwords
        const testPasswords = ['test123', 'password', 'Password123', 'admin'];

        for (const testPass of testPasswords) {
            let result = false;

            if (hash.startsWith('$wp$')) {
                const bcryptHash = hash.replace('$wp', '');
                result = await bcrypt.compare(testPass, bcryptHash);
            } else if (hash.startsWith('$P$')) {
                result = wphash.CheckPassword(testPass, hash);
            } else if (hash.startsWith('$2')) {
                result = await bcrypt.compare(testPass, hash);
            } else {
                result = wphash.CheckPassword(testPass, hash);
            }

            console.log(`Password "${testPass}": ${result ? '✅ MATCH!' : '❌ no match'}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('Test complete');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

// Run test for the specified user
const email = process.argv[2] || 'wcekot85@gmail.com';
testPasswordForUser(email);
