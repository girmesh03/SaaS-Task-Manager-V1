/**
 * MuiDialog Component - Reusable Dialog wrapper
 *
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import CloseIcon from "@mui/icons-material/Close";
import useResponsive from "../../hooks/useResponsive";

// Transition component for dialogs
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const MuiDialog = forwardRef(
  (
    {
      open,
      onClose,
      title,
      children,
      actions,
      maxWidth = "sm",
      fullWidth = true,
      fullScreen: forceFullScreen,
      showCloseButton = true,
      TransitionComponent = Transition,
      ...muiProps
    },
    ref
  ) => {
    const { isMobile } = useResponsive();
    const fullScreen =
      forceFullScreen !== undefined ? forceFullScreen : isMobile;

    return (
      <Dialog
        ref={ref}
        open={open}
        onClose={onClose}
        fullWidth={fullWidth}
        maxWidth={maxWidth}
        fullScreen={fullScreen}
        slots={{ transition: TransitionComponent }}
        disableEnforceFocus
        disableRestoreFocus
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: "background.default",
            backgroundImage: "none",
            borderRadius: isMobile ? 0 : 2,
          },
        }}
        {...muiProps}
      >
        {title && (
          <DialogTitle id="dialog-title" sx={{ m: 0, p: 2, pr: 6 }}>
            {title}
            {showCloseButton && onClose && (
              <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>
        )}
        <DialogContent id="dialog-description" dividers>
          {children}
        </DialogContent>
        {actions && (
          <DialogActions sx={{ py: 2, mr: 2 }}>{actions}</DialogActions>
        )}
      </Dialog>
    );
  }
);

MuiDialog.displayName = "MuiDialog";

MuiDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  title: PropTypes.node,
  children: PropTypes.node,
  actions: PropTypes.node,
  maxWidth: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl", false]),
  fullWidth: PropTypes.bool,
  fullScreen: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  TransitionComponent: PropTypes.elementType,
};

export default MuiDialog;
