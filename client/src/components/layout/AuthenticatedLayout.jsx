/**
 * AuthenticatedLayout Component
 * Layout component for authenticated routes only
 * Manages Socket.IO connection based on authentication state
 * Redirects to login if not authenticated
 */

import { useEffect, useCallback, useRef } from "react";
import { Outlet, Navigate } from "react-router";
import useAuth from "../../hooks/useAuth";
import socketService from "../../services/socketService";
import {
  initializeSocketEventHandlers,
  cleanupSocketEventHandlers,
} from "../../services/socketEvents";
import { store } from "../../redux/app/store";
import logger from "../../utils/logger";

/**
 * Socket status logging configuration
 * Maps socket status to log level and message
 */
const SOCKET_STATUS_LOGS = {
  connected: { level: "info", message: "Socket connected" },
  disconnected: { level: "info", message: "Socket disconnected" },
  error: { level: "error", message: "Socket error" },
  reconnecting: { level: "info", message: "Socket reconnecting" },
  reconnected: { level: "info", message: "Socket reconnected" },
};

const AuthenticatedLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const isInitializingRef = useRef(false);

  /**
   * Handle socket status changes with structured logging
   * Memoized to prevent unnecessary re-renders
   */
  const handleSocketStatusChange = useCallback((status, data) => {
    const logConfig = SOCKET_STATUS_LOGS[status];

    if (logConfig) {
      logger[logConfig.level](
        `[AuthenticatedLayout] ${logConfig.message}`,
        data ? { data } : undefined
      );
    } else {
      logger.debug("[AuthenticatedLayout] Socket status change", {
        status,
        data,
      });
    }
  }, []);

  /**
   * Initialize socket connection when user is authenticated
   * Prevents race conditions with ref-based initialization tracking
   */
  useEffect(() => {
    // Guard: Don't initialize if not authenticated or already initializing
    if (!isAuthenticated || !user || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      logger.info(
        "[AuthenticatedLayout] User authenticated, connecting socket",
        {
          userId: user._id,
          email: user.email,
        }
      );

      socketService.onStatusChange(handleSocketStatusChange);
      socketService.connect(user);
      initializeSocketEventHandlers(socketService, store);
    } catch (error) {
      logger.error("[AuthenticatedLayout] Failed to initialize socket", error);
      isInitializingRef.current = false;
    }

    return () => {
      try {
        logger.info("[AuthenticatedLayout] Cleaning up socket");
        socketService.offStatusChange(handleSocketStatusChange);
        cleanupSocketEventHandlers(socketService);
        socketService.disconnect();
        socketService.cleanup();
      } catch (error) {
        logger.error(
          "[AuthenticatedLayout] Error during socket cleanup",
          error
        );
      } finally {
        isInitializingRef.current = false;
      }
    };
  }, [isAuthenticated, user, handleSocketStatusChange]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    logger.warn(
      "[AuthenticatedLayout] User not authenticated, redirecting to login"
    );
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AuthenticatedLayout;
