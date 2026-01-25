/**
 * MuiNotificationBell Component - Notification Bell with Real-time Updates
 *
 * Enhanced notification bell component that displays unread notification count
 * and provides a dropdown menu for viewing notifications. Integrates with
 * Socket.IO for real-time notification updates.
 *
 * Features:
 * - Real-time notification updates via Socket.IO
 * - Unread count badge
 * - Dropdown menu with notification list
 * - Mark as read functionality
 * - Navigate to notification details
 * - Theme-based styling
 * - Accessibility support
 *
 * @example
 * <MuiNotificationBell />
 */

import { useState, useCallback, useEffect, memo } from "react";
import { useNavigate } from "react-router";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import MuiBadge from "./MuiBadge";
import MuiTooltip from "./MuiTooltip";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useBatchMarkAsReadMutation,
} from "../../redux/features/notificationSlice";
import { SOCKET_EVENTS } from "../../utils/constants";
import socketService from "../../services/socketService";

const MuiNotificationBell = memo(() => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Fetch notifications
  const { data: notificationsData, refetch } = useGetNotificationsQuery({
    page: 1,
    limit: 10,
    isRead: false,
  });

  const [markAsRead] = useMarkAsReadMutation();
  const [batchMarkAsRead] = useBatchMarkAsReadMutation();

  // Get unread count
  const unreadCount = notificationsData?.totalDocs || 0;
  const notifications = notificationsData?.docs || [];

  // Socket.IO real-time updates
  const handleNotificationCreated = useCallback(() => {
    refetch();
  }, [refetch]);

  // Subscribe to socket events
  useEffect(() => {
    socketService.on(
      SOCKET_EVENTS.NOTIFICATION_CREATED,
      handleNotificationCreated
    );

    // Cleanup on unmount
    return () => {
      socketService.off(
        SOCKET_EVENTS.NOTIFICATION_CREATED,
        handleNotificationCreated
      );
    };
  }, [handleNotificationCreated]);

  // Handle menu open
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      await markAsRead(notification._id).unwrap();

      // Navigate to related entity
      if (notification.entity && notification.entityModel) {
        const entityType = notification.entityModel.toLowerCase();
        navigate(`/${entityType}s/${notification.entity}`);
      }

      handleClose();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const notificationIds = notifications.map((n) => n._id);
      await batchMarkAsRead({ notificationIds }).unwrap();
      handleClose();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <>
      <MuiTooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          size="large"
          aria-label={`${unreadCount} new notifications`}
          aria-controls={open ? "notification-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          color="inherit"
        >
          <MuiBadge badgeContent={unreadCount} color="error" max={99}>
            {unreadCount > 0 ? (
              <NotificationsIcon />
            ) : (
              <NotificationsNoneIcon />
            )}
          </MuiBadge>
        </IconButton>
      </MuiTooltip>

      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              mt: 1.5,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight="medium">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <NotificationsNoneIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                py: 1.5,
                px: 2,
                whiteSpace: "normal",
                alignItems: "flex-start",
                bgcolor: notification.isRead ? "transparent" : "action.hover",
              }}
            >
              <Box sx={{ width: "100%" }}>
                <Typography
                  variant="subtitle2"
                  fontWeight="medium"
                  gutterBottom
                >
                  {notification.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {new Date(notification.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: "center" }}>
              <Button
                size="small"
                onClick={() => {
                  navigate("/notifications");
                  handleClose();
                }}
              >
                View all notifications
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
});

MuiNotificationBell.displayName = "MuiNotificationBell";

export default MuiNotificationBell;
