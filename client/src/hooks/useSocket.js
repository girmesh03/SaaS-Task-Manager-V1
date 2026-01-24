/**
 * useSocket Hook - Socket.IO Hook
 *
 * Custom hook for Socket.IO connection and event handling.
 * Connects to Socket.IO server with JWT authentication.
 * Subscribes to events and unsubscribes on unmount.
 * Implements exponential backoff for reconnections.
 *
 * Requirements: 18.8, 18.10, 24.8
 */

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { selectCurrentUser } from "../redux/features/authSlice";

// Socket.IO server URL from environment
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Reconnection configuration
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ["websocket", "polling"],
};

/**
 * useSocket hook
 *
 * @param {Object} options - Socket options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {Function} options.onConnect - Callback on connection
 * @param {Function} options.onDisconnect - Callback on disconnection
 * @param {Function} options.onError - Callback on error
 * @returns {Object} Socket state and functions
 * @returns {Object|null} return.socket - Socket.IO client instance
 * @returns {boolean} return.isConnected - True if socket is connected
 * @returns {boolean} return.isConnecting - True if socket is connecting
 * @returns {string|null} return.error - Error message if connection failed
 * @returns {Function} return.connect - Connect to Socket.IO server
 * @returns {Function} return.disconnect - Disconnect from Socket.IO server
 * @returns {Function} return.emit - Emit event to server
 * @returns {Function} return.on - Subscribe to event
 * @returns {Function} return.off - Unsubscribe from event
 */
const useSocket = (options = {}) => {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;

  // Get current user from Redux (for JWT token)
  const user = useSelector(selectCurrentUser);

  // Socket instance ref
  const socketRef = useRef(null);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Event listeners ref (for cleanup)
  const listenersRef = useRef(new Map());

  /**
   * Connect to Socket.IO server
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (socketRef.current?.connected || isConnecting) {
      return;
    }

    // Don't connect if no user (not authenticated)
    if (!user) {
      setError("User not authenticated");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Create Socket.IO client instance
      const socket = io(SOCKET_URL, {
        ...RECONNECTION_CONFIG,
        auth: {
          token: user.token, // JWT token from user object
        },
      });

      // Connection event handlers
      socket.on("connect", () => {
        console.log("Socket.IO connected:", socket.id);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);

        // Call onConnect callback
        if (onConnect) {
          onConnect(socket);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected:", reason);
        setIsConnected(false);
        setIsConnecting(false);

        // Call onDisconnect callback
        if (onDisconnect) {
          onDisconnect(reason);
        }
      });

      socket.on("connect_error", (err) => {
        console.error("Socket.IO connection error:", err.message);
        setIsConnected(false);
        setIsConnecting(false);
        setError(err.message);

        // Call onError callback
        if (onError) {
          onError(err);
        }
      });

      socket.on("error", (err) => {
        console.error("Socket.IO error:", err);
        setError(err.message || "Socket error");

        // Call onError callback
        if (onError) {
          onError(err);
        }
      });

      // Reconnection event handlers
      socket.on("reconnect", (attemptNumber) => {
        console.log("Socket.IO reconnected after", attemptNumber, "attempts");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      socket.on("reconnect_attempt", (attemptNumber) => {
        console.log("Socket.IO reconnection attempt:", attemptNumber);
        setIsConnecting(true);
      });

      socket.on("reconnect_error", (err) => {
        console.error("Socket.IO reconnection error:", err.message);
        setError(err.message);
      });

      socket.on("reconnect_failed", () => {
        console.error("Socket.IO reconnection failed");
        setIsConnected(false);
        setIsConnecting(false);
        setError("Reconnection failed");
      });

      // Heartbeat (ping-pong)
      socket.on("pong", (data) => {
        console.log("Socket.IO pong received:", data);
      });

      // Store socket instance
      socketRef.current = socket;
    } catch (err) {
      console.error("Failed to create Socket.IO client:", err);
      setIsConnecting(false);
      setError(err.message);

      if (onError) {
        onError(err);
      }
    }
  }, [user, isConnecting, onConnect, onDisconnect, onError]);

  /**
   * Disconnect from Socket.IO server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("Disconnecting Socket.IO");
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  /**
   * Emit event to server
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("Socket.IO not connected, cannot emit event:", event);
    }
  }, []);

  /**
   * Subscribe to event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);

      // Store listener for cleanup
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, []);
      }
      listenersRef.current.get(event).push(handler);
    }
  }, []);

  /**
   * Unsubscribe from event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler (optional, removes all if not provided)
   */
  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);

        // Remove from listeners ref
        const listeners = listenersRef.current.get(event);
        if (listeners) {
          const index = listeners.indexOf(handler);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      } else {
        // Remove all listeners for event
        socketRef.current.off(event);
        listenersRef.current.delete(event);
      }
    }
  }, []);

  /**
   * Send heartbeat ping
   */
  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("ping");
    }
  }, []);

  // Auto-connect on mount if enabled and user is authenticated
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      // Capture current ref values for cleanup
      const currentListeners = listenersRef.current;
      const currentSocket = socketRef.current;

      // Remove all event listeners
      currentListeners.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          currentSocket?.off(event, handler);
        });
      });
      currentListeners.clear();

      // Disconnect socket directly without calling disconnect()
      if (currentSocket) {
        console.log("Disconnecting Socket.IO on unmount");
        currentSocket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, user]);

  // Reconnect when user changes (e.g., token refresh)
  useEffect(() => {
    if (user && socketRef.current && !socketRef.current.connected) {
      connect();
    }
  }, [user, connect]);

  // Memoize return object to avoid unnecessary re-renders
  // Note: We return the ref itself, not its current value, to avoid accessing ref during render
  const socketApi = useMemo(
    () => ({
      get socket() {
        return socketRef.current;
      },
      isConnected,
      isConnecting,
      error,
      connect,
      disconnect,
      emit,
      on,
      off,
      ping,
    }),
    [isConnected, isConnecting, error, connect, disconnect, emit, on, off, ping]
  );

  return socketApi;
};

export default useSocket;
