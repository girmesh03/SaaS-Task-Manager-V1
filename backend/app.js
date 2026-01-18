import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import corsOptions from "./config/corsOptions.js";
import errorHandler from "./errorHandler/ErrorController.js";
import logger from "./utils/logger.js";
import { generateRequestId } from "./utils/helpers.js";
import { RATE_LIMIT } from "./utils/constants.js";

// Set timezone to UTC
process.env.TZ = "UTC";

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = generateRequestId();
  res.setHeader("X-Request-Id", req.id);
  next();
});

// Security headers with Helmet (include Cloudinary CDN in CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https://res.cloudinary.com"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS with credentials support
app.use(cors(corsOptions));

// Body parser middleware with payload limits (10mb)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// Compression middleware (1KB threshold)
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Rate limiting for all /api routes
const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP, please try again later",
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests from this IP, please try again later",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

app.use("/api", limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// Health check endpoint with database connection status
app.get("/health", async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    const dbStatus = mongoose.default.connection.readyState;

    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbStatusMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const isHealthy = dbStatus === 1;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? "Server is healthy" : "Server is unhealthy",
      data: {
        server: "running",
        database: dbStatusMap[dbStatus] || "unknown",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Health check error:", error);
    res.status(503).json({
      success: false,
      message: "Server is unhealthy",
      error: {
        code: "HEALTH_CHECK_FAILED",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// API routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// ... other routes

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler (must be last middleware)
app.use(errorHandler);

export default app;
