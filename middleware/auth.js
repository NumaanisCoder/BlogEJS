const { verifyToken } = require('../util/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticateJWT = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await prisma.umami.findUnique({
          where: { umami_id: decoded.umami_id }  // Changed from user_id to umami_id
        });

        if (user) {
          req.user = user;
          // Store user in session for compatibility with existing code
          req.session.user = user;
        }
      }
    } catch (err) {
      console.error('JWT verification error:', err);
    }
  }

  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/user/login');
  }
  next();
};

module.exports = { authenticateJWT, requireAuth };