'use strict';

const authService = require('../services/auth');

class AuthController {
  /**
   * PUBLIC_INTERFACE
   * Register new user
   * Body: { email: string, password: string }
   * Returns: { user: { id, email, createdAt } }
   */
  async signup(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const user = await authService.registerUser(email, password);
      return res.status(201).json({ status: 'success', user });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Login user
   * Body: { email: string, password: string }
   * Returns: { token: string, user: { id, email, createdAt } }
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const { token, user } = await authService.loginUser(email, password);
      return res.status(200).json({ status: 'success', token, user });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Logout user
   * Header: Authorization: Bearer <token>
   * Returns: { success: true }
   */
  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        const e = new Error('Missing Authorization header');
        e.status = 401;
        throw e;
      }
      authService.logoutUser(token);
      return res.status(200).json({ status: 'success', success: true });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Validate token
   * Header: Authorization: Bearer <token>
   * Returns: { valid: boolean, user: { sub, email, iat, exp, jti? } }
   */
  async validate(req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        const e = new Error('Missing Authorization header');
        e.status = 401;
        throw e;
      }
      const decoded = authService.validateToken(token);
      return res.status(200).json({ status: 'success', valid: true, user: decoded });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Example protected resource to demonstrate auth middleware usage.
   */
  async me(req, res, next) {
    try {
      // req.user injected by authMiddleware
      return res.status(200).json({ status: 'success', user: req.user });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AuthController();
