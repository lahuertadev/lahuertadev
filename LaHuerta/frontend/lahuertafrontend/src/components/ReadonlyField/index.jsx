import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const readonlyCls = 'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted select-none cursor-not-allowed';
const highlightCls = 'w-full px-3 py-2.5 rounded-lg border text-sm font-semibold select-none cursor-not-allowed bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400';

/**
 * ReadonlyField — dato de solo lectura dentro de un formulario, con el mismo alto que los inputs
 * (ej. el saldo en cuenta corriente del proveedor o del cliente).
 *
 * Props:
 *   label     — texto del label
 *   value     — lo que se muestra ('—' si está vacío)
 *   highlight — resaltado en ámbar, para el dato que hay que mirar
 *   helpText  — explicación en el tooltip del ícono de información
 */
export default function ReadonlyField({ label, value, highlight = false, helpText }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">{label}</span>
        {helpText && (
          <Tooltip title={helpText} placement="top" arrow>
            <InfoOutlinedIcon aria-label={helpText} sx={{ fontSize: 14, color: '#9ca3af', cursor: 'help', '&:hover': { color: '#4a7bc4' } }} />
          </Tooltip>
        )}
      </div>
      <div className={highlight ? highlightCls : readonlyCls}>{value || '—'}</div>
    </div>
  );
}
