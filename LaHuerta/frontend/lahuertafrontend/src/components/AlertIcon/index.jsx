import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * AlertIcon — aviso de que algo requiere atención: "!" rojo con el detalle al pasar el mouse.
 *
 * Dónde va (ver .claude/rules/frontend-styling.md, "Alertas"):
 *   - sobre una etiqueta: adentro, a la derecha del texto;
 *   - al lado de un texto o una fecha: suelto, sin correr el texto (className con posición absoluta).
 *
 * Props:
 *   title     — detalle del aviso (tooltip y texto para lectores de pantalla)
 *   size      — tamaño del ícono en px (default 16)
 *   className — clases extra (posición)
 */
export default function AlertIcon({ title, size = 16, className = '' }) {
  return (
    <Tooltip title={title} arrow>
      <span role="img" aria-label={title} className={`inline-flex shrink-0 cursor-default text-red-500 ${className}`}>
        <ErrorOutlineIcon sx={{ fontSize: size }} />
      </span>
    </Tooltip>
  );
}
