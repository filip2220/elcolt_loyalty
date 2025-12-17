/**
 * Rewards Routes
 * 
 * Handles loyalty rewards:
 * - GET /levels - Get loyalty levels
 * - GET /rewards - Get available rewards
 * - POST /user/redeem - Redeem a reward
 */

const express = require('express');
const db = require('../db');
const verifyToken = require('../authMiddleware');

const router = express.Router();

/**
 * GET /levels
 * Returns all loyalty levels
 */
router.get('/levels', async (req, res) => {
    try {
        const [levels] = await db.query(
            'SELECT id, name, from_points, to_points FROM el1wlr_levels ORDER BY from_points ASC'
        );
        res.json(levels);
    } catch (error) {
        // Handle typo in database schema (from_poir instead of from_points)
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
 * GET /rewards
 * Returns available rewards
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
 * POST /user/redeem
 * Redeems a reward for points
 */
router.post('/user/redeem', verifyToken, async (req, res) => {
    const { rewardId } = req.body;

    if (!rewardId) {
        return res.status(400).json({ message: 'ID nagrody jest wymagane.' });
    }

    let connection;
    try {
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        // 1. Get user's email and points
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

        // 5. Generate coupon code and log transaction
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
        if (connection) await connection.rollback();
        console.error('Redeem reward error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas odbierania nagrody.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
