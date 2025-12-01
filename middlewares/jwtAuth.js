// Middleware to verify JWT from cookie or Authorization header
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

function verifyJWT(req, res, next) {
  // Accept token from cookie `token` or Authorization header `Bearer ...`
  let token = null;
  if (req.cookies && req.cookies.token) token = req.cookies.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // If this is an API request, return 401 JSON; otherwise redirect to login
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)) {
      return res.status(401).json({ error: 'Missing token' });
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // attach user to request
    req.user = payload;
    next();
  } catch (err) {
    console.error('JWT verification failed', err.message);
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
}

module.exports = verifyJWT;
