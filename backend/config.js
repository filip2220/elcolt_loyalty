/**
 * Environment Configuration and Validation
 * 
 * This module validates that all required environment variables are present
 * and provides a centralized configuration object for the application.
 * 
 * SECURITY: Fails fast if critical environment variables are missing,
 * preventing the server from starting with incomplete configuration.
 */

// List of required environment variables
const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
];

// Validate that all required environment variables are set
function validateEnvironment() {
    const missing = [];

    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    if (missing.length > 0) {
        console.error('❌ FATAL ERROR: Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\n💡 Please check your .env file and ensure all required variables are set.');
        console.error('   See .env.example for reference.\n');
        process.exit(1);
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET.length < 32) {
        console.error('❌ FATAL ERROR: JWT_SECRET is too weak (minimum 32 characters required)');
        console.error('💡 Generate a secure secret using:');
        console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
        process.exit(1);
    }

    console.log('✅ Environment validation passed');
}

// Export configuration object
module.exports = {
    validateEnvironment,

    // Database configuration
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    },

    // Server configuration
    server: {
        port: process.env.PORT || 8080,
        nodeEnv: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};
