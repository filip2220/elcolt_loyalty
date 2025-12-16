// Load environment variables from .env file
require('dotenv').config();

// Validate environment configuration before starting server
const config = require('./config');
config.validateEnvironment();

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./apiRoutes');

const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// LOGGING: Add request logging
app.use(morgan('combined'));

// SECURITY FIX: Restrict CORS to specific origin instead of allowing all
// This prevents unauthorized websites from accessing the API
// Always allow common localhost ports for development, plus any configured FRONTEND_URL
const devOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
const allowedOrigins = process.env.FRONTEND_URL
  ? [...devOrigins, process.env.FRONTEND_URL]
  : devOrigins;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));

// Log CORS configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔒 CORS enabled for origin:', corsOptions.origin);
}

// SECURITY: Apply rate limiting to all requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased to support loading many product images)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// SECURITY: Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/signup attempts per windowMs
  message: { message: 'Too many login attempts, please try again later.' }
});
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);

// Middleware to parse JSON bodies
app.use(express.json());

// HEALTH CHECK: Endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main API routes
app.use('/api', apiRoutes);

// A simple root endpoint to check if the server is running
app.get('/', (req, res) => {
  res.send('Loyalty API is running!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
