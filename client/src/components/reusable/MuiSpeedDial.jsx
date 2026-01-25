/**
 * MuiSpeedDial Component - Reusable Speed Dial
 *
 */

import { forwardRef } from "react";
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
      ...muiProps
    },
    ref
  ) => {
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
        {...muiProps}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            slotProps={{ tooltip: { title: action.name } }}
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>
    );
  }
);

MuiSpeedDial.displayName = "MuiSpeedDial";

MuiSpeedDial.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.node.isRequired,
      name: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
    })
  ),
  icon: PropTypes.node,
  direction: PropTypes.oneOf(["up", "down", "left", "right"]),
  ariaLabel: PropTypes.string,
  sx: PropTypes.object,
  position: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number,
  }),
};

export default MuiSpeedDial;
