/**
 * Create a WordPress 6.8+ compatible hash and verify it works
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function test() {
    const password = 'Flip5times.14';

    console.log('=== Creating WordPress 6.8+ compatible hash ===\n');
    console.log('Password:', password);

    // Step 1: HMAC-SHA384 pre-hash (exactly like WordPress)
    // PHP: base64_encode(hash_hmac('sha384', $password, 'wp-sha384', true))
    const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
    console.log('HMAC-SHA384 (base64):', hmacHash);

    // Step 2: bcrypt this HMAC result
    const bcryptHash = await bcrypt.hash(hmacHash, 10);
    console.log('Bcrypt of HMAC:', bcryptHash);

    // Step 3: Add WordPress prefix
    const wpHash = '$wp' + bcryptHash;
    console.log('Full WordPress hash:', wpHash);

    // Step 4: Now verify it works
    console.log('\n=== Verification ===');

    // Simulate checking
    const hashToCheck = wpHash.substring(3);  // Remove '$wp'
    const hmacToCheck = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
    const result = await bcrypt.compare(hmacToCheck, hashToCheck);

    console.log('Verification result:', result ? '✅ MATCH' : '❌ no match');

    // Now compare with the actual hash from DB
    console.log('\n=== Compare with DB hash ===');
    const dbHash = '$wp$2y$10$nRMmgONY3IXJXLh/NZUoSepbn5Kzf0FCke6fArCCuKMGPAMntBAc6';
    const dbBcrypt = dbHash.substring(3);

    console.log('Our bcrypt hash:', bcryptHash);
    console.log('DB bcrypt hash: ', dbBcrypt);
    console.log('Are they the same structure?', bcryptHash.substring(0, 7) === dbBcrypt.substring(0, 7) ? 'Yes' : 'No');

    // The HMAC that would have been used to create the DB hash
    // If our password is correct, they should match when verified
    const dbResult = await bcrypt.compare(hmacToCheck, dbBcrypt);
    console.log('\nDB hash verification result:', dbResult ? '✅ MATCH' : '❌ no match');

    if (!dbResult) {
        console.log('\n⚠️  The password "Flip5times.14" was NOT used to create the hash in the database.');
        console.log('Either the password is different, or there was an issue during registration.');
    }
}

test().then(() => process.exit(0));
