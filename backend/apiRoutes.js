const express = require('express');
const jwt = require('jsonwebtoken');
const wphash = require('wordpress-hash-node');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');
const verifyToken = require('./authMiddleware');

const https = require('https');
const querystring = require('querystring');

/**
 * Helper to verify password by attempting to log in to the actual WordPress site
 * This is used as a fallback when local hash verification fails (e.g. unknown WP hash algorithms)
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
            timeout: 8000 // Increased timeout to 8s
        };

        const req = https.request(options, (res) => {
            let hasCookie = false;

            // Log all headers to see what we got
            // console.log('[DEBUG] Response Headers:', JSON.stringify(res.headers));

            if (res.headers['set-cookie']) {
                res.headers['set-cookie'].forEach(c => {
                    if (c.includes('wordpress_logged_in_')) {
                        hasCookie = true;
                    }
                });
            }

            // Redirects (302) usually mean success in WP login if no error param
            // Also checking if redirected to admin/profile as extra confirmation
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
        // Clean up any $2y in legacy hash too
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
    // If local verification failed but we suspect it might be valid (e.g. unknown WP hash algorithm)
    // We verify via HTTP login to the site.
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


const router = express.Router();


// =====================================================
// IMAGE URL HELPER
// =====================================================

/**
 * WordPress on cPanel often stores image URLs with technical server domains
 * which don't work properly in browsers. This helper replaces such domains with the actual site domain.
 * 
 * Known technical domain patterns:
 * - boundless-olive-alligator.51-68-45-82.cpanel.site (current cPanel installation)
 * - srv123456.hstgr.cloud (Hostinger)
 * - *.cpanel.site (generic cPanel)
 * 
 * @param {string|null} url - The original image URL from WordPress database
 * @returns {string|null} - The fixed URL with correct domain, or null if input was null
 */
function fixImageUrl(url) {
    if (!url) return null;

    // The new production domain
    const newDomain = 'https://etaktyczne.pl';

    // Pattern to match common cPanel technical domain formats
    const technicalDomainPatterns = [
        // Current cPanel installation: boundless-olive-alligator.51-68-45-82.cpanel.site
        /^https?:\/\/[a-z0-9-]+\.[0-9-]+\.cpanel\.site/i,
        // Hostinger technical domains
        /^https?:\/\/srv\d+\.hstgr\.(cloud|io)/i,
        /^https?:\/\/server\d+\.hostinger\.com/i,
        // Generic cPanel subdomains
        /^https?:\/\/[a-z0-9-]+\.hstgr\.(cloud|io)/i,
    ];

    // Try each pattern
    for (const pattern of technicalDomainPatterns) {
        if (pattern.test(url)) {
            return url.replace(pattern, newDomain);
        }
    }

    return url;
}

// Email transporter configuration for password reset emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// --- ROUTES ---

/**
 * POST /api/signup
 * Registers a new user, adds them to el1users and el1usermeta, and returns a JWT.
 * The WooCommerce loyalty plugin is expected to handle the creation of the user in the el1wlr_users table.
 */
router.post('/signup', async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !password || !phone) {
        return res.status(400).json({ message: 'Wszystkie pola są wymagane.' });
    }

    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if user already exists
        const [existingUsers] = await connection.execute('SELECT ID FROM el1users WHERE user_email = ?', [email]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Konto z tym adresem email już istnieje.' });
        }

        // Use standard WordPress hashing (PHPass) for compatibility with website
        const hashedPassword = wphash.HashPassword(password);
        const now = new Date();
        const userNicename = (firstName + ' ' + lastName).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        // Create user in el1users table
        const [result] = await connection.execute(
            `INSERT INTO el1users (user_login, user_pass, user_nicename, user_email, user_registered, display_name) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, userNicename, email, now, `${firstName} ${lastName}`]
        );
        const newUserId = result.insertId;

        // Add user metadata to el1usermeta. The loyalty plugin should handle the rest.
        await Promise.all([
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'first_name', firstName]),
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'last_name', lastName]),
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'billing_phone', phone]),
            // Set user role to "Customer" for WooCommerce compatibility
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'el1capabilities', 'a:1:{s:8:"customer";b:1;}'])
        ]);

        await connection.commit();

        const token = jwt.sign({ userId: newUserId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ token });

    } catch (error) {
        await connection.rollback();
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas rejestracji.' });
    } finally {
        if (connection) connection.release();
    }
});


/**
 * POST /api/login
 * Authenticates a user and returns a JWT.
 * Supports login via email OR phone number.
 * Phone numbers should be WITHOUT country code (e.g., '123456789' not '+48123456789')
 * Body: { "identifier": "user@example.com" or "123456789", "password": "user_password" }
 * Also accepts legacy format: { "email": "user@example.com", "password": "user_password" }
 */
router.post('/login', async (req, res) => {
    // Support both 'identifier' (new) and 'email' (legacy) field names
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Email lub numer telefonu i hasło są wymagane.' });
    }

    try {
        let users = [];
        const trimmedIdentifier = identifier.trim();

        // Check if the identifier looks like an email (contains @)
        const isEmail = trimmedIdentifier.includes('@');

        if (isEmail) {
            // Login by email
            [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [trimmedIdentifier]);
        } else {
            // Login by phone number - search in usermeta table
            // Remove any spaces, dashes, or other formatting from the phone number
            const cleanedPhone = trimmedIdentifier.replace(/[\s\-\(\)]/g, '');

            // Search for the phone number in billing_phone meta field
            // We need to handle potential formatting differences (+48, spaces, etc.)
            // Since user enters WITHOUT country code, we search for exact match or with common prefixes
            const phoneVariants = [
                cleanedPhone,                    // exact: 123456789
                `+48${cleanedPhone}`,            // with Polish country code: +48123456789
                `+48 ${cleanedPhone}`,           // with space after code
                `48${cleanedPhone}`,             // without + prefix
            ];

            // Build query to search for any of these phone variants
            const placeholders = phoneVariants.map(() => '?').join(', ');
            const query = `
                SELECT u.ID, u.user_pass 
                FROM el1users u
                INNER JOIN el1usermeta m ON u.ID = m.user_id
                WHERE m.meta_key = 'billing_phone' 
                AND (m.meta_value IN (${placeholders}) 
                     OR REPLACE(REPLACE(REPLACE(REPLACE(m.meta_value, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?)
                LIMIT 1
            `;

            // Add a LIKE pattern that matches the phone at the end (after any country code)
            const likePattern = `%${cleanedPhone}`;
            [users] = await db.query(query, [...phoneVariants, likePattern]);
        }

        if (users.length === 0) {
            console.log('[DEBUG] No user found for identifier:', trimmedIdentifier);
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        const user = users[0];
        console.log('[DEBUG] User found - ID:', user.ID);
        // console.log('[DEBUG] Password hash from DB:', user.user_pass ? user.user_pass.substring(0, 20) + '...' : 'null');

        let passwordToCheck = password;
        if (typeof password === 'string') {
            passwordToCheck = password.trim();
        }

        console.log(`[DEBUG] Verifying password. Received length: ${password.length}, Trimmed length: ${passwordToCheck.length}`);

        // Pass user.user_email and user.ID to enable HTTP fallback checks and hash updates
        const isPasswordCorrect = await checkPassword(passwordToCheck, user.user_pass, user.user_email, user.ID);

        if (!isPasswordCorrect) {
            console.log('[DEBUG] Password verification FAILED');
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        const token = jwt.sign({ userId: user.ID }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas logowania.' });
    }
});

/**
 * GET /api/user/profile
 * Fetches the logged-in user's profile data.
 * Protected: Requires authentication token.
 */
router.get('/user/profile', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query('SELECT ID, display_name, user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }
        const user = users[0];
        res.json({
            id: user.ID,
            name: user.display_name,
            email: user.user_email
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania profilu.' });
    }
});

/**
 * GET /api/user/points
 * Fetches the user's points and loyalty level using a single, efficient LEFT JOIN.
 * Protected: Requires authentication token.
 */
router.get('/user/points', verifyToken, async (req, res) => {
    try {
        // Get user's email, which is the reliable key for the loyalty table.
        const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono zalogowanego użytkownika.' });
        }
        const userEmail = users[0].user_email;

        // Use a single, efficient LEFT JOIN to get all data at once.
        // This is the standard and most reliable way to perform this operation.
        const query = `
            SELECT
                u.earn_total_point,
                u.level_id,
                l.name AS level_name
            FROM
                el1wlr_users AS u
            LEFT JOIN
                el1wlr_levels AS l ON u.level_id = l.id
            WHERE
                u.user_email = ?
        `;
        const [loyaltyRows] = await db.query(query, [userEmail]);

        // If the user has no loyalty record yet, return a default state.
        if (loyaltyRows.length === 0) {
            return res.json({
                points: 0,
                level: { name: 'Członek', level_id: null }
            });
        }

        const loyaltyData = loyaltyRows[0];
        const points = parseInt(loyaltyData.earn_total_point, 10) || 0;
        const levelId = loyaltyData.level_id != null ? parseInt(loyaltyData.level_id, 10) : null;

        // Use the level_name from the JOIN. If the join found no match (e.g., bad level_id),
        // level_name will be null, and we'll fall back to 'Członek'.
        const levelName = loyaltyData.level_name || 'Członek';

        res.json({
            points: points,
            level: {
                name: levelName,
                level_id: levelId
            }
        });

    } catch (error) {
        console.error('Get points/level error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania danych lojalnościowych.' });
    }
});


/**
 * GET /api/user/activity
 * Fetches the logged-in user's recent purchase activity.
 * Protected: Requires authentication token.
 */
router.get('/user/activity', verifyToken, async (req, res) => {
    try {
        // WooCommerce uses a separate customer_id in wc_customer_lookup that maps to WordPress user_id.
        // We need to find the WooCommerce customer_id first, then use it to query orders.
        const [customerLookup] = await db.query(
            'SELECT customer_id, email FROM el1wc_customer_lookup WHERE user_id = ?',
            [req.userId]
        );

        // If no WooCommerce customer record exists, try to find by email
        let wcCustomerId = null;
        let userEmail = null;

        if (customerLookup.length > 0) {
            wcCustomerId = customerLookup[0].customer_id;
            userEmail = customerLookup[0].email;
        } else {
            // Fallback: get email from WordPress users table
            const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
            if (users.length > 0) {
                userEmail = users[0].user_email;
            }
        }

        if (!wcCustomerId && !userEmail) {
            return res.json([]); // No customer record found
        }

        // Build query dynamically based on available identifiers to avoid matching unrelated orders
        const conditions = [];
        const params = [];

        if (wcCustomerId) {
            conditions.push('lookup.customer_id = ?');
            params.push(wcCustomerId);
        }
        if (userEmail) {
            conditions.push('pm.meta_value = ?');
            params.push(userEmail);
        }

        // Query orders using the WooCommerce customer_id (primary) or billing email (fallback)
        const query = `
            SELECT DISTINCT
                lookup.order_item_id,
                lookup.date_created, 
                lookup.product_qty, 
                lookup.product_gross_revenue,
                COALESCE(posts.post_title, 'Product not found') AS product_name
            FROM el1wc_order_product_lookup AS lookup
            LEFT JOIN el1posts AS posts ON lookup.product_id = posts.ID
            LEFT JOIN el1postmeta AS pm ON lookup.order_id = pm.post_id AND pm.meta_key = '_billing_email'
            WHERE ${conditions.join(' OR ')}
            ORDER BY lookup.date_created DESC
            LIMIT 10;
        `;
        const [activity] = await db.query(query, params);
        res.json(activity);
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania aktywności.' });
    }
});

/**
 * GET /api/user/savings
 * Calculates the total savings for a user from cart discounts.
 * Protected: Requires authentication token.
 */
router.get('/user/savings', verifyToken, async (req, res) => {
    try {
        // WooCommerce uses a separate customer_id in wc_customer_lookup that maps to WordPress user_id.
        const [customerLookup] = await db.query(
            'SELECT customer_id, email FROM el1wc_customer_lookup WHERE user_id = ?',
            [req.userId]
        );

        let wcCustomerId = null;
        let userEmail = null;

        if (customerLookup.length > 0) {
            wcCustomerId = customerLookup[0].customer_id;
            userEmail = customerLookup[0].email;
        } else {
            // Fallback: get email from WordPress users table
            const [users] = await db.query('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
            if (users.length > 0) {
                userEmail = users[0].user_email;
            }
        }

        if (!wcCustomerId && !userEmail) {
            return res.json({ totalSavings: 0 });
        }

        // Build query dynamically based on available identifiers to avoid matching unrelated orders
        const conditions = [];
        const params = [];

        if (wcCustomerId) {
            conditions.push('o.customer_id = ?');
            params.push(wcCustomerId);
        }
        if (userEmail) {
            conditions.push('pm.meta_value = ?');
            params.push(userEmail);
        }

        // Find savings from orders linked by WooCommerce customer_id OR billing email
        const [savingsResult] = await db.query(
            `SELECT SUM(d.cart_discount) as totalSavings 
             FROM el1wdr_order_item_discounts d
             INNER JOIN el1wc_order_product_lookup o ON d.order_id = o.order_id
             LEFT JOIN el1postmeta pm ON o.order_id = pm.post_id AND pm.meta_key = '_billing_email'
             WHERE ${conditions.join(' OR ')}`,
            params
        );

        // The result of SUM can be null if no rows are found or all values are null. Coalesce to 0.
        const totalSavings = parseFloat(savingsResult[0]?.totalSavings) || 0;

        res.json({ totalSavings });

    } catch (error) {
        console.error('Get total savings error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania oszczędności.' });
    }
});

/**
 * GET /api/user/qrcode-data
 * Returns the user's phone number for QR code generation.
 * Protected: Requires authentication token.
 */
router.get('/user/qrcode-data', verifyToken, async (req, res) => {
    try {
        const [userData] = await db.query(`
            SELECT u.display_name, m.meta_value as phone
            FROM el1users u
            LEFT JOIN el1usermeta m ON u.ID = m.user_id AND m.meta_key = 'billing_phone'
            WHERE u.ID = ?
        `, [req.userId]);

        if (userData.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }

        res.json({
            name: userData[0].display_name,
            phone: userData[0].phone || null
        });
    } catch (error) {
        console.error('Get QR code data error:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

/**
 * POST /api/user/redeem
 * Redeems a reward for the logged-in user.
 * Protected: Requires authentication token.
 * Body: { "rewardId": 123 }
 */
router.post('/user/redeem', verifyToken, async (req, res) => {
    const { rewardId } = req.body;
    if (!rewardId) {
        return res.status(400).json({ message: 'ID nagrody jest wymagane.' });
    }

    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get user's email and current points
        const [users] = await connection.execute('SELECT user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Nie znaleziono użytkownika.' });
        }
        const userEmail = users[0].user_email;

        const [loyaltyUsers] = await connection.execute('SELECT earn_total_point FROM el1wlr_users WHERE user_email = ?', [userEmail]);
        if (loyaltyUsers.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: 'Nie masz konta lojalnościowego.' });
        }
        const userPoints = parseInt(loyaltyUsers[0].earn_total_point, 10);

        // 2. Get reward's point cost
        const [rewards] = await connection.execute('SELECT name, points_required FROM el1wlr_rewards WHERE id = ? AND status = "wlr_active"', [rewardId]);
        if (rewards.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Nie znaleziono nagrody lub nie jest aktywna.' });
        }
        const reward = rewards[0];
        const rewardPoints = parseInt(reward.points_required, 10);

        // 3. Check if user has enough points
        if (userPoints < rewardPoints) {
            await connection.rollback();
            return res.status(400).json({ message: 'Niewystarczająca liczba punktów do odebrania tej nagrody.' });
        }

        // 4. Deduct points
        const newPoints = userPoints - rewardPoints;
        await connection.execute('UPDATE el1wlr_users SET earn_total_point = ? WHERE user_email = ?', [newPoints, userEmail]);

        // 5. Generate a unique coupon code (simple version) and log the transaction
        const couponCode = `REDEEM-${req.userId}-${rewardId}-${Date.now()}`.toUpperCase();
        await connection.execute(
            `INSERT INTO el1wlr_user_rewards (user_email, reward_id, points, reward_display_name, reward_code, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userEmail, rewardId, rewardPoints, reward.name, couponCode, new Date(), 'created']
        );

        await connection.commit();

        res.json({
            newPoints,
            message: `Pomyślnie odebrano "${reward.name}"!`,
            coupon: couponCode,
        });

    } catch (error) {
        await connection.rollback();
        console.error('Redeem reward error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas odbierania nagrody.' });
    } finally {
        if (connection) connection.release();
    }
});


/**
 * GET /api/levels
 * Returns a list of all loyalty levels and their point ranges.
 * Public: No authentication required.
 */
router.get('/levels', async (req, res) => {
    try {
        // The user-provided image has a column 'from_poir', which is likely a typo for 'from_points'.
        // This code attempts to query for 'from_points' first, which is the standard name.
        const [levels] = await db.query(
            'SELECT id, name, from_points, to_points FROM el1wlr_levels ORDER BY from_points ASC'
        );
        res.json(levels);
    } catch (error) {
        // If the query fails because 'from_points' doesn't exist, it falls back to trying 'from_poir'.
        // This makes the API resilient to the typo in the database schema.
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes(`'from_points'`)) {
            try {
                const [levelsWithTypo] = await db.query(
                    'SELECT id, name, from_poir AS from_points, to_points FROM el1wlr_levels ORDER BY from_poir ASC'
                );
                res.json(levelsWithTypo);
            } catch (fallbackError) {
                console.error('Get levels fallback error:', fallbackError);
                res.status(500).json({ message: 'Błąd serwera podczas pobierania poziomów.' });
            }
        } else {
            console.error('Get levels error:', error);
            res.status(500).json({ message: 'Błąd serwera podczas pobierania poziomów.' });
        }
    }
});

/**
 * GET /api/rewards
 * Returns a list of all available rewards.
 * Public: No authentication required.
 */
router.get('/rewards', async (req, res) => {
    try {
        const [rewards] = await db.query(
            'SELECT id, name, points_required AS points, long_description AS description FROM el1wlr_rewards WHERE status = "wlr_active" ORDER BY points_required ASC'
        );
        res.json(rewards);
    } catch (error) {
        console.error('Get rewards error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania nagród.' });
    }
});

/**
 * POST /api/forgot-password
 * Initiates password reset process by generating a token and sending reset email.
 * Body: { "email": "user@example.com" }
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Adres email jest wymagany.' });
    }

    try {
        // Check if user exists
        const [users] = await db.query('SELECT ID, display_name FROM el1users WHERE user_email = ?', [email]);

        // Always return success message to prevent user enumeration
        // This is a security best practice - don't reveal if email exists
        if (users.length === 0) {
            return res.json({
                message: 'Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła.'
            });
        }

        const user = users[0];

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

        // Store token in database
        await db.query(
            `INSERT INTO el1password_reset_tokens (user_id, token, created_at, expires_at, used) 
             VALUES (?, ?, ?, ?, 0)`,
            [user.ID, resetToken, now, expiresAt]
        );

        // Create reset URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        // Send email
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Resetowanie hasła - Program Lojalnościowy',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Resetowanie hasła</h2>
                    <p>Witaj ${user.display_name},</p>
                    <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Programie Lojalnościowym.</p>
                    <p>Kliknij poniższy przycisk, aby zresetować hasło:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #10b981; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Zresetuj hasło
                        </a>
                    </div>
                    <p>Lub skopiuj i wklej poniższy link do przeglądarki:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    <p><strong>Link wygaśnie za 1 godzinę.</strong></p>
                    <p>Jeśli nie prosiłeś o zresetowanie hasła, zignoruj tę wiadomość.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        To jest automatyczna wiadomość. Prosimy nie odpowiadać na ten email.
                    </p>
                </div>
            `,
        };

        // Only send email if SMTP is configured
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log('⚠️ SMTP not configured. Password reset token:', resetToken);
            console.log('Reset URL:', resetUrl);
        }

        res.json({
            message: 'Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas przetwarzania żądania.' });
    }
});

/**
 * POST /api/reset-password
 * Resets user password using the token from email.
 * Body: { "token": "abc123...", "newPassword": "newPassword123" }
 */
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token i nowe hasło są wymagane.' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Hasło musi mieć co najmniej 8 znaków.' });
    }

    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();

        // Find valid token
        const [tokens] = await connection.execute(
            `SELECT user_id, expires_at, used 
             FROM el1password_reset_tokens 
             WHERE token = ? AND used = 0`,
            [token]
        );

        if (tokens.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Nieprawidłowy lub wygasły token resetowania hasła.' });
        }

        const resetToken = tokens[0];
        const now = new Date();

        // Check if token has expired
        if (new Date(resetToken.expires_at) < now) {
            await connection.rollback();
            return res.status(400).json({ message: 'Token resetowania hasła wygasł. Poproś o nowy link.' });
        }

        // Hash new password
        // Hash new password using standard WordPress format
        const hashedPassword = wphash.HashPassword(newPassword);

        // Update user password
        await connection.execute(
            'UPDATE el1users SET user_pass = ? WHERE ID = ?',
            [hashedPassword, resetToken.user_id]
        );

        // Mark token as used
        await connection.execute(
            'UPDATE el1password_reset_tokens SET used = 1 WHERE token = ?',
            [token]
        );

        // Clean up old/expired tokens for this user (housekeeping)
        await connection.execute(
            `DELETE FROM el1password_reset_tokens 
             WHERE user_id = ? AND (used = 1 OR expires_at < ?)`,
            [resetToken.user_id, now]
        );

        await connection.commit();

        res.json({ message: 'Hasło zostało pomyślnie zresetowane. Możesz się teraz zalogować.' });

    } catch (error) {
        await connection.rollback();
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas resetowania hasła.' });
    } finally {
        if (connection) connection.release();
    }
});

// =====================================================
// PRODUCT ENDPOINTS
// =====================================================

/**
 * GET /api/image-proxy
 * Proxies images from WordPress to avoid CORS and hosting issues.
 * Query params: url - The image URL to proxy
 */
router.get('/image-proxy', async (req, res) => {
    const https = require('https');
    const http = require('http');

    try {
        const imageUrl = req.query.url;

        if (!imageUrl) {
            return res.status(400).json({ message: 'URL parameter is required' });
        }

        // Validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            return res.status(400).json({ message: 'Invalid URL' });
        }

        // Choose http or https based on URL protocol
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
                'Sec-Fetch-Dest': 'image',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Windows"',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
            },
        };

        const proxyRequest = client.request(options, (proxyResponse) => {
            // Handle redirects
            if (proxyResponse.statusCode >= 300 && proxyResponse.statusCode < 400 && proxyResponse.headers.location) {
                // Redirect - follow it
                const redirectUrl = proxyResponse.headers.location;
                res.redirect(`/api/image-proxy?url=${encodeURIComponent(redirectUrl)}`);
                return;
            }

            if (proxyResponse.statusCode !== 200) {
                console.error(`Image proxy failed for ${imageUrl}: ${proxyResponse.statusCode}`);
                res.status(proxyResponse.statusCode).json({ message: 'Failed to fetch image' });
                return;
            }

            // Set response headers
            const contentType = proxyResponse.headers['content-type'] || 'image/jpeg';
            res.set('Content-Type', contentType);
            res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.set('Access-Control-Allow-Origin', '*');

            // Pipe the image data directly to response
            proxyResponse.pipe(res);
        });

        proxyRequest.on('error', (error) => {
            console.error('Image proxy request error:', error);
            res.status(500).json({ message: 'Error fetching image' });
        });

        proxyRequest.end();

    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).json({ message: 'Error proxying image' });
    }
});

/**
 * GET /api/debug/images/:productId
 * Debug endpoint to check image data for a product.
 * Returns raw database data for troubleshooting image loading issues.
 */
router.get('/debug/images/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        // Get WordPress site URL from options
        const [siteUrlResult] = await db.query(
            "SELECT option_value FROM el1options WHERE option_name = 'siteurl' LIMIT 1"
        );
        const [homeUrlResult] = await db.query(
            "SELECT option_value FROM el1options WHERE option_name = 'home' LIMIT 1"
        );

        // Get thumbnail ID
        const [thumbnailMeta] = await db.query(
            "SELECT meta_value FROM el1postmeta WHERE post_id = ? AND meta_key = '_thumbnail_id'",
            [productId]
        );

        let imageData = null;
        let attachmentMeta = null;

        if (thumbnailMeta.length > 0 && thumbnailMeta[0].meta_value) {
            const thumbnailId = parseInt(thumbnailMeta[0].meta_value);

            // Get the attachment post
            const [attachment] = await db.query(
                "SELECT ID, guid, post_title, post_mime_type FROM el1posts WHERE ID = ?",
                [thumbnailId]
            );

            // Get attachment metadata
            const [meta] = await db.query(
                "SELECT meta_key, meta_value FROM el1postmeta WHERE post_id = ? AND meta_key IN ('_wp_attached_file', '_wp_attachment_metadata')",
                [thumbnailId]
            );

            imageData = attachment[0] || null;
            attachmentMeta = meta;
        }

        res.json({
            product_id: productId,
            wordpress_config: {
                siteurl: siteUrlResult[0]?.option_value || 'NOT FOUND',
                home: homeUrlResult[0]?.option_value || 'NOT FOUND'
            },
            thumbnail_id: thumbnailMeta[0]?.meta_value || null,
            image_data: imageData,
            attachment_meta: attachmentMeta
        });
    } catch (error) {
        console.error('Debug images error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/products
 * Returns a list of all published products with basic info.
 * Public: No authentication required.
 * Query params:
 *   - limit: Number of products to return (default 20, max 100)
 *   - offset: Pagination offset (default 0)
 */
router.get('/products', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;

        const query = `
            SELECT 
                p.ID as id,
                p.post_title as name,
                p.post_excerpt as short_description,
                p.post_content as description,
                p.post_date as created_at,
                p.post_modified as updated_at,
                (SELECT pm.meta_value FROM el1postmeta pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id' LIMIT 1) as thumbnail_id,
                (SELECT img.guid FROM el1posts img WHERE img.ID = CAST((SELECT pm.meta_value FROM el1postmeta pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id' LIMIT 1) AS UNSIGNED) AND img.post_type = 'attachment' LIMIT 1) as thumbnail_url
            FROM el1posts p
            WHERE p.post_type = 'product' 
              AND p.post_status = 'publish'
            ORDER BY p.post_date DESC
            LIMIT ? OFFSET ?
        `;

        const [products] = await db.query(query, [limit, offset]);

        // Fix image URLs (replace technical domain with actual domain)
        const productsWithFixedUrls = products.map(product => ({
            ...product,
            thumbnail_url: fixImageUrl(product.thumbnail_url)
        }));

        // Get total count for pagination
        const [countResult] = await db.query(
            "SELECT COUNT(*) as total FROM el1posts WHERE post_type = 'product' AND post_status = 'publish'"
        );

        res.json({
            products: productsWithFixedUrls,
            pagination: {
                limit,
                offset,
                total: parseInt(countResult[0].total)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania produktów.' });
    }
});

/**
 * GET /api/products/:id
 * Returns a single product with full details including images.
 * Public: No authentication required.
 */
router.get('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ message: 'Nieprawidłowe ID produktu.' });
        }

        // Get product basic info
        const [products] = await db.query(`
            SELECT 
                p.ID as id,
                p.post_title as name,
                p.post_excerpt as short_description,
                p.post_content as description,
                p.post_date as created_at,
                p.post_modified as updated_at
            FROM el1posts p
            WHERE p.ID = ? 
              AND p.post_type = 'product' 
              AND p.post_status = 'publish'
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono produktu.' });
        }

        const product = products[0];

        // Get featured image (thumbnail)
        const [thumbnailMeta] = await db.query(`
            SELECT meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key = '_thumbnail_id'
        `, [productId]);

        let featuredImage = null;
        if (thumbnailMeta.length > 0 && thumbnailMeta[0].meta_value) {
            const thumbnailId = parseInt(thumbnailMeta[0].meta_value);
            const [imageData] = await db.query(`
                SELECT 
                    p.ID as id,
                    p.guid as url,
                    p.post_title as title,
                    (SELECT meta_value FROM el1postmeta WHERE post_id = p.ID AND meta_key = '_wp_attachment_metadata' LIMIT 1) as metadata
                FROM el1posts p
                WHERE p.ID = ? AND p.post_type = 'attachment'
            `, [thumbnailId]);

            if (imageData.length > 0) {
                featuredImage = {
                    id: imageData[0].id,
                    url: fixImageUrl(imageData[0].url),
                    title: imageData[0].title
                };
            }
        }

        // Get gallery images
        const [galleryMeta] = await db.query(`
            SELECT meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key = '_product_image_gallery'
        `, [productId]);

        let galleryImages = [];
        if (galleryMeta.length > 0 && galleryMeta[0].meta_value) {
            const galleryIds = galleryMeta[0].meta_value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

            if (galleryIds.length > 0) {
                const placeholders = galleryIds.map(() => '?').join(',');
                const [images] = await db.query(`
                    SELECT 
                        p.ID as id,
                        p.guid as url,
                        p.post_title as title
                    FROM el1posts p
                    WHERE p.ID IN (${placeholders}) AND p.post_type = 'attachment'
                `, galleryIds);

                // Fix image URLs for gallery images
                galleryImages = images.map(img => ({
                    ...img,
                    url: fixImageUrl(img.url)
                }));
            }
        }

        // Get price info from postmeta
        const [priceMeta] = await db.query(`
            SELECT meta_key, meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key IN ('_regular_price', '_sale_price', '_price', '_sku')
        `, [productId]);

        const priceInfo = {};
        priceMeta.forEach(meta => {
            const key = meta.meta_key.replace('_', '');
            priceInfo[key] = meta.meta_value;
        });

        res.json({
            ...product,
            featured_image: featuredImage,
            gallery_images: galleryImages,
            price: priceInfo.price || null,
            regular_price: priceInfo.regular_price || null,
            sale_price: priceInfo.sale_price || null,
            sku: priceInfo.sku || null
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania produktu.' });
    }
});

/**
 * GET /api/products/:id/images
 * Returns all images for a specific product.
 * Public: No authentication required.
 */
router.get('/products/:id/images', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ message: 'Nieprawidłowe ID produktu.' });
        }

        // Verify product exists
        const [products] = await db.query(`
            SELECT ID FROM el1posts 
            WHERE ID = ? AND post_type = 'product' AND post_status = 'publish'
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono produktu.' });
        }

        // Get featured image
        const [thumbnailMeta] = await db.query(`
            SELECT meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key = '_thumbnail_id'
        `, [productId]);

        // Get gallery images
        const [galleryMeta] = await db.query(`
            SELECT meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key = '_product_image_gallery'
        `, [productId]);

        // Collect all image IDs
        const imageIds = [];

        if (thumbnailMeta.length > 0 && thumbnailMeta[0].meta_value) {
            imageIds.push(parseInt(thumbnailMeta[0].meta_value));
        }

        if (galleryMeta.length > 0 && galleryMeta[0].meta_value) {
            const galleryIds = galleryMeta[0].meta_value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            imageIds.push(...galleryIds);
        }

        if (imageIds.length === 0) {
            return res.json({
                featured_image: null,
                gallery_images: [],
                all_images: []
            });
        }

        // Fetch all images in one query
        const uniqueImageIds = [...new Set(imageIds)];
        const placeholders = uniqueImageIds.map(() => '?').join(',');
        const [images] = await db.query(`
            SELECT 
                p.ID as id,
                p.guid as url,
                p.post_title as title,
                p.post_mime_type as mime_type
            FROM el1posts p
            WHERE p.ID IN (${placeholders}) AND p.post_type = 'attachment'
        `, uniqueImageIds);

        // Fix image URLs and create a map for quick lookup
        const fixedImages = images.map(img => ({
            ...img,
            url: fixImageUrl(img.url)
        }));
        const imageMap = {};
        fixedImages.forEach(img => { imageMap[img.id] = img; });

        // Separate featured and gallery
        const featuredId = thumbnailMeta.length > 0 ? parseInt(thumbnailMeta[0].meta_value) : null;
        const featuredImage = featuredId && imageMap[featuredId] ? imageMap[featuredId] : null;

        const galleryIds = galleryMeta.length > 0 && galleryMeta[0].meta_value
            ? galleryMeta[0].meta_value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
            : [];
        const galleryImages = galleryIds.map(id => imageMap[id]).filter(Boolean);

        res.json({
            featured_image: featuredImage,
            gallery_images: galleryImages,
            all_images: fixedImages
        });

    } catch (error) {
        console.error('Get product images error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania zdjęć produktu.' });
    }
});

// =====================================================
// SALES ENDPOINTS
// =====================================================

/**
 * GET /api/sales/public
 * Returns products currently on sale (from WooCommerce)
 * Public: No authentication required
 */
router.get('/sales/public', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT
                p.ID as id,
                p.post_title as name,
                regular.meta_value as regular_price,
                sale.meta_value as sale_price,
                (SELECT img.guid FROM el1posts img WHERE img.ID = CAST(thumb_id.meta_value AS UNSIGNED) AND img.post_type = 'attachment' LIMIT 1) as thumbnail_url,
                sale_from.meta_value as sale_from,
                sale_to.meta_value as sale_to
            FROM el1posts p
            LEFT JOIN el1postmeta regular ON p.ID = regular.post_id AND regular.meta_key = '_regular_price'
            LEFT JOIN el1postmeta sale ON p.ID = sale.post_id AND sale.meta_key = '_sale_price'
            LEFT JOIN el1postmeta thumb_id ON p.ID = thumb_id.post_id AND thumb_id.meta_key = '_thumbnail_id'
            LEFT JOIN el1postmeta sale_from ON p.ID = sale_from.post_id AND sale_from.meta_key = '_sale_price_dates_from'
            LEFT JOIN el1postmeta sale_to ON p.ID = sale_to.post_id AND sale_to.meta_key = '_sale_price_dates_to'
            WHERE p.post_type = 'product' 
              AND p.post_status = 'publish'
              AND p.post_parent = 0
              AND sale.meta_value IS NOT NULL 
              AND sale.meta_value != ''
            ORDER BY p.post_title
            LIMIT 50
        `;

        const [sales] = await db.query(query);

        // Calculate discount percentage for each product
        const salesWithDiscount = sales.map(product => {
            const regular = parseFloat(product.regular_price) || 0;
            const sale = parseFloat(product.sale_price) || 0;
            const discountPercent = regular > 0 ? Math.round((1 - sale / regular) * 100) : 0;

            return {
                ...product,
                thumbnail_url: fixImageUrl(product.thumbnail_url),
                discount_percent: discountPercent
            };
        });

        res.json({
            sales: salesWithDiscount,
            count: salesWithDiscount.length
        });

    } catch (error) {
        console.error('Get public sales error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania promocji.' });
    }
});

/**
 * GET /api/sales/app-exclusive
 * Returns app-exclusive offers from WPLoyalty rewards
 * Public: No authentication required (but redemption requires login)
 */
router.get('/sales/app-exclusive', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                name,
                display_name,
                description,
                discount_type,
                discount_value,
                require_point as points_required,
                reward_type,
                free_product,
                conditions
            FROM el1wlr_rewards 
            WHERE active = 1 
              AND is_show_reward = 1
            ORDER BY ordering
        `;

        const [offers] = await db.query(query);

        // Parse conditions to extract product info for display
        const offersWithProductInfo = offers.map(offer => {
            let applicable_products = [];

            // Parse conditions JSON to extract product names
            if (offer.conditions) {
                try {
                    const conditions = JSON.parse(offer.conditions);
                    for (const condition of conditions) {
                        if (condition.type === 'products' && condition.options?.value) {
                            // Extract product labels from the condition
                            const products = condition.options.value;
                            if (Array.isArray(products)) {
                                applicable_products = products.map(p => ({
                                    id: p.value,
                                    name: p.label?.replace(/^#\d+\s+/, '') || `Produkt #${p.value}`
                                }));
                            }
                        } else if (condition.type === 'product_category' && condition.options?.value) {
                            // Handle category-based conditions
                            const categories = condition.options.value;
                            if (Array.isArray(categories)) {
                                applicable_products = categories.map(c => ({
                                    id: c.value,
                                    name: `Kategoria: ${c.label}`,
                                    isCategory: true
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse conditions for offer', offer.id, e);
                }
            }

            // Parse free_product if present (for free product rewards)
            if (offer.free_product) {
                try {
                    const freeProducts = JSON.parse(offer.free_product);
                    if (Array.isArray(freeProducts)) {
                        applicable_products = freeProducts.map(p => ({
                            id: p.value,
                            name: p.label?.replace(/^#\d+\s+/, '') || `Produkt #${p.value}`
                        }));
                    }
                } catch (e) {
                    console.error('Failed to parse free_product for offer', offer.id, e);
                }
            }

            // Remove raw conditions and free_product from response
            const { conditions: _, free_product: __, ...offerData } = offer;

            return {
                ...offerData,
                applicable_products
            };
        });

        // Collect all product IDs (non-categories) to fetch thumbnails
        const allProductIds = [];
        for (const offer of offersWithProductInfo) {
            for (const product of offer.applicable_products) {
                if (!product.isCategory && product.id) {
                    const productId = parseInt(product.id, 10);
                    if (!isNaN(productId) && !allProductIds.includes(productId)) {
                        allProductIds.push(productId);
                    }
                }
            }
        }

        // Fetch thumbnails for all products in a single query
        let thumbnailMap = {};
        if (allProductIds.length > 0) {
            const placeholders = allProductIds.map(() => '?').join(',');
            const thumbnailQuery = `
                SELECT 
                    pm.post_id as product_id,
                    att.guid as thumbnail_url
                FROM el1postmeta pm
                INNER JOIN el1posts att ON pm.meta_value = att.ID
                WHERE pm.meta_key = '_thumbnail_id'
                  AND pm.post_id IN (${placeholders})
            `;
            const [thumbnails] = await db.query(thumbnailQuery, allProductIds);

            // Create a map of product_id -> thumbnail_url
            for (const row of thumbnails) {
                thumbnailMap[row.product_id] = fixImageUrl(row.thumbnail_url);
            }
        }

        // Add thumbnail_url to each applicable product
        for (const offer of offersWithProductInfo) {
            for (const product of offer.applicable_products) {
                if (!product.isCategory) {
                    const productId = parseInt(product.id, 10);
                    product.thumbnail_url = thumbnailMap[productId] || null;
                }
            }
        }

        res.json({
            offers: offersWithProductInfo,
            count: offersWithProductInfo.length
        });

    } catch (error) {
        console.error('Get app-exclusive offers error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania ofert.' });
    }
});


/**
 * POST /api/checkout/create-order
 * Creates a pending order via WooCommerce REST API and returns checkout URL.
 * This allows the user to be redirected to the store checkout with pre-filled cart and billing info.
 * Protected: Requires authentication token.
 */
router.post('/checkout/create-order', verifyToken, async (req, res) => {
    const { items } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Zamówienie musi zawierać przynajmniej jeden produkt.' });
    }

    // Validate WooCommerce API credentials
    const wcStoreUrl = process.env.WC_STORE_URL;
    const wcConsumerKey = process.env.WC_CONSUMER_KEY;
    const wcConsumerSecret = process.env.WC_CONSUMER_SECRET;

    if (!wcStoreUrl || !wcConsumerKey || !wcConsumerSecret) {
        console.error('WooCommerce API credentials not configured');
        return res.status(500).json({ message: 'Konfiguracja sklepu nie jest kompletna. Skontaktuj się z administratorem.' });
    }

    try {
        // Get user data including billing info from database
        const [users] = await db.query('SELECT ID, user_email, display_name FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony.' });
        }
        const user = users[0];

        // Get user metadata (first_name, last_name, phone)
        const [userMeta] = await db.query(
            `SELECT meta_key, meta_value FROM el1usermeta 
             WHERE user_id = ? AND meta_key IN ('first_name', 'last_name', 'billing_phone')`,
            [req.userId]
        );

        // Build metadata object
        const metadata = {};
        userMeta.forEach(row => {
            metadata[row.meta_key] = row.meta_value;
        });

        const firstName = metadata['first_name'] || user.display_name.split(' ')[0] || 'Klient';
        const lastName = metadata['last_name'] || user.display_name.split(' ').slice(1).join(' ') || '';
        const phone = metadata['billing_phone'] || '';

        // Prepare line items for WooCommerce API
        const lineItems = items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity || 1
        }));

        // Create order via WooCommerce REST API
        // Note: customer_id in WC REST API expects WordPress user ID (from el1users.ID)
        const https = require('https');
        const orderData = {
            status: 'pending',
            billing: {
                first_name: firstName,
                last_name: lastName,
                email: user.user_email,
                phone: phone
            },
            line_items: lineItems,
            customer_id: req.userId, // WordPress user ID for proper order association
            set_paid: false
        };

        // Make request to WooCommerce REST API
        const wcApiUrl = `${wcStoreUrl}/wp-json/wc/v3/orders`;
        const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');

        const response = await fetch(wcApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('WooCommerce API error:', response.status, errorData);
            return res.status(500).json({
                message: 'Nie udało się utworzyć zamówienia w sklepie. Spróbuj ponownie.'
            });
        }

        const wcOrder = await response.json();

        // Build the final checkout URL (where user ends up after login)
        // Format: /kasa/order-pay/{order_id}/?pay_for_order=true&key={order_key}
        const finalCheckoutUrl = `${wcStoreUrl}/kasa/order-pay/${wcOrder.id}/?pay_for_order=true&key=${wcOrder.order_key}`;

        // Generate a one-time login token for seamless WordPress login
        const loginToken = crypto.randomBytes(32).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // Expires in 5 minutes

        // Store the login token in database
        await db.query(
            `INSERT INTO el1app_login_tokens (user_id, token, redirect_url, created_at, expires_at, used) 
             VALUES (?, ?, ?, ?, ?, 0)`,
            [req.userId, loginToken, finalCheckoutUrl, now, expiresAt]
        );

        // Build the auto-login URL (WordPress will process this, log user in, then redirect to checkout)
        const autoLoginUrl = `${wcStoreUrl}/?app_login_token=${loginToken}`;

        res.status(201).json({
            orderId: wcOrder.id,
            checkoutUrl: autoLoginUrl, // This now goes through auto-login first
            orderKey: wcOrder.order_key,
            total: wcOrder.total
        });

    } catch (error) {
        console.error('Create checkout order error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas tworzenia zamówienia.' });
    }
});

module.exports = router;

