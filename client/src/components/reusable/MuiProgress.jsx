/**
 * MuiProgress Component - Reusable Progress (Circular or Linear)
 *
 */

import { forwardRef } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const MuiProgress = forwardRef(
  (
    {
      type = "circular", // circular | linear
      value,
      variant = "indeterminate", // determinate | indeterminate | buffer | query
      color = "primary",
      size = 40,
      thickness = 3.6,
      showLabel = false,
      labelProps,
      sx,
      containerSx,
      ...muiProps
    },
    ref
  ) => {
    // Linear Progress with Label
    if (type === "linear" && showLabel && variant === "determinate") {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            ...containerSx,
          }}
        >
          <Box sx={{ width: "100%", mr: 1 }}>
            <LinearProgress
              ref={ref}
              variant={variant}
              value={value}
              color={color}
              sx={sx}
              {...muiProps}
            />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary" {...labelProps}>
              {`${Math.round(value)}%`}
            </Typography>
          </Box>
        </Box>
      );
    }

    if (type === "linear") {
      return (
        <LinearProgress
          ref={ref}
          variant={variant}
          value={value}
          color={color}
          sx={sx}
          {...muiProps}
        />
      );
    }

    // Circular Progress with Label
    if (showLabel && variant === "determinate") {
      return (
        <Box
          sx={{ position: "relative", display: "inline-flex", ...containerSx }}
        >
          <CircularProgress
            ref={ref}
            variant={variant}
            value={value}
            color={color}
            size={size}
            thickness={thickness}
            sx={sx}
            {...muiProps}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="caption"
              component="div"
              color="text.secondary"
              {...labelProps}
            >
              {`${Math.round(value)}%`}
            </Typography>
          </Box>
        </Box>
      );
    }

    // Standard Circular Progress
    return (
      <CircularProgress
        ref={ref}
        variant={variant}
        value={value}
        color={color}
        size={size}
        thickness={thickness}
        sx={sx}
        {...muiProps}
      />
    );
  }
);

MuiProgress.displayName = "MuiProgress";

export default MuiProgress;
