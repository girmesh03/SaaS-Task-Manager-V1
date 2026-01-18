import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GobackIcon from "@mui/icons-material/FirstPageOutlined";
import HomeIcon from "@mui/icons-material/HomeOutlined";

import notFoundSvg from "../assets/notFound_404.svg";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        overflow: "auto",
      }}
    >
      <Box
        sx={{
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Typography variant="h3" sx={{ mb: 2 }}>
          Sorry, page not found!
        </Typography>

        <Typography sx={{ color: "text.secondary", mb: 4 }}>
          We couldn’t find the page you’re looking for. Perhaps you’ve mistyped
          the URL? Be sure to check your spelling.
        </Typography>

        <Box sx={{ width: "100%", maxWidth: 480, mx: "auto", mb: 4 }}>
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

        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
        >
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={<GobackIcon />}
            onClick={() => navigate(-1, { replace: true })}
          >
            Go Back
          </Button>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={<HomeIcon />}
            onClick={() => navigate("/", { replace: true })}
          >
            Home
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default NotFound;
