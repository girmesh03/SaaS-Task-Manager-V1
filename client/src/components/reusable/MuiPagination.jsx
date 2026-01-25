/**
 * MuiPagination Component - Reusable Pagination
 *
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";
import Pagination from "@mui/material/Pagination";

const MuiPagination = forwardRef(
  (
    {
      count, // Total pages
      page, // Current page (1-based)
      onChange,
      color = "primary",
      shape = "rounded",
      variant = "outlined",
      showFirstButton = true,
      showLastButton = true,
      size = "small",
      renderItem,
      sx,
      ...muiProps
    },
    ref
  ) => {
    return (
      <Pagination
        ref={ref}
        count={count}
        page={page}
        onChange={onChange}
        color={color}
        shape={shape}
        variant={variant}
        showFirstButton={showFirstButton}
        showLastButton={showLastButton}
        size={size}
        renderItem={renderItem}
        sx={sx}
        {...muiProps}
      />
    );
  }
);

MuiPagination.displayName = "MuiPagination";

MuiPagination.propTypes = {
  count: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  color: PropTypes.oneOf(["primary", "secondary", "standard"]),
  shape: PropTypes.oneOf(["circular", "rounded"]),
  variant: PropTypes.oneOf(["text", "outlined"]),
  showFirstButton: PropTypes.bool,
  showLastButton: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  renderItem: PropTypes.func,
  sx: PropTypes.object,
};

export default MuiPagination;
