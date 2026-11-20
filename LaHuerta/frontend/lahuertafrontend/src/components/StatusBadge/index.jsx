import React from 'react';
import Badge from '../Badge';
import { STATE_TONES } from '../../constants/badgeColors';

/**
 * StatusBadge — etiqueta de estado con los tres colores base del sitio
 * (ver .claude/rules/frontend-styling.md, "Colores de estados"):
 * rojo para eliminación, anulación, rechazo o pendiente; ámbar para un estado intermedio;
 * verde para uno resuelto.
 *
 * Props:
 *   tone      — 'danger' (default) | 'warning' | 'success'
 *   label     — texto de la etiqueta
 *   icon      — opcional: un emoji o un ícono de MUI (ej. <ErrorOutlineIcon sx={{ fontSize: 14 }} />)
 *   className — clases extra
 */
export default function StatusBadge({ tone = 'danger', label, icon = null, className = '' }) {
  return <Badge color={STATE_TONES[tone] || STATE_TONES.danger} label={label} icon={icon} className={className} />;
}
