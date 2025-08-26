# Project Repository

Authentication Backend (Express + JWT)

This service provides:
- User registration (POST /auth/signup)
- User login (POST /auth/login)
- User logout (POST /auth/logout)
- Token validation (GET /auth/validate)
- Current user (GET /auth/me) using Bearer token

Security:
- Passwords are hashed with bcrypt
- JWT tokens are signed with JWT_SECRET and expiration controlled by JWT_EXPIRES_IN
- Logout blacklists token jti in-memory until expiry (suitable for stateless APIs; use a DB/redis in production)

Environment
- Copy .env.example to .env and set values
- Important: JWT_SECRET must be set

Run
- npm install
- npm run dev
- Docs at /docs

Note
- User store is in-memory for this initial implementation. Replace with persistent storage in production.