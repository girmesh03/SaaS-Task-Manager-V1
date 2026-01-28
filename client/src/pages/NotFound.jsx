/**
 * NotFound Page Component
 * 404 error page for invalid routes
 * Displays error message with navigation options
 * Includes minimal header since it's outside AuthLayout
 *
 * Requirements: 33.7, 33.8, 33.9, 33.10, 33.11
 */

import { useNavigate, useLocation } from "react-router";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import notFoundSvg from "../assets/notFound_404.svg";
import { MuiThemeDropDown } from "../components/reusable";
import { useAuth } from "../hooks";

/**
 * NotFound Page Component
 * @component
 */
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Generate suggested links based on URL similarity
  const getSuggestedLinks = () => {
    const path = location.pathname.toLowerCase();
    const suggestions = [];

    // Common route suggestions based on path similarity
    if (path.includes("task")) {
      suggestions.push({ label: "Tasks", path: "/dashboard/tasks" });
    }
    if (path.includes("user")) {
      suggestions.push({ label: "Users", path: "/dashboard/users" });
    }
    if (path.includes("department")) {
      suggestions.push({
        label: "Departments",
        path: "/dashboard/departments",
      });
    }
    if (path.includes("material")) {
      suggestions.push({ label: "Materials", path: "/dashboard/materials" });
    }
    if (path.includes("vendor")) {
      suggestions.push({ label: "Vendors", path: "/dashboard/vendors" });
    }
    if (path.includes("dashboard")) {
      suggestions.push({ label: "Dashboard", path: "/dashboard" });
    }

    // Default suggestions if no matches
    if (suggestions.length === 0 && isAuthenticated) {
      suggestions.push(
        { label: "Dashboard", path: "/dashboard" },
        { label: "Tasks", path: "/dashboard/tasks" },
        { label: "Users", path: "/dashboard/users" }
      );
    } else if (suggestions.length === 0) {
      suggestions.push(
        { label: "Home", path: "/" },
        { label: "Login", path: "/login" },
        { label: "Register", path: "/register" }
      );
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  };

  const suggestedLinks = getSuggestedLinks();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Minimal Header */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
          [theme.breakpoints.up("xl")]: {
            maxWidth: theme.breakpoints.values.xl,
            left: "50%",
            transform: "translateX(-50%)",
          },
        })}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 2, sm: 3 },
            gap: { xs: 1, sm: 2 },
          }}
        >
          {/* Logo */}
          <Box
            component="button"
            role="button"
            type="button"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              border: "none",
              background: "transparent",
              p: 0,
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
                borderRadius: 1,
              },
            }}
            onClick={() => navigate("/")}
            tabIndex={0}
            aria-label="TaskManager - Go to home page"
          >
            <TaskAltIcon
              sx={{
                fontSize: { xs: 32, sm: 40 },
                color: "primary.main",
              }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                color: "primary.main",
                display: { xs: "none", sm: "block" },
              }}
            >
              TaskManager
            </Typography>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Theme Toggle */}
          <MuiThemeDropDown />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          pt: { xs: 9, sm: 10 }, // Toolbar height offset
          overflow: "auto",
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            maxWidth: 600,
            width: "100%",
            textAlign: "center",
          }}
        >
          {/* 404 Illustration */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 300,
              mx: "auto",
              mb: 3,
            }}
          >
            <img
              src={notFoundSvg}
              alt="Page not found"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 1.5,
              fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
            }}
          >
            Page Not Found
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              mb: 3,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            The page you're looking for doesn't exist or has been moved.
          </Typography>

          {/* Suggested Links */}
          {suggestedLinks.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 1,
                  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                }}
              >
                Did you mean:
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ gap: 1 }}
              >
                {suggestedLinks.map((link, index) => (
                  <Link
                    key={index}
                    onClick={() => navigate(link.path)}
                    sx={{
                      color: "primary.main",
                      textDecoration: "none",
                      cursor: "pointer",
                      fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                      fontWeight: 600,
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Box>
          )}

          {/* Action Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            sx={{ mt: 4 }}
          >
            <Button
              variant="outlined"
              size="medium"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{
                px: 3,
                py: 1,
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                fontWeight: 600,
              }}
            >
              Go Back
            </Button>
            {isAuthenticated ? (
              <Button
                variant="contained"
                size="medium"
                startIcon={<DashboardIcon />}
                onClick={() => navigate("/dashboard", { replace: true })}
                sx={{
                  px: 3,
                  py: 1,
                  fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                  fontWeight: 600,
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="contained"
                size="medium"
                startIcon={<HomeIcon />}
                onClick={() => navigate("/", { replace: true })}
                sx={{
                  px: 3,
                  py: 1,
                  fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                  fontWeight: 600,
                }}
              >
                Go to Home
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default NotFound;
