/**
 * Environment Variables Validation
 * Validates required environment variables on startup
 */

import logger from "./logger.js";

const validateEnv = () => {
  const requiredEnvVars = [
    "MONGODB_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_ACCESS_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",
    "PORT",
    "NODE_ENV",
    "ALLOWED_ORIGINS",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "APP_NAME",
    "PLATFORM_ORGANIZATION_NAME",
    "PLATFORM_ORGANIZATION_EMAIL",
    "PLATFORM_ORGANIZATION_PHONE",
    "PLATFORM_ORGANIZATION_ADDRESS",
    "PLATFORM_DEPARTMENT_NAME",
    "PLATFORM_ADMIN_FIRST_NAME",
    "PLATFORM_ADMIN_LAST_NAME",
    "PLATFORM_ADMIN_EMAIL",
    "PLATFORM_ADMIN_PASSWORD",
    "PLATFORM_ADMIN_ROLE",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    logger.error("❌ Missing required environment variables:");
    missingEnvVars.forEach((envVar) => {
      logger.error(`   - ${envVar}`);
    });
    logger.error(
      "\nPlease check your .env file and ensure all required variables are set."
    );
    process.exit(1);
  }

  // Validate JWT secrets length (should be at least 32 characters)
  if (process.env.JWT_ACCESS_SECRET.length < 32) {
    logger.error("❌ JWT_ACCESS_SECRET must be at least 32 characters long");
    process.exit(1);
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    logger.error("❌ JWT_REFRESH_SECRET must be at least 32 characters long");
    process.exit(1);
  }

  // Validate NODE_ENV
  const validNodeEnvs = ["development", "production", "test"];
  if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
    logger.error(`❌ NODE_ENV must be one of: ${validNodeEnvs.join(", ")}`);
    process.exit(1);
  }

  logger.info("✅ All required environment variables are set");
};

export default validateEnv;
