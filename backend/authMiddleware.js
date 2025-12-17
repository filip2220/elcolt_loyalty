const jwt = require('jsonwebtoken');

/**
 * Authentication middleware that verifies JWT tokens.
 * 
 * SECURITY: Checks for token in the following order:
 * 1. httpOnly cookie 'jwt_token' (preferred, XSS-safe)
 * 2. Authorization header 'Bearer <token>' (backward compatibility)
 */
function verifyToken(req, res, next) {
  let token = null;

  // Priority 1: Check httpOnly cookie (more secure against XSS)
  if (req.cookies && req.cookies.jwt_token) {
    token = req.cookies.jwt_token;
  }
  // Priority 2: Fall back to Authorization header (backward compatibility)
  else {
    let bearerHeader = req.headers['authorization'];

    // Per HTTP spec, headers can be repeated, resulting in an array.
    // We handle this by taking the last one if it's an array.
    if (Array.isArray(bearerHeader)) {
      bearerHeader = bearerHeader[bearerHeader.length - 1];
    }

    if (typeof bearerHeader !== 'undefined') {
      // The header format is "Bearer <token>"
      const bearer = bearerHeader.split(' ');
      token = bearer[1];
    }
  }

  // No token found in either location
  if (!token) {
    return res.status(401).json({
      message: 'Unauthorized: Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({
          message: 'Forbidden: Your session has expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({
        message: 'Forbidden: Invalid token.',
        code: 'TOKEN_INVALID'
      });
    }
    // Attach the user ID from the token to the request object
    req.userId = authData.userId;
    next();
  });
}

module.exports = verifyToken;