/**
 * Allowed Origins Configuration
 * Environment-based origin whitelist for CORS
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

export default allowedOrigins;
