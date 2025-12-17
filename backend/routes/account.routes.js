/**
 * Account Routes
 * 
 * Handles account management:
 * - DELETE /user/account - Delete user account permanently
 */

const express = require('express');
const db = require('../db');
const verifyToken = require('../authMiddleware');

const router = express.Router();

/**
 * DELETE /user/account
 * Permanently deletes user account and all associated data
 * Required by Google Play and iOS App Store policies
 */
router.delete('/user/account', verifyToken, async (req, res) => {
    const connection = await db.pool.getConnection();

    try {
        const userId = req.userId;

        console.log(`[ACCOUNT DELETION] Starting deletion for user ID: ${userId}`);

        // Get user info before deletion
        const [userInfo] = await connection.execute(
            'SELECT user_email, display_name FROM el1users WHERE ID = ?',
            [userId]
        );

        if (userInfo.length === 0) {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony.' });
        }

        const userEmail = userInfo[0].user_email;
        const displayName = userInfo[0].display_name;

        await connection.beginTransaction();

        // 1. Delete user metadata
        const [metaDeleteResult] = await connection.execute(
            'DELETE FROM el1usermeta WHERE user_id = ?',
            [userId]
        );
        console.log(`[ACCOUNT DELETION] Deleted ${metaDeleteResult.affectedRows} rows from el1usermeta`);

        // 2. Delete loyalty data
        try {
            const [loyaltyDeleteResult] = await connection.execute(
                'DELETE FROM el1wlr_users WHERE user_email = ?',
                [userEmail]
            );
            console.log(`[ACCOUNT DELETION] Deleted ${loyaltyDeleteResult.affectedRows} rows from el1wlr_users`);
        } catch (loyaltyError) {
            console.log('[ACCOUNT DELETION] Could not delete from loyalty table:', loyaltyError.message);
        }

        // 3. Delete loyalty transactions
        try {
            const [tranDeleteResult] = await connection.execute(
                'DELETE FROM el1wlr_earn_campaign_transaction WHERE user_email = ?',
                [userEmail]
            );
            console.log(`[ACCOUNT DELETION] Deleted ${tranDeleteResult.affectedRows} rows from el1wlr_earn_campaign_transaction`);
        } catch (tranError) {
            console.log('[ACCOUNT DELETION] Could not delete from transactions table:', tranError.message);
        }

        // 4. Delete app login tokens
        try {
            const [tokenDeleteResult] = await connection.execute(
                'DELETE FROM el1app_login_tokens WHERE user_id = ?',
                [userId]
            );
            console.log(`[ACCOUNT DELETION] Deleted ${tokenDeleteResult.affectedRows} rows from el1app_login_tokens`);
        } catch (tokenError) {
            console.log('[ACCOUNT DELETION] Could not delete from login tokens table:', tokenError.message);
        }

        // 5. Delete password reset tokens
        try {
            const [resetDeleteResult] = await connection.execute(
                'DELETE FROM el1password_reset_tokens WHERE user_id = ?',
                [userId]
            );
            console.log(`[ACCOUNT DELETION] Deleted ${resetDeleteResult.affectedRows} rows from el1password_reset_tokens`);
        } catch (resetError) {
            console.log('[ACCOUNT DELETION] Could not delete from password reset table:', resetError.message);
        }

        // 6. Delete the user
        const [userDeleteResult] = await connection.execute(
            'DELETE FROM el1users WHERE ID = ?',
            [userId]
        );
        console.log(`[ACCOUNT DELETION] Deleted ${userDeleteResult.affectedRows} rows from el1users`);

        if (userDeleteResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Nie udało się usunąć konta.' });
        }

        await connection.commit();

        console.log(`[ACCOUNT DELETION] Successfully deleted account for: ${displayName} (${userEmail})`);

        res.json({
            message: 'Konto zostało pomyślnie usunięte.',
            deleted: true
        });

    } catch (error) {
        await connection.rollback();
        console.error('[ACCOUNT DELETION] Error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas usuwania konta. Spróbuj ponownie później.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
