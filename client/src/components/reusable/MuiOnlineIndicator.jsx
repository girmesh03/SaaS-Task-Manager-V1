/**
 * MuiOnlineIndicator Component - User Online Status Indicator
 *
 * Enhanced online status indicator that displays user's online/offline status.
 * Integrates with Socket.IO for real-time status updates.
 *
 * Features:
 * - Real-time status updates via Socket.IO
 * - Online/offline indicator
 * - Theme-based styling
 * - Accessibility support
 * - Customizable size and position
 *
 * @example
 * // Basic usage
 * <MuiOnlineIndicator userId={user._id} />
 *
 * @example
 * // With custom size
 * <MuiOnlineIndicator userId={user._id} size="large" />
 *
 * @example
 * // As badge on avatar
 * <Badge
 *   overlap="circular"
 *   anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
 *   badgeContent={<MuiOnlineIndicator userId={user._id} size="small" />}
 * >
 *   <Avatar src={user.profilePicture?.url} />
 * </Badge>
 */

import { useState, useCallback, useMemo, useEffect, memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { SOCKET_EVENTS } from "../../utils/constants";
import socketService from "../../services/socketService";

// Size mapping constant (extracted to module level)
const SIZE_MAP = {
  small: 8,
  medium: 12,
  large: 16,
};

/**
 * Get indicator box styles
 * Extracted to prevent duplication and improve maintainability
 */
const getIndicatorStyles = (indicatorSize, isOnline, theme, sx = {}) => ({
  width: indicatorSize,
  height: indicatorSize,
  borderRadius: "50%",
  bgcolor: isOnline ? "success.main" : "grey.400",
  border: 2,
  borderColor: "background.paper",
  boxShadow: isOnline ? `0 0 0 2px ${theme.palette.success.light}` : "none",
  transition: theme.transitions.create(["background-color", "box-shadow"], {
    duration: theme.transitions.duration.short,
  }),
  ...sx,
});

const MuiOnlineIndicator = memo(
  ({
    userId,
    size = "medium", // "small" | "medium" | "large"
    showLabel = false,
    sx,
  }) => {
    const theme = useTheme();
    // Initialize state based on assumption (no setState in useEffect)
    const [isOnline, setIsOnline] = useState(false);

    // Memoize indicator size to prevent recalculation on every render
    const indicatorSize = useMemo(
      () => SIZE_MAP[size] || SIZE_MAP.medium,
      [size]
    );

    // Socket.IO real-time status updates
    const handleUserOnline = useCallback(
      (data) => {
        if (data.userId === userId) {
          setIsOnline(true);
        }
      },
      [userId]
    );

    const handleUserOffline = useCallback(
      (data) => {
        if (data.userId === userId) {
          setIsOnline(false);
        }
      },
      [userId]
    );

    // Subscribe to socket events
    useEffect(() => {
      socketService.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
      socketService.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);

      // Cleanup on unmount
      return () => {
        socketService.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
        socketService.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);
      };
    }, [handleUserOnline, handleUserOffline]);

    // Note: Initial status is set to false by default
    // TODO: Fetch initial online status from API when available

    // Memoize indicator styles to prevent recreation on every render
    const indicatorStyles = useMemo(
      () => getIndicatorStyles(indicatorSize, isOnline, theme, sx),
      [indicatorSize, isOnline, theme, sx]
    );

    // Render indicator box (reusable component)
    const IndicatorBox = (
      <Box
        sx={indicatorStyles}
        role="status"
        aria-label={isOnline ? "Online" : "Offline"}
      />
    );

    if (showLabel) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {IndicatorBox}
          <Box
            component="span"
            sx={{
              fontSize: theme.typography.caption.fontSize,
              color: isOnline ? "success.main" : "text.disabled",
              fontWeight: theme.typography.fontWeightMedium,
            }}
          >
            {isOnline ? "Online" : "Offline"}
          </Box>
        </Box>
      );
    }

    return IndicatorBox;
  }
);

MuiOnlineIndicator.displayName = "MuiOnlineIndicator";

MuiOnlineIndicator.propTypes = {
  userId: PropTypes.string.isRequired,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  showLabel: PropTypes.bool,
  sx: PropTypes.object,
};

export default MuiOnlineIndicator;
