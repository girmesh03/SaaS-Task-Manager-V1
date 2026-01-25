/**
 * MuiTooltip Component - Reusable Tooltip with Enhanced Accessibility
 *
 * Enhanced tooltip component with proper accessibility support including
 * keyboard navigation, focus management, and ARIA attributes.
 *
 * Features:
 * - Keyboard navigation support (Escape to close)
 * - Focus management
 * - ARIA attributes for screen readers
 * - Customizable placement and transitions
 * - Arrow indicator
 * - Configurable delays
 * - Theme-based styling
 *
 * @example
 * // Basic tooltip
 * <MuiTooltip title="Delete item">
 *   <IconButton>
 *     <DeleteIcon />
 *   </IconButton>
 * </MuiTooltip>
 *
 * @example
 * // With custom placement
 * <MuiTooltip title="Save changes" placement="bottom" arrow>
 *   <Button>Save</Button>
 * </MuiTooltip>
 *
 * @example
 * // Disabled tooltip
 * <MuiTooltip title="Coming soon" disableInteractive>
 *   <span>
 *     <Button disabled>Feature</Button>
 *   </span>
 * </MuiTooltip>
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";

const MuiTooltip = forwardRef(
  (
    {
      title,
      placement = "top",
      arrow = true,
      TransitionComponent = Zoom,
      enterDelay = 200,
      leaveDelay = 0,
      enterNextDelay = 100,
      disableInteractive = false,
      disableFocusListener = false,
      disableHoverListener = false,
      disableTouchListener = false,
      followCursor = false,
      children,
      sx,
      ...muiProps
    },
    ref
  ) => {
    // Don't render tooltip if title is empty
    if (!title) {
      return children;
    }

    return (
      <Tooltip
        ref={ref}
        title={title}
        placement={placement}
        arrow={arrow}
        slots={{ transition: TransitionComponent }}
        enterDelay={enterDelay}
        leaveDelay={leaveDelay}
        enterNextDelay={enterNextDelay}
        disableInteractive={disableInteractive}
        disableFocusListener={disableFocusListener}
        disableHoverListener={disableHoverListener}
        disableTouchListener={disableTouchListener}
        followCursor={followCursor}
        slotProps={{
          popper: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, -8],
                },
              },
            ],
          },
          tooltip: {
            sx: {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "grey.800" : "grey.700",
              color: "common.white",
              fontSize: (theme) => theme.typography.body2.fontSize,
              fontWeight: (theme) => theme.typography.fontWeightRegular,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              maxWidth: 300,
              ...sx,
            },
          },
          arrow: {
            sx: {
              color: (theme) =>
                theme.palette.mode === "dark" ? "grey.800" : "grey.700",
            },
          },
        }}
        {...muiProps}
      >
        {children}
      </Tooltip>
    );
  }
);

MuiTooltip.displayName = "MuiTooltip";

MuiTooltip.propTypes = {
  title: PropTypes.node,
  placement: PropTypes.oneOf([
    "bottom-end",
    "bottom-start",
    "bottom",
    "left-end",
    "left-start",
    "left",
    "right-end",
    "right-start",
    "right",
    "top-end",
    "top-start",
    "top",
  ]),
  arrow: PropTypes.bool,
  TransitionComponent: PropTypes.elementType,
  enterDelay: PropTypes.number,
  leaveDelay: PropTypes.number,
  enterNextDelay: PropTypes.number,
  disableInteractive: PropTypes.bool,
  disableFocusListener: PropTypes.bool,
  disableHoverListener: PropTypes.bool,
  disableTouchListener: PropTypes.bool,
  followCursor: PropTypes.bool,
  children: PropTypes.element.isRequired,
  sx: PropTypes.object,
};

export default MuiTooltip;
