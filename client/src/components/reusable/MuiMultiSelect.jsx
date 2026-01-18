/**
 * MuiMultiSelect Component - Reusable Multi-Select Component
 *
 * MuiMultiSelect is a pure UI component that wraps MUI's Autocomplete with multiple selection support.
 * It does not depend on react-hook-form's Controller internally.
 * It accepts standard controlled component props: value, onChange, error, helperText.
 *
 * Features:
 * - Multiple selection with chips display
 * - Max items validation logic (visual only, actual validation in form)
 * - "Select all" option
 * - Selected count in label
 * - All MuiSelectAutocomplete features
 *
 */

import { useMemo, forwardRef } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormHelperText from "@mui/material/FormHelperText";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

/**
 * MuiMultiSelect Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.value - Selected values
 * @param {Function} props.onChange - Handler for change events (event, newValue)
 * @param {Function} props.onBlur - Handler for blur events
 * @param {string} props.name - Field name
 * @param {string} props.label - Field label
 * @param {Object} props.error - Error object
 * @param {string} props.helperText - Helper text to display
 * @param {Array} props.options - Array of options
 * @param {number} props.maxItems - Maximum number of items that can be selected
 * @param {boolean} props.selectAll - Whether to show "Select all" option (default: false)
 * @param {boolean} props.showCount - Whether to show selected count in label (default: true)
 * @param {boolean} props.isLoading - Whether options are loading
 * @param {Function} props.getOptionLabel - Function to get option label
 * @param {Function} props.getOptionValue - Function to get option value
 * @param {Function} props.isOptionEqualToValue - Function to compare options
 * @param {Function} props.filterOptions - Custom filter function
 * @param {Function} props.groupBy - Function to group options
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {boolean} props.required - Whether field is required
 * @param {boolean} props.fullWidth - Whether field takes full width
 * @param {string} props.size - Field size
 * @param {string} props.variant - Field variant
 * @param {number} props.limitTags - Maximum number of tags to show
 * @param {string} props.noOptionsText - Text to show when no options available
 * @param {string} props.loadingText - Text to show while loading
 */
const MuiMultiSelect = forwardRef(
  (
    {
      value = [],
      onChange,
      onBlur,
      name,
      label,
      error,
      helperText,
      options = [],
      maxItems,
      selectAll = false,
      showCount = true,
      isLoading = false,
      getOptionLabel = (option) =>
        option?.label || option?.name || option || "",
      getOptionValue = (option) => option?.value || option?._id || option,
      isOptionEqualToValue = (option, value) => {
        if (!option || !value) return false;
        return getOptionValue(option) === getOptionValue(value);
      },
      filterOptions,
      groupBy,
      placeholder,
      disabled = false,
      required = false,
      fullWidth = true,
      size = "small",
      variant = "outlined",
      limitTags = 2,
      noOptionsText = "No options",
      loadingText = "Loading...",
      ...otherProps
    },
    ref
  ) => {
    // Memoize options with "Select all" to prevent re-creation on every render
    const optionsWithSelectAll = useMemo(() => {
      return selectAll
        ? [{ label: "Select all", value: "SELECT_ALL" }, ...options]
        : options;
    }, [selectAll, options]);

    const selectedCount = value?.length || 0;
    const isMaxReached = maxItems && selectedCount >= maxItems;

    // Handle "Select all" functionality
    const handleSelectAll = (event, newValue) => {
      if (selectAll && newValue.length > 0) {
        const selectAllOption = newValue.find(
          (option) => getOptionValue(option) === "SELECT_ALL"
        );

        if (selectAllOption) {
          // If "Select all" is clicked, select all options (excluding "Select all" itself)
          const allOptions = options.filter(
            (option) => getOptionValue(option) !== "SELECT_ALL"
          );
          onChange(event, allOptions);
          return;
        }
      }

      // Check max items limit
      if (maxItems && newValue.length > maxItems) {
        return; // Prevent selection beyond max
      }

      if (onChange) {
        onChange(newValue);
      }
    };

    // Generate label with count
    const labelWithCount =
      showCount && selectedCount > 0
        ? `${label} (${selectedCount}${maxItems ? `/${maxItems}` : ""})`
        : label;

    return (
      <>
        <Autocomplete
          value={value || []}
          onChange={handleSelectAll}
          onBlur={onBlur}
          ref={ref}
          options={optionsWithSelectAll}
          multiple
          loading={isLoading}
          getOptionLabel={getOptionLabel}
          isOptionEqualToValue={isOptionEqualToValue}
          filterOptions={filterOptions}
          groupBy={groupBy}
          disabled={disabled}
          disableCloseOnSelect
          limitTags={limitTags}
          noOptionsText={noOptionsText}
          loadingText={loadingText}
          size={size}
          fullWidth={fullWidth}
          renderOption={(props, option, { selected }) => {
            const { key, ...optionProps } = props;
            const isSelectAll = getOptionValue(option) === "SELECT_ALL";

            return (
              <li key={key} {...optionProps}>
                <Checkbox
                  icon={icon}
                  checkedIcon={checkedIcon}
                  style={{ marginRight: 8 }}
                  checked={
                    isSelectAll ? selectedCount === options.length : selected
                  }
                  indeterminate={
                    isSelectAll &&
                    selectedCount > 0 &&
                    selectedCount < options.length
                  }
                />
                {getOptionLabel(option)}
              </li>
            );
          }}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={getOptionLabel(option)}
                  {...tagProps}
                  size={size}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={labelWithCount}
              placeholder={placeholder}
              required={required}
              error={!!error}
              helperText={error?.message || helperText}
              variant={variant}
              name={name}
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
          {...otherProps}
        />

        {/* Max items warning */}
        {isMaxReached && (
          <FormHelperText
            sx={{
              textAlign: "right",
              mt: 0.5,
              color: "warning.main",
            }}
          >
            Maximum {maxItems} items reached
          </FormHelperText>
        )}
      </>
    );
  }
);

MuiMultiSelect.displayName = "MuiMultiSelect";

export default MuiMultiSelect;
