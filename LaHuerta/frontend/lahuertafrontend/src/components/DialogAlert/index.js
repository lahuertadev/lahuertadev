import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function AlertDialog({open, title, message, onConfirm, onCancel}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button 
        onClick={onCancel} 
        variant="contained"
        className="!bg-white !text-gray-700 !border !border-gray-300 hover:!bg-gray-200"
        >
          Cancelar
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained"
          autoFocus
          sx={{
            '&:hover': {
              backgroundColor: '#d32f2f',
            }
          }}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}