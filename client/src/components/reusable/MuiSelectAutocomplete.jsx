/**
 * MuiSelectAutocomplete Component - Reusable Autocomplete Component
 *
 * MuiSelectAutocomplete is a pure UI component that wraps MUI's Autocomplete.
 * It does not depend on react-hook-form's Controller internally.
 * It accepts standard controlled component props: value, onChange, error, helperText.
 *
 * Features:
 * - Single/multiple selection
 * - Async options loading with loading state
 * - Search/filter with custom filterOptions
 * - Grouping support
 * - Proper ref forwarding for integration
 * - Theme styling applied
 *
 */

import { forwardRef } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";

/**
 * MuiSelectAutocomplete Component
 *
 * @param {Object} props - Component props
 * @param {any} props.value - The selected value(s)
 * @param {Function} props.onChange - Handler for change events (event, newValue)
 * @param {Function} props.onBlur - Handler for blur events
 * @param {string} props.name - Field name
 * @param {string} props.label - Field label
 * @param {Object} props.error - Error object
 * @param {string} props.helperText - Helper text to display
 * @param {Array} props.options - Array of options
 * @param {boolean} props.multiple - Whether to allow multiple selection
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
 * @param {boolean} props.freeSolo - Whether to allow free text input
 * @param {boolean} props.disableClearable - Whether to disable clear button
 * @param {number} props.limitTags - Maximum number of tags to show
 * @param {string} props.noOptionsText - Text to show when no options available
 * @param {string} props.loadingText - Text to show while loading
 */
const MuiSelectAutocomplete = forwardRef(
  (
    {
      value,
      onChange,
      onBlur,
      name,
      label,
      error,
      helperText,
      options = [],
      multiple = false,
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
      freeSolo = false,
      disableClearable = false,
      limitTags = 2,
      noOptionsText = "No options",
      loadingText = "Loading...",
      ...otherProps
    },
    ref
  ) => {
    return (
      <Autocomplete
        value={value || (multiple ? [] : null)}
        onChange={(_event, newValue) => {
          if (onChange) {
            onChange(newValue);
          }
        }}
        onBlur={onBlur}
        ref={ref}
        options={options}
        multiple={multiple}
        loading={isLoading}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        filterOptions={filterOptions}
        groupBy={groupBy}
        disabled={disabled}
        freeSolo={freeSolo}
        disableClearable={disableClearable}
        limitTags={limitTags}
        noOptionsText={noOptionsText}
        loadingText={loadingText}
        size={size}
        fullWidth={fullWidth}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
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
    );
  }
);

MuiSelectAutocomplete.displayName = "MuiSelectAutocomplete";

export default MuiSelectAutocomplete;
