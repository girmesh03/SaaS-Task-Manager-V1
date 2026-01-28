/**
 * Menu Styles
 * Shared styling constants for MUI Menu components
 */

/**
 * Dropdown menu styles with arrow pointer
 * Used for user account menus and other dropdown menus
 */
export const MENU_DROPDOWN_STYLES = {
  minWidth: 200,
  mt: 1.5,
  overflow: "visible",
  filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.1))",
  "&:before": {
    content: '""',
    display: "block",
    position: "absolute",
    top: 0,
    right: 14,
    width: 10,
    height: 10,
    bgcolor: "background.paper",
    transform: "translateY(-50%) rotate(45deg)",
    zIndex: 0,
  },
};

/**
 * Menu slot props configuration
 * @param {number} elevation - Paper elevation (default: 8)
 * @param {Object} additionalStyles - Additional sx styles to merge
 * @returns {Object} Menu slotProps configuration
 */
export const getMenuSlotProps = (elevation = 8, additionalStyles = {}) => ({
  paper: {
    elevation,
    sx: {
      ...MENU_DROPDOWN_STYLES,
      ...additionalStyles,
    },
  },
});
