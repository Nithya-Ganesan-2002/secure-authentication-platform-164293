'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Simple in-memory stores for demo; replace with persistent DB in production
const users = new Map(); // key: email, value: { id, email, passwordHash, createdAt }
const tokenBlacklist = new Set(); // JWT jti blacklist for logout

// Generate a simple unique id for in-memory users
function generateId() {
  return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * PUBLIC_INTERFACE
 * Registers a user by email and password, hashing the password.
 * Throws error if email already exists or invalid input.
 */
async function registerUser(email, password) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.has(normalizedEmail)) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const user = {
    id: generateId(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.set(normalizedEmail, user);
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

/**
 * PUBLIC_INTERFACE
 * Validates credentials and returns a signed JWT and user profile.
 */
async function loginUser(email, password) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.get(normalizedEmail);
  // To avoid user enumeration, run bcrypt compare with a dummy hash if user not found
  const hashToCompare = user?.passwordHash || '$2b$10$abcdefghijklmnopqrstuv';
  const passwordOk = await bcrypt.compare(password, hashToCompare);
  if (!user || !passwordOk) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  const token = createToken({ sub: user.id, email: user.email });
  return {
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  };
}

/**
 * PUBLIC_INTERFACE
 * Invalidates a JWT by storing its jti in blacklist until expiry.
 */
function logoutUser(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { ignoreExpiration: false });
    if (decoded && decoded.jti) {
      tokenBlacklist.add(decoded.jti);
      return true;
    }
  } catch (e) {
    // Ignore - invalid/expired token means no action needed
  }
  return true;
}

/**
 * PUBLIC_INTERFACE
 * Validates a JWT token and returns decoded payload if valid and not blacklisted.
 */
function validateToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { ignoreExpiration: false });
    if (decoded?.jti && tokenBlacklist.has(decoded.jti)) {
      const err = new Error('Token is invalidated');
      err.status = 401;
      throw err;
    }
    return decoded;
  } catch (err) {
    // Normalize error
    const e = new Error('Invalid or expired token');
    e.status = 401;
    throw e;
  }
}

/**
 * PUBLIC_INTERFACE
 * Express middleware to protect routes requiring authentication.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Missing Authorization header' });
  }
  try {
    const decoded = validateToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(err.status || 401).json({ status: 'error', message: err.message });
  }
}

/**
 * Create a JWT with standard claims.
 */
function createToken(payload) {
  const jwtId = 'jti_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const signOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtid: jwtId,
    subject: String(payload.sub),
  };
  return jwt.sign(
    {
      email: payload.email,
      sub: payload.sub,
    },
    getJwtSecret(),
    signOptions
  );
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  validateToken,
  authMiddleware,
};
