import React, { useEffect } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';

const VARIANTS = {
  error: {
    title: 'Error',
    border: 'border-red-500',
    iconBg: 'bg-red-500/10',
    iconColor: '#ef4444',
    Icon: ErrorOutlineIcon,
  },
  success: {
    title: 'Éxito',
    border: 'border-green-500',
    iconBg: 'bg-green-500/10',
    iconColor: '#22c55e',
    Icon: CheckCircleOutlineIcon,
  },
};

/**
 * Toast — notificación flotante de error o éxito.
 *
 * Props:
 *   open        — bool
 *   message     — string
 *   onClose     — () => void
 *   variant     — 'error' (default) | 'success'
 *   duration    — ms antes de auto-cerrar (default 4000, 0 = no auto-cierra)
 *   responsive  — bool (default false). Si es true, en mobile ocupa el ancho
 *                 disponible con márgenes en vez de quedar pegado/cortado
 *                 contra el borde derecho. Default false para no cambiar el
 *                 comportamiento de las pantallas que ya usan este componente
 *                 (ver DEV-112 para extenderlo a todas).
 */
const Toast = ({ open, message, onClose, variant = 'error', duration = 4000, responsive = false }) => {
  useEffect(() => {
    if (!open || !duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, message, duration, onClose]);

  if (!open) return null;

  const { title, border, iconBg, iconColor, Icon } = VARIANTS[variant];

  const wrapperCls = responsive
    ? 'fixed top-20 inset-x-4 sm:inset-x-auto sm:right-8 z-[60] animate-[fadeSlideIn_0.25s_ease-out]'
    : 'fixed top-20 right-8 z-[60] animate-[fadeSlideIn_0.25s_ease-out]';
  const boxCls = responsive
    ? 'w-full sm:max-w-md'
    : 'max-w-md';

  return (
    <div className={wrapperCls}>
      <div className={`bg-surface-card border-l-4 ${border} shadow-xl rounded-lg p-4 flex items-center gap-4 ${boxCls}`}>
        <div className={`${iconBg} p-2 rounded-full shrink-0`}>
          <Icon sx={{ color: iconColor, fontSize: 20 }} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-on-surface">{title}</h4>
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
