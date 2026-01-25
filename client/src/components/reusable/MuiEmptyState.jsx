/**
 * MuiEmptyState Component - Reusable Empty State Display
 *
 * Enhanced empty state component for displaying when no data is available.
 * Provides a clean, user-friendly message with optional action button.
 *
 * Features:
 * - Customizable icon
 * - Primary and secondary messages
 * - Optional action button
 * - Theme-based styling
 * - Accessibility support
 * - Responsive design
 *
 * @example
 * <MuiEmptyState
 *   message="No tasks found"
 *   secondaryMessage="Create your first task to get started"
 *   icon={<TaskIcon />}
 *   actionLabel="Create Task"
 *   onAction={handleCreateTask}
 * />
 */

import { memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InboxIcon from "@mui/icons-material/Inbox";

const MuiEmptyState = ({
  message = "No data available",
  secondaryMessage,
  icon: Icon = InboxIcon,
  actionLabel,
  onAction,
  sx,
}) => {
  return (
    <Box
      role="status"
      aria-label={message}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        minHeight: 300,
        textAlign: "center",
        ...sx,
      }}
    >
      <Box
        sx={{
          mb: 2,
          color: "text.disabled",
          "& > svg": {
            fontSize: 64,
          },
        }}
      >
        {typeof Icon === "function" ? <Icon /> : Icon}
      </Box>

      <Typography
        variant="h6"
        color="text.secondary"
        gutterBottom
        sx={{
          fontWeight: (theme) => theme.typography.fontWeightMedium,
        }}
      >
        {message}
      </Typography>

      {secondaryMessage && (
        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ mb: 3, maxWidth: 400 }}
        >
          {secondaryMessage}
        </Typography>
      )}

      {actionLabel && onAction && (
        <Button
          variant="contained"
          color="primary"
          onClick={onAction}
          size="medium"
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

MuiEmptyState.displayName = "MuiEmptyState";

MuiEmptyState.propTypes = {
  message: PropTypes.string,
  secondaryMessage: PropTypes.string,
  icon: PropTypes.oneOfType([PropTypes.node, PropTypes.elementType]),
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  sx: PropTypes.object,
};

export default memo(MuiEmptyState);
