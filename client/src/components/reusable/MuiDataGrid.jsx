/**
 * MuiDataGrid Component - Reusable Data Grid with MUI X DataGrid
 *
 * Enhanced data grid component with pagination, sorting, filtering, and selection.
 * Uses MUI X DataGrid with theme integration and accessibility support.
 *
 * Features:
 * - Server-side pagination
 * - Column sorting
 * - Row selection
 * - Loading states with skeleton
 * - Empty state handling
 * - Theme-based styling
 * - Accessibility support
 * - Responsive design
 * - Custom toolbar
 * - Memoized styles for performance
 * - PropTypes validation
 * - Composition pattern for custom states
 *
 * @example
 * // Basic usage
 * <MuiDataGrid
 *   rows={tasks}
 *   columns={taskColumns}
 *   loading={isLoading}
 *   page={page}
 *   pageSize={pageSize}
 *   totalRows={totalCount}
 *   onPageChange={handlePageChange}
 *   onPageSizeChange={handlePageSizeChange}
 *   onSortChange={handleSortChange}
 * />
 *
 * @example
 * // With custom loading and empty states
 * <MuiDataGrid
 *   rows={tasks}
 *   columns={taskColumns}
 *   loading={isLoading}
 *   LoadingComponent={<CustomLoader />}
 *   EmptyComponent={<CustomEmptyState />}
 * />
 *
 * @example
 * // With checkbox selection
 * <MuiDataGrid
 *   rows={tasks}
 *   columns={taskColumns}
 *   checkboxSelection
 *   onSelectionChange={handleSelectionChange}
 * />
 */

import { useMemo, useEffect, memo } from "react";
import PropTypes from "prop-types";
import { DataGrid as MuiXDataGrid } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import MuiLoading from "./MuiLoading";
import MuiEmptyState from "./MuiEmptyState";

// Constants for magic numbers
const DEFAULT_LOADING_HEIGHT = 400;
const DEFAULT_GRID_HEIGHT = 600;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

/**
 * Loading state component for DataGrid
 * Extracted for better maintainability and testability
 */
const DataGridLoadingState = memo(({ height = DEFAULT_LOADING_HEIGHT }) => (
  <Box sx={{ width: "100%", height }}>
    <MuiLoading
      variant="skeleton"
      skeletonType="rectangular"
      height={height}
      count={1}
    />
  </Box>
));

DataGridLoadingState.displayName = "DataGridLoadingState";

DataGridLoadingState.propTypes = {
  height: PropTypes.number,
};

/**
 * Get DataGrid styles based on theme
 * Extracted for better organization and reusability
 * @param {Object} theme - MUI theme object
 * @returns {Object} DataGrid sx styles
 */
const getDataGridStyles = (theme) => ({
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "background.paper",
  "& .MuiDataGrid-cell": {
    borderColor: "divider",
  },
  "& .MuiDataGrid-columnHeaders": {
    bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
    borderColor: "divider",
    fontWeight: theme.typography.fontWeightMedium,
  },
  "& .MuiDataGrid-footerContainer": {
    borderColor: "divider",
    bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
  },
  "& .MuiDataGrid-row:hover": {
    bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.100",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.light",
    "&:hover": {
      bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.light",
    },
  },
});

/**
 * MuiDataGrid Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.rows - Array of row data objects
 * @param {Array} props.columns - Array of column definition objects
 * @param {boolean} props.loading - Loading state
 * @param {number} props.page - Current page number (0-indexed)
 * @param {number} props.pageSize - Number of rows per page
 * @param {number} props.totalRows - Total number of rows (for server-side pagination)
 * @param {Function} props.onPageChange - Callback for page change (memoized recommended)
 * @param {Function} props.onPageSizeChange - Callback for page size change (memoized recommended)
 * @param {Function} props.onSortChange - Callback for sort change (memoized recommended)
 * @param {Function} props.onSelectionChange - Callback for selection change (memoized recommended)
 * @param {boolean} props.checkboxSelection - Enable checkbox selection
 * @param {boolean} props.disableRowSelectionOnClick - Disable row selection on click
 * @param {boolean} props.autoHeight - Auto height based on content
 * @param {string} props.density - Grid density (compact, standard, comfortable)
 * @param {string} props.emptyMessage - Message to display when no data
 * @param {React.ReactNode} props.emptyIcon - Icon to display when no data
 * @param {React.ReactNode} props.LoadingComponent - Custom loading component
 * @param {React.ReactNode} props.EmptyComponent - Custom empty state component
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {Object} props.sx - Additional sx styles
 * @param {Object} props.muiProps - Additional MUI DataGrid props
 */
const MuiDataGrid = ({
  rows = [],
  columns = [],
  loading = false,
  page = 0,
  pageSize = 10,
  totalRows = 0,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectionChange,
  checkboxSelection = false,
  disableRowSelectionOnClick = false,
  autoHeight = true,
  density = "standard",
  emptyMessage = "No data available",
  emptyIcon,
  LoadingComponent = null,
  EmptyComponent = null,
  ariaLabel = "Data grid",
  sx,
  ...muiProps
}) => {
  const theme = useTheme();

  // Memoize grid styles to prevent unnecessary re-renders
  const gridStyles = useMemo(() => getDataGridStyles(theme), [theme]);

  // Validate required props when features are enabled
  useEffect(() => {
    if (checkboxSelection && !onSelectionChange) {
      console.warn(
        "[MuiDataGrid] checkboxSelection is enabled but onSelectionChange is not provided"
      );
    }
  }, [checkboxSelection, onSelectionChange]);

  // Show custom or default loading state
  if (loading && rows.length === 0) {
    return (
      LoadingComponent || (
        <DataGridLoadingState height={DEFAULT_LOADING_HEIGHT} />
      )
    );
  }

  // Show custom or default empty state
  if (!loading && rows.length === 0) {
    return (
      EmptyComponent || (
        <MuiEmptyState message={emptyMessage} icon={emptyIcon} />
      )
    );
  }

  return (
    <Box
      role="region"
      aria-label="Data grid container"
      sx={{
        width: "100%",
        height: autoHeight ? "auto" : DEFAULT_GRID_HEIGHT,
        ...sx,
      }}
    >
      <MuiXDataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pagination
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={totalRows}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onSortModelChange={onSortChange}
        onRowSelectionModelChange={onSelectionChange}
        checkboxSelection={checkboxSelection}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        autoHeight={autoHeight}
        density={density}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        disableColumnMenu={false}
        disableColumnFilter={false}
        disableColumnSelector={false}
        disableDensitySelector={false}
        getRowId={(row) => row._id || row.id}
        aria-label={ariaLabel}
        sx={gridStyles}
        {...muiProps}
      />
    </Box>
  );
};

// Display name for debugging
MuiDataGrid.displayName = "MuiDataGrid";

// PropTypes for runtime validation
MuiDataGrid.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  totalRows: PropTypes.number,
  onPageChange: PropTypes.func,
  onPageSizeChange: PropTypes.func,
  onSortChange: PropTypes.func,
  onSelectionChange: PropTypes.func,
  checkboxSelection: PropTypes.bool,
  disableRowSelectionOnClick: PropTypes.bool,
  autoHeight: PropTypes.bool,
  density: PropTypes.oneOf(["compact", "standard", "comfortable"]),
  emptyMessage: PropTypes.string,
  emptyIcon: PropTypes.node,
  LoadingComponent: PropTypes.node,
  EmptyComponent: PropTypes.node,
  ariaLabel: PropTypes.string,
  sx: PropTypes.object,
};

// Memoize component to prevent unnecessary re-renders
export default memo(MuiDataGrid);
