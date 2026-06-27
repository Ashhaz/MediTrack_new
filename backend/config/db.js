"use strict";

/**
 * config/db.js
 * -------------
 * DATABASE / API CONFIGURATION — PLACEHOLDER
 *
 * ⚠️  The MediTrack frontend currently communicates DIRECTLY with Supabase
 *     using the Supabase JavaScript client library (@supabase/supabase-js).
 *     No backend database connection is required for the existing application.
 *
 * This file is reserved for future backend integrations, such as:
 *
 *   — A dedicated PostgreSQL connection (e.g., via `pg` or `prisma`)
 *     if the backend ever needs to bypass Supabase's REST API.
 *
 *   — A connection to a secondary database for analytics, caching,
 *     or AI-generated insights.
 *
 *   — External API clients (e.g., SendGrid for email, Twilio for SMS)
 *     that require server-side credentials.
 *
 * When you are ready to add a direct database connection, implement it here
 * and export the client/pool so it can be imported into controllers.
 *
 * Example (pg pool):
 *
 *   const { Pool } = require("pg");
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   module.exports = pool;
 */

module.exports = {};
