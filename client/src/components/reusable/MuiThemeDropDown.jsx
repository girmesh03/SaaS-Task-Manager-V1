import React, { useState } from "react";
import { useColorScheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import DarkModeIcon from "@mui/icons-material/DarkModeRounded";
import LightModeIcon from "@mui/icons-material/LightModeRounded";

const MuiThemeDropDown = (props) => {
  const { mode, systemMode, setMode } = useColorScheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMode = (targetMode) => () => {
    setMode(targetMode);
    handleClose();
  };

  // If no mode
  if (!mode) {
    return (
      <Box
        data-screenshot="toggle-mode"
        sx={(theme) => ({
          verticalAlign: "bottom",
          display: "inline-flex",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: (theme.vars || theme).shape.borderRadius,
          border: "1px solid",
          borderColor: (theme.vars || theme).palette.divider,
        })}
      />
    );
  }

  // Get the current theme
  const resolvedMode = systemMode || mode;

  // Assign icon based on the theme
  const icon = {
    light: <LightModeIcon />,
    dark: <DarkModeIcon />,
  }[resolvedMode];

  return (
    <React.Fragment>
      <IconButton
        data-screenshot="toggle-mode"
        onClick={handleClick}
        disableRipple
        size="small"
        aria-controls={open ? "theme-drop-down-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        sx={{
          border: "none",
          bgcolor: (theme) => (open ? theme.palette.action.selected : "transparent"),
          transition: "all 0.2s",
          p: 1,
          "&:hover": {
            bgcolor: (theme) => theme.palette.action.hover,
            transform: "rotate(15deg) scale(1.1)",
          },
        }}
        {...props}
      >
        {resolvedMode === "dark" ? (
          <DarkModeIcon sx={{ color: "primary.main" }} />
        ) : (
          <LightModeIcon sx={{ color: "warning.main" }} />
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id="theme-drop-down-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            variant: "outlined",
            elevation: 8,
            sx: {
              mt: 1.5,
              minWidth: 160,
              borderRadius: 2,
              p: 0.5,
              "& .MuiMenuItem-root": {
                px: 2,
                py: 1,
                gap: 1.5,
                fontSize: "0.875rem",
                borderRadius: 1,
                mb: 0.5,
                transition: "all 0.2s",
                "&:last-child": { mb: 0 },
                "&:hover": {
                  bgcolor: "action.hover",
                  color: "primary.main",
                },
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                },
              },
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem selected={mode === "system"} onClick={handleMode("system")}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
            <Box sx={{ fontSize: "1.1rem", display: "flex", opacity: 0.8 }}>🌓</Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>System</Typography>
          </Box>
        </MenuItem>
        <MenuItem selected={mode === "light"} onClick={handleMode("light")}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
            <LightModeIcon fontSize="small" sx={{ opacity: 0.8 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>Light</Typography>
          </Box>
        </MenuItem>
        <MenuItem selected={mode === "dark"} onClick={handleMode("dark")}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
            <DarkModeIcon fontSize="small" sx={{ opacity: 0.8 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>Dark</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
};

export default MuiThemeDropDown;
