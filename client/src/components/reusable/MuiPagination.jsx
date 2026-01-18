/**
 * MuiPagination Component - Reusable Pagination
 *
 */

import { forwardRef } from "react";
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

export default MuiPagination;
