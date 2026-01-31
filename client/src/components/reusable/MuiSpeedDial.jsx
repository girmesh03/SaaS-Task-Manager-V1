/**
 * MuiSpeedDial Component - Reusable Speed Dial
 *
 * Enhanced SpeedDial component with proper accessibility and controlled state support.
 * Uses MUI v7 slots API for proper component customization.
 *
 * Features:
 * - Controlled and uncontrolled modes
 * - Automatic close on action click
 * - Customizable positioning
 * - Theme-based styling
 * - Accessible labels
 * - MUI v7 compliant (slots API)
 *
 * @example
 * // Basic usage
 * <MuiSpeedDial
 *   ariaLabel="Create actions"
 *   actions={[
 *     { icon: <AddIcon />, name: "Create Task", onClick: handleCreateTask },
 *     { icon: <PersonIcon />, name: "Create User", onClick: handleCreateUser }
 *   ]}
 * />
 *
 * @example
 * // Controlled mode
 * <MuiSpeedDial
 *   open={open}
 *   onOpen={handleOpen}
 *   onClose={handleClose}
 *   actions={actions}
 * />
 */

import { forwardRef, useState } from "react";
import PropTypes from "prop-types";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";

const MuiSpeedDial = forwardRef(
  (
    {
      actions = [], // Array of { icon, name, onClick }
      icon, // Default is <SpeedDialIcon />
      direction = "up",
      ariaLabel = "SpeedDial",
      sx,
      position = { bottom: 16, right: 16 },
      open: controlledOpen,
      onOpen: controlledOnOpen,
      onClose: controlledOnClose,
      FabProps,
      ...muiProps
    },
    ref
  ) => {
    // Internal state for uncontrolled mode
    const [internalOpen, setInternalOpen] = useState(false);

    // Use controlled state if provided, otherwise use internal state
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const handleOpen = (event, reason) => {
      if (controlledOnOpen) {
        controlledOnOpen(event, reason);
      } else {
        setInternalOpen(true);
      }
    };

    const handleClose = (event, reason) => {
      if (controlledOnClose) {
        controlledOnClose(event, reason);
      } else {
        setInternalOpen(false);
      }
    };

    const handleActionClick = (action) => (event) => {
      action.onClick(event);
      // Close the SpeedDial after action click
      handleClose(event, "action");
    };

    return (
      <SpeedDial
        ref={ref}
        ariaLabel={ariaLabel}
        sx={{
          position: "absolute",
          ...position,
          ...sx,
        }}
        icon={icon || <SpeedDialIcon />}
        direction={direction}
        open={isOpen}
        onOpen={handleOpen}
        onClose={handleClose}
        slotProps={{
          fab: {
            size: "medium",
            ...FabProps,
          },
        }}
        {...muiProps}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            slotProps={{
              tooltip: {
                title: action.name,
                open: true,
              },
              fab: {
                size: "small",
              },
            }}
            onClick={handleActionClick(action)}
            sx={{
              whiteSpace: "nowrap",
            }}
          />
        ))}
      </SpeedDial>
    );
  }
);

MuiSpeedDial.displayName = "MuiSpeedDial";

export default MuiSpeedDial;
