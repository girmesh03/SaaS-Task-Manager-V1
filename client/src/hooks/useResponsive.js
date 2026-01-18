/**
 * useResponsive Hook - Responsive Design Hook
 *
 * Custom hook for responsive design breakpoints.
 * Uses MUI useMediaQuery with theme breakpoints.
 *
 * Returns:
 * - isMobile: Boolean indicating if screen is mobile (<960px)
 * - isTablet: Boolean indicating if screen is tablet (960px-1279px)
 * - isDesktop: Boolean indicating if screen is desktop (≥1280px)
 * - breakpoint: Current breakpoint name (xs, sm, md, lg, xl)
 *
 */

import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * useResponsive hook
 *
 * @returns {Object} Responsive state
 * @returns {boolean} return.isMobile - True if screen is mobile (less than 960px)
 * @returns {boolean} return.isTablet - True if screen is tablet (960px-1279px)
 * @returns {boolean} return.isDesktop - True if screen is desktop (1280px or more)
 * @returns {string} return.breakpoint - Current breakpoint (xs, sm, md, lg, xl)
 * @returns {boolean} return.isXs - True if screen is extra small (less than 600px)
 * @returns {boolean} return.isSm - True if screen is small (600px-959px)
 * @returns {boolean} return.isMd - True if screen is medium (960px-1279px)
 * @returns {boolean} return.isLg - True if screen is large (1280px-1919px)
 * @returns {boolean} return.isXl - True if screen is extra large (1920px or more)
 */
const useResponsive = () => {
  const theme = useTheme();

  // MUI breakpoints:
  // xs: 0px
  // sm: 600px
  // md: 960px
  // lg: 1280px
  // xl: 1920px

  // Check individual breakpoints
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  const isXl = useMediaQuery(theme.breakpoints.only("xl"));

  // Check breakpoint ranges
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // <960px
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg")); // 960px-1279px
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg")); // ≥1280px

  // Determine current breakpoint
  let breakpoint = "xs";
  if (isXl) breakpoint = "xl";
  else if (isLg) breakpoint = "lg";
  else if (isMd) breakpoint = "md";
  else if (isSm) breakpoint = "sm";

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
  };
};

export default useResponsive;
