/**
 * MuiLoading Component - Reusable Loading Spinner with Skeleton States
 *
 * Enhanced loading component with multiple display modes including skeleton states.
 * Supports full-screen loading, inline loading, and skeleton placeholders.
 *
 * Features:
 * - Circular progress spinner
 * - Skeleton loading states (text, rectangular, circular)
 * - Full-screen overlay mode
 * - Inline loading mode
 * - Theme-based styling
 * - Customizable size and color
 * - Accessibility support
 *
 * @example
 * // Basic loading spinner
 * <MuiLoading message="Loading data..." />
 *
 * @example
 * // Full-screen loading
 * <MuiLoading fullScreen message="Please wait..." />
 *
 * @example
 * // Skeleton loading for text
 * <MuiLoading variant="skeleton" skeletonType="text" count={3} />
 *
 * @example
 * // Skeleton loading for cards
 * <MuiLoading variant="skeleton" skeletonType="rectangular" height={200} count={2} />
 */

import { memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

const MuiLoading = ({
  message = "Loading",
  size = 40,
  color = "primary",
  fullScreen = false,
  variant = "spinner", // "spinner" | "skeleton"
  skeletonType = "text", // "text" | "rectangular" | "circular"
  skeletonWidth, // Width for skeleton
  skeletonHeight, // Height for skeleton
  count = 1, // Number of skeleton items
  spacing = 1, // Spacing between skeleton items
  ...muiProps
}) => {
  // Render skeleton loading
  if (variant === "skeleton") {
    const skeletonItems = Array.from({ length: count }, (_, index) => (
      <Skeleton
        key={index}
        variant={skeletonType}
        width={skeletonWidth}
        height={skeletonHeight}
        animation="wave"
        sx={{
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "grey.800" : "grey.300",
        }}
      />
    ));

    return (
      <Stack spacing={spacing} sx={{ width: "100%", ...muiProps.sx }}>
        {skeletonItems}
      </Stack>
    );
  }

  // Render full-screen spinner
  if (fullScreen) {
    return (
      <Box
        role="progressbar"
        aria-label={message}
        aria-busy="true"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "background.default",
          zIndex: (theme) => theme.zIndex.modal + 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.95,
        }}
      >
        <CircularProgress
          size={size}
          color={color}
          disableShrink
          {...muiProps}
        />
        {message && (
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              color: "text.secondary",
              fontWeight: (theme) => theme.typography.fontWeightMedium,
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Render inline spinner
  return (
    <Box
      role="progressbar"
      aria-label={message}
      aria-busy="true"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        width: "100%",
        height: "100%",
        minHeight: 100,
      }}
    >
      <CircularProgress size={size} color={color} {...muiProps} />
      {message && (
        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

MuiLoading.displayName = "MuiLoading";

MuiLoading.propTypes = {
  message: PropTypes.string,
  size: PropTypes.number,
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "error",
    "info",
    "success",
    "warning",
    "inherit",
  ]),
  fullScreen: PropTypes.bool,
  variant: PropTypes.oneOf(["spinner", "skeleton"]),
  skeletonType: PropTypes.oneOf(["text", "rectangular", "circular"]),
  skeletonWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  skeletonHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  count: PropTypes.number,
  spacing: PropTypes.number,
};

export default memo(MuiLoading);
