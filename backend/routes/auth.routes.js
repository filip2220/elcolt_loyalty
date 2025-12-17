/**
 * Authentication Routes
 * 
 * Handles user authentication:
 * - POST /signup - Register new user
 * - POST /login - Authenticate user
 * - POST /logout - Clear session
 * - GET /auth/check - Verify authentication status
 * - POST /forgot-password - Request password reset
 * - POST /reset-password - Complete password reset
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const wphash = require('wordpress-hash-node');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');
const verifyToken = require('../authMiddleware');
const { checkPassword } = require('../utils/passwordUtils');

const router = express.Router();

// JWT Cookie options for secure token storage
const JWT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/'
};

// Email transporter for password reset
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * POST /signup
 * Registers a new user
 */
router.post('/signup', async (req, res) => {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !phone) {
        return res.status(400).json({ message: 'Wszystkie pola są wymagane.' });
    }

    let connection;
    try {
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        const [existingUsers] = await connection.execute('SELECT ID FROM el1users WHERE user_email = ?', [email]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Użytkownik z tym adresem email już istnieje.' });
        }

        const displayName = `${firstName} ${lastName}`;
        const userNicename = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`.replace(/[^a-z-]/g, '');
        const userPass = wphash.HashPassword(password);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const [insertResult] = await connection.execute(
            `INSERT INTO el1users (user_login, user_pass, user_nicename, user_email, user_registered, display_name, user_status) 
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [email, userPass, userNicename, email, now, displayName]
        );
        const newUserId = insertResult.insertId;

        await Promise.all([
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'first_name', firstName]),
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'last_name', lastName]),
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'billing_phone', phone]),
            connection.execute('INSERT INTO el1usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)', [newUserId, 'el1capabilities', 'a:1:{s:8:"customer";b:1;}'])
        ]);

        await connection.commit();

        const token = jwt.sign({ userId: newUserId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('jwt_token', token, JWT_COOKIE_OPTIONS);
        res.status(201).json({ token, message: 'Rejestracja zakończona pomyślnie.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas rejestracji.' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * POST /login
 * Authenticates user with email or phone
 */
router.post('/login', async (req, res) => {
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Email lub numer telefonu i hasło są wymagane.' });
    }

    try {
        let users = [];
        const trimmedIdentifier = identifier.trim();
        const isEmail = trimmedIdentifier.includes('@');

        if (isEmail) {
            [users] = await db.query('SELECT ID, user_pass, user_email FROM el1users WHERE user_email = ?', [trimmedIdentifier]);
        } else {
            const cleanedPhone = trimmedIdentifier.replace(/[\s\-\(\)]/g, '');
            const phoneVariants = [
                cleanedPhone,
                `+48${cleanedPhone}`,
                `+48 ${cleanedPhone}`,
                `48${cleanedPhone}`,
            ];

            const placeholders = phoneVariants.map(() => '?').join(', ');
            const query = `
                SELECT u.ID, u.user_pass, u.user_email 
                FROM el1users u
                INNER JOIN el1usermeta m ON u.ID = m.user_id
                WHERE m.meta_key = 'billing_phone' 
                AND (m.meta_value IN (${placeholders}) 
                     OR REPLACE(REPLACE(REPLACE(REPLACE(m.meta_value, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?)
                LIMIT 1
            `;
            const likePattern = `%${cleanedPhone}`;
            [users] = await db.query(query, [...phoneVariants, likePattern]);
        }

        if (users.length === 0) {
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        const user = users[0];
        const passwordToCheck = typeof password === 'string' ? password.trim() : password;
        const isPasswordCorrect = await checkPassword(passwordToCheck, user.user_pass, user.user_email, user.ID);

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Nieprawidłowe dane logowania.' });
        }

        const token = jwt.sign({ userId: user.ID }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('jwt_token', token, JWT_COOKIE_OPTIONS);
        res.json({ token, message: 'Zalogowano pomyślnie.' });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas logowania.' });
    }
});

/**
 * POST /logout
 * Clears JWT cookie
 */
router.post('/logout', (req, res) => {
    res.clearCookie('jwt_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
    });
    res.json({ message: 'Wylogowano pomyślnie.' });
});

/**
 * GET /auth/check
 * Checks if user is authenticated
 */
router.get('/auth/check', verifyToken, async (req, res) => {
    try {
        const [users] = await db.query('SELECT ID, display_name, user_email FROM el1users WHERE ID = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(401).json({ authenticated: false, message: 'User not found.' });
        }
        const user = users[0];
        res.json({
            authenticated: true,
            user: {
                id: user.ID,
                name: user.display_name,
                email: user.user_email
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ authenticated: false, message: 'Server error.' });
    }
});

/**
 * POST /forgot-password
 * Sends password reset email
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email jest wymagany.' });
    }

    try {
        const [users] = await db.query('SELECT ID, user_email FROM el1users WHERE user_email = ?', [email]);

        // Always return same message to prevent user enumeration
        if (users.length === 0) {
            return res.json({
                message: 'Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła.'
            });
        }

        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await db.query(
            `INSERT INTO el1password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at), used = 0`,
            [user.ID, resetToken, expiresAt]
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@elcolt.pl',
                to: user.user_email,
                subject: 'Resetowanie hasła - El Colt Loyalty',
                html: `
                    <h1>Resetowanie hasła</h1>
                    <p>Kliknij poniższy link, aby zresetować swoje hasło:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <p>Link jest ważny przez 1 godzinę.</p>
                    <p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
                `
            });
        }

        res.json({
            message: 'Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

/**
 * POST /reset-password
 * Resets password with token
 */
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token i nowe hasło są wymagane.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Hasło musi mieć co najmniej 8 znaków.' });
    }

    let connection;
    try {
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        const [tokens] = await connection.execute(
            'SELECT user_id, expires_at, used FROM el1password_reset_tokens WHERE token = ?',
            [token]
        );

        if (tokens.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Nieprawidłowy token.' });
        }

        const tokenData = tokens[0];

        if (tokenData.used) {
            await connection.rollback();
            return res.status(400).json({ message: 'Token został już wykorzystany.' });
        }

        if (new Date(tokenData.expires_at) < new Date()) {
            await connection.rollback();
            return res.status(400).json({ message: 'Token wygasł. Poproś o nowy link.' });
        }

        const newHash = wphash.HashPassword(newPassword);
        await connection.execute('UPDATE el1users SET user_pass = ? WHERE ID = ?', [newHash, tokenData.user_id]);
        await connection.execute('UPDATE el1password_reset_tokens SET used = 1 WHERE token = ?', [token]);

        await connection.commit();
        res.json({ message: 'Hasło zostało zmienione pomyślnie.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
