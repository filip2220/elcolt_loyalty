/**
 * Routes Index
 * 
 * This module combines all route modules into a single router for use with Express.
 * 
 * Architecture Notes:
 * -------------------
 * The API routes have been refactored from a monolithic 1900+ line file into
 * domain-based modules for better maintainability:
 * 
 * Route Modules:
 * - routes/auth.routes.js      - Authentication (signup, login, logout, password reset)
 * - routes/user.routes.js      - User operations (profile, points, activity, savings, QR)
 * - routes/rewards.routes.js   - Loyalty rewards (levels, rewards list, redeem)
 * - routes/products.routes.js  - Products (list, details, images, image proxy)
 * - routes/sales.routes.js     - Sales (public sales, app-exclusive offers)
 * - routes/checkout.routes.js  - Checkout (create WooCommerce order)
 * - routes/account.routes.js   - Account management (delete account)
 * 
 * Utility Modules:
 * - utils/passwordUtils.js     - Password verification (WordPress/bcrypt/HMAC support)
 * - utils/imageUtils.js        - Image URL fixing and SSRF protection
 */

const express = require('express');

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const rewardsRoutes = require('./rewards.routes');
const productsRoutes = require('./products.routes');
const salesRoutes = require('./sales.routes');
const checkoutRoutes = require('./checkout.routes');
const accountRoutes = require('./account.routes');

const router = express.Router();

// Mount all route modules
router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', rewardsRoutes);
router.use('/', productsRoutes);
router.use('/', salesRoutes);
router.use('/', checkoutRoutes);
router.use('/', accountRoutes);

// Export combined router
module.exports = router;
