import React from 'react';
import { BADGE_COLORS } from '../../constants/badgeColors';

/**
 * Badge — etiqueta con un color de la paleta única del sitio (constants/badgeColors).
 * Para estados usar StatusBadge (rojo, ámbar o verde por tono); Badge es para tipos
 * (de pago, de factura, categorías) y estados que no son ninguno de esos tres.
 *
 * Props:
 *   color     — clave de BADGE_COLORS ('blue', 'violet', …; default 'gray') o un color de la paleta
 *               ({ bg, color }, ej. el de una config como CHECK_STATE_CONFIG)
 *   label     — texto de la etiqueta
 *   icon      — opcional, antes del texto: un emoji o un ícono de MUI
 *   children  — opcional, después del texto (ej. un AlertIcon)
 *   className — clases extra
 */
export default function Badge({ color = 'gray', label, icon = null, children, className = '' }) {
  const palette = (typeof color === 'string' ? BADGE_COLORS[color] : color) || BADGE_COLORS.gray;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md py-0.5 text-xs leading-[18px] font-semibold ${icon ? 'pl-1.5 pr-2.5' : 'px-2.5'} ${className}`}
      style={{ backgroundColor: palette.bg, color: palette.color }}
    >
      {icon && <span aria-hidden="true" className="inline-flex items-center">{icon}</span>}
      {label}
      {children}
    </span>
  );
}
