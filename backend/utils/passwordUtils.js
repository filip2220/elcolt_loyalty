/**
 * Password verification utilities for WordPress compatibility
 * 
 * Supports multiple password hash formats:
 * - WordPress PHPass: $P$... or $H$...
 * - WordPress 6.8+ HMAC-SHA384 bcrypt: $wp$2y$...
 * - Standard bcrypt: $2y$..., $2a$..., $2b$...
 * - HTTP fallback for unknown formats
 */

const wphash = require('wordpress-hash-node');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const db = require('../db');

/**
 * Helper to verify password by attempting to log in to the actual WordPress site
 * This is used as a fallback when local hash verification fails
 * 
 * @param {string} username - User email/username
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} - True if login successful
 */
async function verifyViaHttp(username, password) {
    if (!username) return false;

    return new Promise((resolve) => {
        const postData = querystring.stringify({
            'log': username,
            'pwd': password,
            'wp-submit': 'Log In',
            'testcookie': '1'
        });

        const options = {
            hostname: 'etaktyczne.pl',
            port: 443,
            path: '/wp-login.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'User-Agent': 'ElColtApp/1.0',
                'Cookie': 'wordpress_test_cookie=WP%20Cookie%20check'
            },
            timeout: 8000
        };

        const req = https.request(options, (res) => {
            let hasCookie = false;

            if (res.headers['set-cookie']) {
                res.headers['set-cookie'].forEach(c => {
                    if (c.includes('wordpress_logged_in_')) {
                        hasCookie = true;
                    }
                });
            }

            // Redirects (302) usually mean success in WP login if no error param
            if (res.statusCode === 302 && res.headers.location && !res.headers.location.includes('login_error')) {
                if (res.headers.location.includes('wp-admin') || res.headers.location.includes('profile.php')) {
                    hasCookie = true;
                }
            }

            resolve(hasCookie);
        });

        req.on('error', (e) => {
            console.error('HTTP verification error:', e.message);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Check password against hash - supports WordPress formats:
 * - Old WordPress phpass: $P$...
 * - New WordPress 6.8+ bcrypt with HMAC-SHA384 pre-hash: $wp$2y$...
 * - Plugins that use $wp prefix: $wp$2y$... (without HMAC pre-hash)
 * - Standard bcrypt: $2y$... or $2a$... or $2b$...
 * - Fallback: HTTP Login Check
 *
 * @param {string} password - The password to check
 * @param {string} hash - The hash from DB
 * @param {string} [email] - User email (required for HTTP fallback)
 * @param {number} [userId] - User ID (required for hash update)
 * @returns {Promise<boolean>} - True if password matches
 */
async function checkPassword(password, hash, email, userId) {
    let isValid = false;

    if (!hash) return false;

    // 1. Standard WordPress format (PHPass): $P$ or $H$
    if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
        isValid = wphash.CheckPassword(password, hash);
    }
    // 2. Standard Bcrypt (including PHP $2y variant)
    else if (hash.startsWith('$2')) {
        // Convert PHP-specific $2y to $2b for node.js bcrypt compatibility
        const compatHash = hash.replace(/^\$2y\$/, '$2b$');
        isValid = await bcrypt.compare(password, compatHash);
    }
    // 3. App-Specific Legacy format ($wp prefix + bcrypt)
    else if (hash.startsWith('$wp')) {
        const bcryptHash = hash.substring(3);
        const compatHash = bcryptHash.replace(/^\$2y\$/, '$2b$');

        // Method 1: HMAC-SHA384 pre-hash
        const hmacHash = crypto.createHmac('sha384', 'wp-sha384').update(password).digest('base64');
        if (await bcrypt.compare(hmacHash, compatHash)) isValid = true;

        // Method 2: Direct bcrypt
        if (!isValid && await bcrypt.compare(password, compatHash)) isValid = true;
    }
    // 4. Fallback: try wphash on everything else
    else {
        isValid = wphash.CheckPassword(password, hash);
    }

    // --- FALLBACK TO HTTP CHECK ---
    if (!isValid && email) {
        console.log(`[AUTH] Local verify failed for ${email}, trying HTTP fallback...`);
        const httpSuccess = await verifyViaHttp(email, password);

        if (httpSuccess) {
            console.log(`[AUTH] HTTP fallback SUCCESS via ${email}. Updating local hash...`);
            isValid = true;

            // Update DB with standard bcrypt hash so next login is fast
            if (userId) {
                try {
                    const newHash = await bcrypt.hash(password, 10);
                    await db.query('UPDATE el1users SET user_pass = ? WHERE ID = ?', [newHash, userId]);
                    console.log(`[AUTH] Hash updated to standard bcrypt for user ${userId}`);
                } catch (e) {
                    console.error('[AUTH] Failed to update hash:', e);
                }
            }
        }
    }

    return isValid;
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Bcrypt hash
 */
async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

module.exports = {
    checkPassword,
    hashPassword,
    verifyViaHttp
};
