import React, { useEffect } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Toast — notificación flotante de error.
 *
 * Props:
 *   open      — bool
 *   message   — string
 *   onClose   — () => void
 *   duration  — ms antes de auto-cerrar (default 4000, 0 = no auto-cierra)
 */
const Toast = ({ open, message, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!open || !duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, message, duration, onClose]);

  if (!open) return null;

  return (
    <div className="fixed top-20 right-8 z-[60] animate-[fadeSlideIn_0.25s_ease-out]">
      <div className="bg-white border-l-4 border-red-500 shadow-xl rounded-lg p-4 flex items-center gap-4 max-w-md">
        <div className="bg-red-50 p-2 rounded-full shrink-0">
          <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: 20 }} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-on-surface">Error</h4>
          <p className="text-xs text-on-surface-muted">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-on-surface-muted hover:text-on-surface transition-colors shrink-0"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
