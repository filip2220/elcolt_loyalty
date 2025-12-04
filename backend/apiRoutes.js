const express = require('express');
const jwt = require('jsonwebtoken');
const wphash = require('wordpress-hash-node');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');
const verifyToken = require('./authMiddleware');

/**
 * Check password against hash - supports both old WordPress ($P$) and new bcrypt ($wp$2y$) formats
 */
async function checkPassword(password, hash) {
    // New WordPress format: $wp$2y$10$... (bcrypt with wp prefix)
    if (hash.startsWith('$wp$')) {
        // Remove the $wp prefix to get standard bcrypt hash
        const bcryptHash = hash.replace('$wp', '');
        return await bcrypt.compare(password, bcryptHash);
    }
    // Old WordPress format: $P$B... (phpass)
    else if (hash.startsWith('$P$')) {
        return wphash.CheckPassword(password, hash);
    }
    // Standard bcrypt format: $2y$10$... or $2a$10$...
    else if (hash.startsWith('$2')) {
        return await bcrypt.compare(password, hash);
    }
    // Fallback to wordpress-hash-node
    return wphash.CheckPassword(password, hash);
}

const router = express.Router();

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

        // Use bcrypt for new passwords (WordPress 6.x+ compatible format)
        const bcryptHash = await bcrypt.hash(password, 10);
        const hashedPassword = '$wp' + bcryptHash; // Add WordPress prefix
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
 * Body: { "email": "user@example.com", "password": "user_password" }
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email i hasło są wymagane.' });
    }

    try {
        const [users] = await db.query('SELECT ID, user_pass FROM el1users WHERE user_email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        const user = users[0];
        const isPasswordCorrect = await checkPassword(password, user.user_pass);

        if (!isPasswordCorrect) {
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
        // This query uses a LEFT JOIN to be more resilient. If a product has been
        // deleted from el1posts, it won't crash the query. Instead, COALESCE
        // provides a fallback name. This prevents server errors for orders
        // with deleted products.
        const query = `
            SELECT 
                lookup.order_item_id,
                lookup.date_created, 
                lookup.product_qty, 
                lookup.product_gross_revenue,
                COALESCE(posts.post_title, 'Product not found') AS product_name
            FROM el1wc_order_product_lookup AS lookup
            LEFT JOIN el1posts AS posts ON lookup.product_id = posts.ID
            WHERE lookup.customer_id = ?
            ORDER BY lookup.date_created DESC
            LIMIT 5;
        `;
        const [activity] = await db.query(query, [req.userId]);
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
        // PERFORMANCE: Optimized to use a single query with JOIN instead of two separate queries.
        // This avoids fetching all order IDs first and then querying discounts with a large IN clause.
        const [savingsResult] = await db.query(
            `SELECT SUM(d.cart_discount) as totalSavings 
             FROM el1wdr_order_item_discounts d
             INNER JOIN el1wc_order_product_lookup o ON d.order_id = o.order_id
             WHERE o.customer_id = ?`,
            [req.userId]
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
        // Use bcrypt for new passwords (WordPress 6.x+ compatible format)
        const bcryptHash = await bcrypt.hash(newPassword, 10);
        const hashedPassword = '$wp' + bcryptHash; // Add WordPress prefix

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

module.exports = router;
