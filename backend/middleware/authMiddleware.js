"use strict";

/**
 * authMiddleware.js
 * -----------------
 * PLACEHOLDER — Reserved for future JWT authentication.
 *
 * When the backend begins handling authenticated requests, this middleware
 * will be responsible for:
 *
 *   1. Reading the Authorization header: `Bearer <token>`
 *   2. Verifying the JWT using the shared secret (process.env.JWT_SECRET)
 *   3. Attaching the decoded user object to `req.user`
 *   4. Calling next() on success or returning 401 Unauthorized on failure
 *
 * Example future implementation:
 *
 *   const jwt = require("jsonwebtoken");
 *
 *   const protect = (req, res, next) => {
 *     const token = req.headers.authorization?.split(" ")[1];
 *     if (!token) return res.status(401).json({ success: false, message: "Not authorized" });
 *     try {
 *       req.user = jwt.verify(token, process.env.JWT_SECRET);
 *       next();
 *     } catch {
 *       return res.status(401).json({ success: false, message: "Token invalid or expired" });
 *     }
 *   };
 *
 * For now, this middleware is a transparent pass-through.
 */
const protect = (req, res, next) => next();

module.exports = { protect };
