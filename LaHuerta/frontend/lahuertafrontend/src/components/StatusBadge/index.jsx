import React from 'react';

// Colores de estados de todo el sistema (ver .claude/rules/frontend-styling.md, "Colores de estados"):
// rojo para eliminación, anulación o rechazo; ámbar para un estado intermedio; verde para uno resuelto.
const TONE_CLASSES = {
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  success: 'bg-green-500/15 text-green-700 dark:text-green-400',
};

/**
 * StatusBadge — etiqueta de estado.
 *
 * Props:
 *   tone      — 'danger' (default) | 'warning' | 'success'
 *   label     — texto de la etiqueta
 *   icon      — opcional: un emoji o un ícono de MUI (ej. <ErrorOutlineIcon sx={{ fontSize: 14 }} />)
 *   className — clases extra
 */
export default function StatusBadge({ tone = 'danger', label, icon = null, className = '' }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-md px-2.5 py-0.5 text-xs leading-[18px] font-semibold ${TONE_CLASSES[tone]} ${icon ? 'pl-1.5' : ''} ${className}`}
    >
      {icon && <span aria-hidden="true" className="inline-flex items-center">{icon}</span>}
      {label}
    </span>
  );
}
