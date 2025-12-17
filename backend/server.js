// Load environment variables from .env file
require('dotenv').config();

// Validate environment configuration before starting server
const config = require('./config');
config.validateEnvironment();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// API Routes
// Use modular routes by default, fallback to legacy monolithic routes if needed
const apiRoutes = process.env.USE_LEGACY_ROUTES === 'true'
  ? require('./apiRoutes')
  : require('./routes');

const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================

// SECURITY: Helmet sets various HTTP headers to protect app
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: SAMEORIGIN
// - X-XSS-Protection: 0 (disabled in favor of CSP)
// - Strict-Transport-Security (HSTS)
// - And more...
app.use(helmet({
  // Content Security Policy - customize for your app
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React needs inline scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.elcolt.pl", "https://elcolt.pl", "http://localhost:*", "ws://localhost:*"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  // Cross-Origin settings for mobile apps
  crossOriginEmbedderPolicy: false, // Allow embedding from mobile apps
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// SECURITY: HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Trust proxy headers when behind Cloud Run or load balancer
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // Enable trust proxy for Cloud Run
  app.set('trust proxy', 1);
}

// LOGGING: Add request logging
// Use 'combined' format in production for full details, 'dev' for development
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// SECURITY: Restrict CORS to specific origin instead of allowing all
// This prevents unauthorized websites from accessing the API
// Always allow common localhost ports for development, plus any configured FRONTEND_URL
const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Capacitor app origins
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost'
];

const productionOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['https://elcolt.pl', 'https://www.elcolt.pl'];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [...productionOrigins, 'capacitor://localhost', 'ionic://localhost']
  : [...devOrigins, ...productionOrigins];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));

// Log CORS configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔒 CORS enabled for origins:', allowedOrigins.slice(0, 5), '...');
}

// SECURITY: Apply rate limiting to all requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});
app.use(globalLimiter);

// SECURITY: Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/signup attempts per windowMs
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/reset-password', authLimiter);

// SECURITY: Rate limit for account deletion (prevent abuse)
const accountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 deletion attempts per hour
  message: { message: 'Too many account modification attempts, please try again later.' }
});
app.use('/api/user/account', accountLimiter);

// Middleware to parse JSON bodies with size limit
app.use(express.json({
  limit: '10kb', // Prevent large payload attacks
  strict: true   // Only accept arrays and objects
}));

// SECURITY: Parse cookies for httpOnly JWT authentication
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// =====================================================
// HEALTH CHECK & MONITORING
// =====================================================

// HEALTH CHECK: Endpoint for monitoring (Cloud Run, Kubernetes, etc.)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// =====================================================
// API ROUTES
// =====================================================

// Main API routes
app.use('/api', apiRoutes);

// A simple root endpoint to check if the server is running
app.get('/', (req, res) => {
  res.json({
    message: 'El Colt Loyalty API',
    version: '1.0.0',
    status: 'running'
  });
});

// =====================================================
// ERROR HANDLING
// =====================================================

// Handle 404 - Route not found
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error details (but not in response for security)
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An error occurred'
    : err.message;

  res.status(err.status || 500).json({ message });
});

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║        El Colt Loyalty API Server                  ║
╠════════════════════════════════════════════════════╣
║  Port:        ${PORT.toString().padEnd(37)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(37)}║
║  Security:    Helmet enabled                       ║
║  CORS:        Configured                           ║
║  Rate Limit:  Active                               ║
╚════════════════════════════════════════════════════╝
  `);
});
