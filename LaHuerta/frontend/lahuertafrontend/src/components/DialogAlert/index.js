import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export default function AlertDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        style: {
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(44,52,55,0.12)',
          minWidth: '400px',
          maxWidth: '480px',
          padding: '8px',
        },
      }}
    >
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <DeleteOutlineIcon sx={{ fontSize: 20, color: '#ef4444' }} />
          </div>
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
        </div>

        {/* Message */}
        <p className="text-sm text-on-surface-muted leading-relaxed pl-[52px]">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-semibold text-on-surface-muted hover:bg-surface-low rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-500 text-white font-bold text-sm rounded-lg hover:bg-red-600 active:scale-[0.98] transition-all shadow-sm"
          >
            Confirmar
          </button>
        </div>

      </div>
    </Dialog>
  );
}
