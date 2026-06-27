"use strict";

/**
 * errorHandler.js
 * ----------------
 * Global Express error-handling middleware.
 *
 * Must be registered AFTER all routes in server.js:
 *   app.use(errorHandler);
 *
 * Express identifies this as an error handler because it accepts
 * four arguments: (err, req, res, next).
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  console.error(`[MediTrack Error] ${statusCode} — ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
