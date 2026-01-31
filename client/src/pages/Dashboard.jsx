/**
 * Dashboard Page
 * Main dashboard overview page
 * Placeholder for future implementation
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const Dashboard = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary", mt: 1 }}>
        Dashboard content coming soon
      </Typography>
    </Box>
  );
};

export default Dashboard;
