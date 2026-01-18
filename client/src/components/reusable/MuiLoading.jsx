/**
 * MuiLoading Component - Reusable Loading Spinner
 *
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

const MuiLoading = ({
  message = "Loading",
  size = 40,
  color = "primary",
  fullScreen = false,
  ...muiProps
}) => {
  // Destructure custom props to avoid passing them to CircularProgress DOM element
  const { ...standardMuiProps } = muiProps;
  if (fullScreen) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "background.default",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.8,
        }}
      >
        <CircularProgress
          size={size}
          color={color}
          disableShrink
          {...standardMuiProps}
        />
        {message && (
          <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
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
      <CircularProgress size={size} color={color} {...standardMuiProps} />
      {message && (
        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default MuiLoading;
