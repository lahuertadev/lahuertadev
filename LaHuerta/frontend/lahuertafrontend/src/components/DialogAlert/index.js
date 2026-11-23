import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SpotlightButton from '../SpotlightButton';

// Tono del diálogo: el borde animado, el halo y el ícono van en el color del tono (rojo para
// eliminar o anular, amarillo para confirmar con avisos). El botón de confirmar es la variante
// translúcida de SpotlightButton, con su efecto de luz al pasar el mouse.
const TONES = {
  danger: {
    icon: <DeleteOutlineIcon sx={{ fontSize: 20 }} />,
    confirmVariant: 'danger',
    rgb: '239 68 68',
    iconCls: 'bg-red-500/10 text-red-500 dark:text-red-400',
  },
  warning: {
    icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
    confirmVariant: 'warning',
    rgb: '245 158 11',
    iconCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
};

/**
 * Diálogo de confirmación. Cada pantalla le pasa el texto; los botones y el estilo son del componente.
 *
 * Props:
 *   open, title, message      — message puede ser texto o JSX
 *   onConfirm, onCancel
 *   tone                      — color del botón de confirmar: 'danger' (default, acciones destructivas) | 'warning' (confirmar con avisos)
 *   icon                      — reemplaza el ícono del tono
 *   confirmLabel, cancelLabel
 *   confirmDisabled           — deshabilita Confirmar (ej. mientras falta el motivo de una anulación)
 */
export default function AlertDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  tone = 'danger',
  icon,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmDisabled = false,
}) {
  const toneConfig = TONES[tone] || TONES.danger;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        className: 'dialog-border-glow',
        style: {
          '--dialog-tone-rgb': toneConfig.rgb,
          borderRadius: '18px',
          width: 'min(480px, calc(100vw - 32px))',
          margin: '16px',
        },
      }}
    >
      <div className="dialog-body rounded-2xl bg-surface-card p-5 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toneConfig.iconCls}`}>
            {icon ?? toneConfig.icon}
          </div>
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
        </div>

        {/* Message */}
        <div className="text-sm text-on-surface leading-relaxed">
          {message}
        </div>

        {/* Actions: mismo layout que FormActions (en mobile apiladas a lo ancho, la principal arriba). */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
          <SpotlightButton variant="neutral" onClick={onCancel} className="w-full sm:w-auto px-5 py-2.5 text-sm">
            {cancelLabel}
          </SpotlightButton>
          <SpotlightButton
            variant={toneConfig.confirmVariant}
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="w-full sm:w-auto sm:min-w-[8rem] px-6 py-2.5 text-sm"
          >
            {confirmLabel}
          </SpotlightButton>
        </div>

      </div>
    </Dialog>
  );
}
