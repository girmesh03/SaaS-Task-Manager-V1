/**
 * MuiDialogConfirm Component - Reusable Confirmation Dialog
 *
 */

import { memo } from "react";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import MuiDialog from "./MuiDialog";

const MuiDialogConfirm = memo(
  ({
    open,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmColor = "primary",
    isLoading = false,
    ...muiProps
  }) => {
    const handleConfirm = () => {
      if (onConfirm) {
        onConfirm();
      }
    };

    const actions = (
      <>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={isLoading}
          size="small"
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          disabled={isLoading}
          autoFocus
          size="small"
        >
          {isLoading ? "Processing..." : confirmText}
        </Button>
      </>
    );

    return (
      <MuiDialog
        open={open}
        onClose={onClose}
        title={title}
        actions={actions}
        maxWidth="xs"
        {...muiProps}
      >
        <Typography variant="body1">{message}</Typography>
      </MuiDialog>
    );
  }
);

MuiDialogConfirm.displayName = "MuiDialogConfirm";

MuiDialogConfirm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.oneOf([
    "inherit",
    "primary",
    "secondary",
    "success",
    "error",
    "info",
    "warning",
  ]),
  isLoading: PropTypes.bool,
};

export default MuiDialogConfirm;
