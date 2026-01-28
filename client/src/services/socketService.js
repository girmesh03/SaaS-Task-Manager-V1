/**
 * Socket.IO Client Service
 * Centralized Socket.IO service for managing WebSocket connections
 * Connects to Socket.IO server with JWT authentication
 * Joins organization rooms
 * Implements exponential backoff for reconnections
 * Provides connection status indicator
 *
 * Requirements: 18.1, 18.2, 18.6, 18.7
 */

import { io } from "socket.io-client";

// Socket.IO server URL from environment
// Remove /api suffix since Socket.IO is at root, not under /api
const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:4000"
).replace(/\/api$/, "");

// Reconnection configuration with exponential backoff
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000, // Start with 1 second
  reconnectionDelayMax: 5000, // Max 5 seconds
  timeout: 20000,
  transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
  upgrade: true, // Allow transport upgrade
  rememberUpgrade: true, // Remember successful upgrade
};

/**
 * Socket.IO Service Class
 * Singleton pattern for managing Socket.IO connection
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionError = null;
    this.listeners = new Map(); // Store event listeners for cleanup
    this.statusCallbacks = []; // Callbacks for connection status changes
  }

  /**
   * Initialize Socket.IO connection
   * @param {Object} user - User object with authentication data
   * @returns {Promise<void>}
   */
  async connect(user) {
    // Don't connect if already connected or connecting
    if (this.socket?.connected) {
      console.log("[Socket] Already connected, socket ID:", this.socket.id);
      return;
    }

    if (this.isConnecting) {
      console.log("[Socket] Connection already in progress");
      return;
    }

    // Don't connect if no user (not authenticated)
    if (!user) {
      console.error("[Socket] Cannot connect: No user provided");
      this.connectionError = "No user provided";
      this.notifyStatusChange("error", this.connectionError);
      return;
    }

    try {
      this.isConnecting = true;
      this.connectionError = null;
      this.notifyStatusChange("connecting");

      console.log("[Socket] Connecting to server:", SOCKET_URL);
      console.log(
        "[Socket] Using httpOnly cookies for authentication (withCredentials: true)"
      );

      // Create Socket.IO client instance
      // Token is sent automatically via httpOnly cookies with withCredentials: true
      // Backend extracts token from socket.handshake.headers.cookie
      this.socket = io(SOCKET_URL, {
        ...RECONNECTION_CONFIG,
        withCredentials: true, // Send httpOnly cookies with requests
        path: "/socket.io", // Explicitly specify Socket.IO path
      });

      // Set up event handlers
      this.setupEventHandlers();

      console.log("[Socket] Client initialized, waiting for authentication");
    } catch (error) {
      console.error("[Socket] Failed to initialize client:", error);
      this.isConnecting = false;
      this.connectionError = error.message;
      this.notifyStatusChange("error", error.message);
    }
  }

  /**
   * Set up Socket.IO event handlers
   * @private
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection successful
    this.socket.on("connect", () => {
      console.log("[Socket] Connected:", this.socket.id);
      this.isConnected = true;
      this.isConnecting = false;
      this.connectionError = null;
      this.notifyStatusChange("connected");
    });

    // Disconnection
    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      this.isConnected = false;
      this.isConnecting = false;
      this.notifyStatusChange("disconnected", reason);
    });

    // Connection error
    this.socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionError = error.message;
      this.notifyStatusChange("error", error.message);
    });

    // Generic error
    this.socket.on("error", (error) => {
      console.error("[Socket] Error:", error);
      this.connectionError = error.message || "Socket error";
      this.notifyStatusChange("error", this.connectionError);
    });

    // Reconnection successful
    this.socket.on("reconnect", (attemptNumber) => {
      console.log("[Socket] Reconnected after", attemptNumber, "attempts");
      this.isConnected = true;
      this.isConnecting = false;
      this.connectionError = null;
      this.notifyStatusChange("reconnected", attemptNumber);
    });

    // Reconnection attempt (exponential backoff)
    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("[Socket] Reconnection attempt:", attemptNumber);
      this.isConnecting = true;
      this.notifyStatusChange("reconnecting", attemptNumber);
    });

    // Reconnection error
    this.socket.on("reconnect_error", (error) => {
      console.error("[Socket] Reconnection error:", error.message);
      this.connectionError = error.message;
      this.notifyStatusChange("reconnect_error", error.message);
    });

    // Reconnection failed (all attempts exhausted)
    this.socket.on("reconnect_failed", () => {
      console.error("[Socket] Reconnection failed");
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionError = "Reconnection failed";
      this.notifyStatusChange("reconnect_failed");
    });

    // Heartbeat pong response
    this.socket.on("pong", (data) => {
      console.log("[Socket] Pong received:", data);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      console.log("[Socket] Disconnecting");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.notifyStatusChange("disconnected");
    }
  }

  /**
   * Emit event to server
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("[Socket] Not connected, cannot emit event:", event);
    }
  }

  /**
   * Subscribe to event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);

      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(handler);
    }
  }

  /**
   * Unsubscribe from event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler (optional, removes all if not provided)
   */
  off(event, handler) {
    if (this.socket) {
      if (handler) {
        this.socket.off(event, handler);

        // Remove from listeners
        const listeners = this.listeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(handler);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      } else {
        // Remove all listeners for event
        this.socket.off(event);
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Send heartbeat ping
   */
  ping() {
    if (this.socket?.connected) {
      this.socket.emit("ping");
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      error: this.connectionError,
      socketId: this.socket?.id || null,
    };
  }

  /**
   * Register callback for connection status changes
   * @param {Function} callback - Callback function (status, data) => void
   */
  onStatusChange(callback) {
    if (typeof callback === "function") {
      this.statusCallbacks.push(callback);
    }
  }

  /**
   * Unregister callback for connection status changes
   * @param {Function} callback - Callback function to remove
   */
  offStatusChange(callback) {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all status callbacks of status change
   * @private
   * @param {string} status - Connection status
   * @param {*} data - Additional data
   */
  notifyStatusChange(status, data) {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status, data);
      } catch (error) {
        console.error("[Socket] Error in status callback:", error);
      }
    });
  }

  /**
   * Clean up all event listeners
   */
  cleanup() {
    // Remove all event listeners
    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.off(event, handler);
      });
    });
    this.listeners.clear();

    // Clear status callbacks
    this.statusCallbacks = [];
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
