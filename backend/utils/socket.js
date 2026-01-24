import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "./logger.js";
import { ERROR_CODES } from "./constants.js";

/**
 * Socket.IO Server Setup
 * Handles WebSocket connections with JWT authentication, organization rooms, and heartbeat mechanism
 *
 * Requirements: 18.1, 18.2, 18.11
 */

/**
 * Initialize Socket.IO server with HTTP server
 * @param {import('http').Server} httpServer - HTTP server instance
 * @param {Object} corsOptions - CORS configuration options
 * @returns {import('socket.io').Server} Socket.IO server instance
 */
export const initializeSocketIO = (httpServer, corsOptions) => {
  try {
    logger.info("Initializing Socket.IO server");

    // Create Socket.IO server with CORS configuration
    const io = new Server(httpServer, {
      cors: {
        origin: corsOptions.origin,
        credentials: corsOptions.credentials,
        methods: ["GET", "POST"],
      },
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      transports: ["websocket", "polling"],
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        // Extract token from handshake auth or cookies
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.cookie
            ?.split("; ")
            .find((c) => c.startsWith("accessToken="))
            ?.split("=")[1];

        if (!token) {
          logger.warn("Socket.IO connection attempt without token", {
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(
            new Error(
              JSON.stringify({
                code: ERROR_CODES.UNAUTHENTICATED_ERROR,
                message: "Authentication token required",
              })
            )
          );
        }

        // Verify JWT token (same secret as HTTP requests)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user data to socket
        socket.userId = decoded.userId;
        socket.organizationId = decoded.organizationId;
        socket.departmentId = decoded.departmentId;
        socket.role = decoded.role;
        socket.isPlatformUser = decoded.isPlatformUser;

        logger.info("Socket.IO authentication successful", {
          socketId: socket.id,
          userId: socket.userId,
          organizationId: socket.organizationId,
          departmentId: socket.departmentId,
          role: socket.role,
        });

        next();
      } catch (error) {
        logger.error("Socket.IO authentication failed", {
          error: error.message,
          socketId: socket.id,
          ip: socket.handshake.address,
        });

        if (error.name === "TokenExpiredError") {
          return next(
            new Error(
              JSON.stringify({
                code: ERROR_CODES.UNAUTHENTICATED_ERROR,
                message: "Token expired",
              })
            )
          );
        }

        if (error.name === "JsonWebTokenError") {
          return next(
            new Error(
              JSON.stringify({
                code: ERROR_CODES.UNAUTHENTICATED_ERROR,
                message: "Invalid token",
              })
            )
          );
        }

        return next(
          new Error(
            JSON.stringify({
              code: ERROR_CODES.INTERNAL_ERROR,
              message: "Authentication failed",
            })
          )
        );
      }
    });

    // Connection handler
    io.on("connection", (socket) => {
      logger.info("Socket.IO client connected", {
        socketId: socket.id,
        userId: socket.userId,
        organizationId: socket.organizationId,
        departmentId: socket.departmentId,
      });

      // Join organization-specific room
      const organizationRoom = `org:${socket.organizationId}`;
      socket.join(organizationRoom);
      logger.info("Socket joined organization room", {
        socketId: socket.id,
        userId: socket.userId,
        room: organizationRoom,
      });

      // Join department-specific room
      const departmentRoom = `dept:${socket.departmentId}`;
      socket.join(departmentRoom);
      logger.info("Socket joined department room", {
        socketId: socket.id,
        userId: socket.userId,
        room: departmentRoom,
      });

      // Join user-specific room (for direct notifications)
      const userRoom = `user:${socket.userId}`;
      socket.join(userRoom);
      logger.info("Socket joined user room", {
        socketId: socket.id,
        userId: socket.userId,
        room: userRoom,
      });

      // Emit user online status to organization
      io.to(organizationRoom).emit("user:online", {
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Heartbeat mechanism (ping-pong)
      socket.on("ping", () => {
        socket.emit("pong", {
          timestamp: new Date().toISOString(),
        });
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        logger.info("Socket.IO client disconnected", {
          socketId: socket.id,
          userId: socket.userId,
          organizationId: socket.organizationId,
          reason,
        });

        // Emit user offline status to organization
        io.to(organizationRoom).emit("user:offline", {
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle errors
      socket.on("error", (error) => {
        logger.error("Socket.IO error", {
          socketId: socket.id,
          userId: socket.userId,
          error: error.message,
          stack: error.stack,
        });
      });

      // Handle reconnection
      socket.on("reconnect", (attemptNumber) => {
        logger.info("Socket.IO client reconnected", {
          socketId: socket.id,
          userId: socket.userId,
          attemptNumber,
        });
      });

      // Handle reconnection attempt
      socket.on("reconnect_attempt", (attemptNumber) => {
        logger.info("Socket.IO reconnection attempt", {
          socketId: socket.id,
          userId: socket.userId,
          attemptNumber,
        });
      });

      // Handle reconnection error
      socket.on("reconnect_error", (error) => {
        logger.error("Socket.IO reconnection error", {
          socketId: socket.id,
          userId: socket.userId,
          error: error.message,
        });
      });

      // Handle reconnection failed
      socket.on("reconnect_failed", () => {
        logger.error("Socket.IO reconnection failed", {
          socketId: socket.id,
          userId: socket.userId,
        });
      });
    });

    // Handle server errors
    io.on("error", (error) => {
      logger.error("Socket.IO server error", {
        error: error.message,
        stack: error.stack,
      });
    });

    logger.info("Socket.IO server initialized successfully");

    return io;
  } catch (error) {
    logger.error("Failed to initialize Socket.IO server", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default initializeSocketIO;
