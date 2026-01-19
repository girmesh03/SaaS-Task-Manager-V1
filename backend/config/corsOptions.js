import allowedOrigins from "./allowedOrigins.js";
import logger from "../utils/logger.js";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * CORS Configuration
 * Configures CORS with allowed origins and credentials support
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Enable credentials (cookies, authorization headers)
  optionsSuccessStatus: HTTP_STATUS.OK,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
};

export default corsOptions;
