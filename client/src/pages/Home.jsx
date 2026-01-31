/**
 * Home Page Component
 * Landing page for all users (authenticated and unauthenticated)
 * Displays features, pricing, and call-to-action
 * Wrapped by AuthLayout which provides the header
 * Shows "Go to Dashboard" for authenticated users
 *
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6
 */

import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import GroupsIcon from "@mui/icons-material/Groups";
import SecurityIcon from "@mui/icons-material/Security";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import BusinessIcon from "@mui/icons-material/Business";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import GitHubIcon from "@mui/icons-material/GitHub";
import TwitterIcon from "@mui/icons-material/Twitter";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { useAuth } from "../hooks";

/**
 * Home Page Component
 * @component
 */
const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Features data
  const features = [
    {
      icon: <BusinessIcon sx={{ fontSize: 50 }} />,
      title: "Multi-Tenant Architecture",
      description:
        "Secure organization-based isolation with platform and customer organization types for enterprise-grade multi-tenancy.",
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 50 }} />,
      title: "Real-Time Collaboration",
      description:
        "Collaborate with your team in real-time with instant updates via WebSocket technology for seamless communication.",
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 50 }} />,
      title: "Role-Based Access Control",
      description:
        "Dynamic authorization matrix with granular permissions for SuperAdmin, Admin, Manager, and User roles.",
    },
    {
      icon: <DashboardIcon sx={{ fontSize: 50 }} />,
      title: "Task Management",
      description:
        "Manage ProjectTasks, RoutineTasks, and AssignedTasks with status tracking, priorities, and assignee management.",
    },
    {
      icon: <InventoryIcon sx={{ fontSize: 50 }} />,
      title: "Material Tracking",
      description:
        "Track materials used to complete tasks with quantity management and categorization for resource visibility.",
    },
    {
      icon: <TaskAltIcon sx={{ fontSize: 50 }} />,
      title: "Vendor Management",
      description:
        "Manage external vendors for outsourced ProjectTasks with contact management and performance tracking.",
    },
  ];

  // Pricing plans
  const pricingPlans = [
    {
      name: "Starter",
      price: "$9",
      period: "/month",
      features: [
        "Up to 10 users",
        "Basic task management",
        "Email support",
        "5GB storage",
        "Mobile app access",
      ],
      highlighted: false,
    },
    {
      name: "Professional",
      price: "$29",
      period: "/month",
      features: [
        "Up to 50 users",
        "Advanced task management",
        "Priority support",
        "50GB storage",
        "Real-time collaboration",
        "Custom workflows",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: [
        "Unlimited users",
        "Full feature access",
        "24/7 dedicated support",
        "Unlimited storage",
        "Advanced security",
        "Custom integrations",
        "SLA guarantee",
      ],
      highlighted: false,
    },
  ];

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          py: { xs: 6, sm: 8, md: 10 },
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: "center",
              color: "primary.contrastText",
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              }}
            >
              Manage Tasks Efficiently
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mb: 4,
                opacity: 0.9,
                fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
              }}
            >
              The all-in-one task management solution for teams
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              sx={{ mb: 4 }}
            >
              {isAuthenticated ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<DashboardIcon />}
                  onClick={() => navigate("/dashboard")}
                  sx={{
                    bgcolor: "background.paper",
                    color: "primary.main",
                    px: 4,
                    py: 1.5,
                    fontSize: "1rem",
                    fontWeight: 600,
                    "&:hover": {
                      bgcolor: "grey.100",
                    },
                  }}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate("/register")}
                    sx={{
                      bgcolor: "background.paper",
                      color: "primary.main",
                      px: 4,
                      py: 1.5,
                      fontSize: "1rem",
                      fontWeight: 600,
                      "&:hover": {
                        bgcolor: "grey.100",
                      },
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    sx={{
                      borderColor: "primary.contrastText",
                      color: "primary.contrastText",
                      px: 4,
                      py: 1.5,
                      fontSize: "1rem",
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: "primary.contrastText",
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                      },
                    }}
                  >
                    Watch Demo
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box
        sx={{
          py: { xs: 4, sm: 6, md: 8 },
          px: 2,
          bgcolor: "background.default",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{
                fontWeight: 700,
                mb: 1.5,
                fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
              }}
            >
              Features
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Everything you need to manage tasks
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {features.map((feature, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    boxShadow: 1,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        color: "primary.main",
                        mb: 1.5,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: { xs: "1rem", sm: "1.125rem" },
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box
        sx={{
          py: { xs: 4, sm: 6, md: 8 },
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{
                fontWeight: 700,
                mb: 1.5,
                fontSize: { xs: "1.75rem", sm: "2rem", md: "2.5rem" },
              }}
            >
              Pricing
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Choose the plan that's right for you
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {pricingPlans.map((plan, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    boxShadow: plan.highlighted ? 3 : 1,
                    border: 1,
                    borderColor: plan.highlighted ? "primary.main" : "divider",
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: plan.highlighted ? 4 : 2,
                    },
                  }}
                >
                  {plan.highlighted && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: -2,
                        left: "50%",
                        transform: "translateX(-50%)",
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        px: 1.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      POPULAR
                    </Box>
                  )}
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="h5"
                      component="h3"
                      sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        fontSize: { xs: "1.125rem", sm: "1.25rem" },
                      }}
                    >
                      {plan.name}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="h3"
                        component="span"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "2rem", sm: "2.25rem" },
                        }}
                      >
                        {plan.price}
                      </Typography>
                      <Typography
                        variant="body1"
                        component="span"
                        sx={{
                          color: "text.secondary",
                          ml: 0.5,
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        }}
                      >
                        {plan.period}
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      {plan.features.map((feature, featureIndex) => (
                        <Box
                          key={featureIndex}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <CheckCircleIcon
                            sx={{
                              fontSize: 16,
                              color: "success.main",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                            }}
                          >
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                    <Button
                      variant={plan.highlighted ? "contained" : "outlined"}
                      fullWidth
                      size="small"
                      onClick={() => navigate("/register")}
                      sx={{
                        py: 0.75,
                        fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                        fontWeight: 600,
                      }}
                    >
                      Choose Plan
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: 3,
          px: 2,
          bgcolor: "grey.900",
          color: "grey.100",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                <TaskAltIcon sx={{ fontSize: 28, color: "primary.main" }} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, fontSize: "1.125rem" }}
                >
                  TaskManager
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: "grey.400",
                  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                }}
              >
                The all-in-one task management solution for teams and
                organizations.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, fontSize: "0.875rem" }}
              >
                Product
              </Typography>
              <Stack spacing={0.75}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Features
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Pricing
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Security
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, fontSize: "0.875rem" }}
              >
                Company
              </Typography>
              <Stack spacing={0.75}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  About
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Blog
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Careers
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, fontSize: "0.875rem" }}
              >
                Support
              </Typography>
              <Stack spacing={0.75}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Help Center
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Contact Us
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    cursor: "pointer",
                    "&:hover": { color: "grey.100" },
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  Status
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2, borderColor: "grey.800" }} />

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "grey.400",
                fontSize: { xs: "0.75rem", sm: "0.8125rem" },
              }}
            >
              © 2026 TaskManager. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={0.75}>
              <IconButton
                size="small"
                sx={{
                  color: "grey.400",
                  "&:hover": { color: "grey.100" },
                }}
              >
                <GitHubIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: "grey.400",
                  "&:hover": { color: "grey.100" },
                }}
              >
                <TwitterIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: "grey.400",
                  "&:hover": { color: "grey.100" },
                }}
              >
                <LinkedInIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
