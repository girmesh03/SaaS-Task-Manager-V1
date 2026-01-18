/**
 * MuiTooltip Component - Reusable Tooltip
 *
 */

import { forwardRef } from "react";
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
      children,
      ...muiProps
    },
    ref
  ) => {
    return (
      <Tooltip
        ref={ref}
        title={title}
        placement={placement}
        arrow={arrow}
        slots={{ transition: TransitionComponent }}
        enterDelay={enterDelay}
        {...muiProps}
      >
        {children}
      </Tooltip>
    );
  }
);

MuiTooltip.displayName = "MuiTooltip";

export default MuiTooltip;
