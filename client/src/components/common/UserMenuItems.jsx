/**
 * UserMenuItems Component
 * Reusable user menu dropdown items
 * Used in both AuthLayout and Header components
 *
 * Features:
 * - User info display (name, email, role)
 * - Conditional menu items (Profile, Settings, Dashboard)
 * - Logout action
 * - Proper dividers and styling
 */

import { memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";

/**
 * UserMenuItems Component
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - User object
 * @param {Function} props.onProfile - Profile click handler (optional)
 * @param {Function} props.onSettings - Settings click handler (optional)
 * @param {Function} props.onDashboard - Dashboard click handler (optional)
 * @param {Function} props.onLogout - Logout click handler (required)
 * @param {boolean} props.showProfile - Show profile menu item
 * @param {boolean} props.showSettings - Show settings menu item
 * @param {boolean} props.showDashboard - Show dashboard menu item
 */
const UserMenuItems = memo(
  ({
    user,
    onProfile,
    onSettings,
    onDashboard,
    onLogout,
    showProfile = false,
    showSettings = false,
    showDashboard = false,
  }) => {
    const hasMenuItems = showProfile || showSettings || showDashboard;

    return (
      <>
        {/* User Info */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="medium">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {user?.role}
          </Typography>
        </Box>

        {hasMenuItems && <Divider />}

        {/* Conditional Menu Items */}
        {showProfile && onProfile && (
          <MenuItem onClick={onProfile}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
        )}

        {showSettings && onSettings && (
          <MenuItem onClick={onSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
        )}

        {showDashboard && onDashboard && (
          <MenuItem onClick={onDashboard}>
            <ListItemIcon>
              <DashboardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Go to Dashboard</ListItemText>
          </MenuItem>
        )}

        {hasMenuItems && <Divider />}

        {/* Logout */}
        <MenuItem onClick={onLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>
            <Typography color="error">Logout</Typography>
          </ListItemText>
        </MenuItem>
      </>
    );
  }
);

UserMenuItems.displayName = "UserMenuItems";

UserMenuItems.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
  }),
  onProfile: PropTypes.func,
  onSettings: PropTypes.func,
  onDashboard: PropTypes.func,
  onLogout: PropTypes.func.isRequired,
  showProfile: PropTypes.bool,
  showSettings: PropTypes.bool,
  showDashboard: PropTypes.bool,
};

export default UserMenuItems;
