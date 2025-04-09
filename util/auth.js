// utils/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret-key';
const JWT_EXPIRES_IN = '30d';

const generateToken = (user_id) => {
  return jwt.sign({ user_id: user_id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };