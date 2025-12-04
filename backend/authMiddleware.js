const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  let bearerHeader = req.headers['authorization'];

  // Per HTTP spec, headers can be repeated, resulting in an array.
  // We handle this by taking the last one if it's an array.
  if (Array.isArray(bearerHeader)) {
    bearerHeader = bearerHeader[bearerHeader.length - 1];
  }

  if (typeof bearerHeader !== 'undefined') {
    // The header format is "Bearer <token>"
    const bearer = bearerHeader.split(' ');
    const token = bearer[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token not provided in header.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
             return res.status(403).json({ message: 'Forbidden: Your session has expired. Please log in again.' });
        }
        return res.status(403).json({ message: 'Forbidden: Invalid token.' });
      }
      // Attach the user ID from the token to the request object
      req.userId = authData.userId;
      next();
    });
  } else {
    res.status(401).json({ message: 'Unauthorized: Authorization header is missing.' });
  }
}

module.exports = verifyToken;