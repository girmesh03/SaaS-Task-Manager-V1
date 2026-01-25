/**
 * MuiFilterPanel Component - Reusable Filter Panel with URL Query Params
 *
 * Enhanced filter panel component that syncs filter state with URL query parameters.
 * Supports multiple filter types and provides a clean UI for filtering data.
 *
 * Features:
 * - URL query parameter synchronization
 * - Multiple filter types (text, select, date, etc.)
 * - Clear all filters
 * - Collapsible panel
 * - Theme-based styling
 * - Accessibility support
 * - Responsive design
 *
 * @example
 * <MuiFilterPanel
 *   filters={[
 *     { name: "status", label: "Status", type: "select", options: statusOptions },
 *     { name: "priority", label: "Priority", type: "select", options: priorityOptions },
 *     { name: "search", label: "Search", type: "text" },
 *   ]}
 *   onFilterChange={handleFilterChange}
 * />
 */

import { useState, useMemo, useCallback, memo } from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MuiTextField from "./MuiTextField";
import MuiSelectAutocomplete from "./MuiSelectAutocomplete";

const MuiFilterPanel = ({
  filters = [], // Array of { name, label, type, options, defaultValue }
  onFilterChange,
  initialExpanded = false,
  showClearButton = true,
  sx,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(initialExpanded);

  // Handle filter change
  const handleFilterChange = useCallback(
    (filterName, value) => {
      // Update URL params
      const newParams = new URLSearchParams(searchParams);
      if (value) {
        newParams.set(filterName, value);
      } else {
        newParams.delete(filterName);
      }
      setSearchParams(newParams);

      // Notify parent with new values computed from updated params
      if (onFilterChange) {
        const newValues = {};
        filters.forEach((filter) => {
          if (filter.name === filterName) {
            newValues[filter.name] = value;
          } else {
            newValues[filter.name] = newParams.get(filter.name) || "";
          }
        });
        onFilterChange(newValues);
      }
    },
    [searchParams, setSearchParams, onFilterChange, filters]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    // Clear URL params
    const newParams = new URLSearchParams();
    setSearchParams(newParams);

    // Notify parent with cleared values
    if (onFilterChange) {
      const clearedValues = {};
      filters.forEach((filter) => {
        clearedValues[filter.name] = "";
      });
      onFilterChange(clearedValues);
    }
  }, [filters, setSearchParams, onFilterChange]);

  // Check if any filter has value (memoized)
  const hasActiveFilters = useMemo(() => {
    return filters.some((filter) => {
      const value = searchParams.get(filter.name);
      return value !== "" && value !== null && value !== undefined;
    });
  }, [filters, searchParams]);

  // Count active filters (memoized)
  const activeFilterCount = useMemo(() => {
    return filters.filter((filter) => {
      const value = searchParams.get(filter.name);
      return value !== "" && value !== null && value !== undefined;
    }).length;
  }, [filters, searchParams]);

  // Render filter input based on type
  const renderFilterInput = useCallback(
    (filter) => {
      const value = searchParams.get(filter.name) || "";

      switch (filter.type) {
        case "select":
          return (
            <MuiSelectAutocomplete
              name={filter.name}
              label={filter.label}
              value={value}
              onChange={(newValue) => handleFilterChange(filter.name, newValue)}
              options={filter.options || []}
              fullWidth
              size="small"
            />
          );

        case "text":
        default:
          return (
            <MuiTextField
              name={filter.name}
              label={filter.label}
              value={value}
              onChange={(e) => handleFilterChange(filter.name, e.target.value)}
              fullWidth
              size="small"
              placeholder={filter.placeholder}
            />
          );
      }
    },
    [searchParams, handleFilterChange]
  );

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 1,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: expanded ? 2 : 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterListIcon color="action" />
          <Typography variant="subtitle1" fontWeight="medium">
            Filters
            {hasActiveFilters && (
              <Typography
                component="span"
                variant="caption"
                color="primary"
                sx={{ ml: 1 }}
              >
                ({activeFilterCount} active)
              </Typography>
            )}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {showClearButton && hasActiveFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              color="inherit"
            >
              Clear All
            </Button>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse filters" : "Expand filters"}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Stack
          spacing={2}
          direction={{ xs: "column", sm: "row" }}
          flexWrap="wrap"
        >
          {filters.map((filter) => (
            <Box
              key={filter.name}
              sx={{ flex: { xs: "1 1 100%", sm: "1 1 200px" } }}
            >
              {renderFilterInput(filter)}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
};

MuiFilterPanel.displayName = "MuiFilterPanel";

MuiFilterPanel.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(["text", "select"]),
      options: PropTypes.array,
      defaultValue: PropTypes.string,
      placeholder: PropTypes.string,
    })
  ),
  onFilterChange: PropTypes.func,
  initialExpanded: PropTypes.bool,
  showClearButton: PropTypes.bool,
  sx: PropTypes.object,
};

export default memo(MuiFilterPanel);
