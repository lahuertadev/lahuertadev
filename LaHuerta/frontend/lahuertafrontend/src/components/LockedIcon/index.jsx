import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

/**
 * LockedIcon — algo que no se puede modificar: candado rojo con el motivo al pasar el mouse
 * (ej. un cheque endosado o depositado al editar un pago de cliente). Mismo formato que AlertIcon.
 *
 * Props:
 *   title     — por qué está bloqueado (tooltip y texto para lectores de pantalla)
 *   size      — tamaño del ícono en px (default 18)
 *   className — clases extra (posición)
 */
export default function LockedIcon({ title, size = 18, className = '' }) {
  return (
    <Tooltip title={title} placement="top" arrow>
      <span role="img" aria-label={title} className={`inline-flex shrink-0 cursor-default text-required ${className}`}>
        <LockOutlinedIcon sx={{ fontSize: size }} />
      </span>
    </Tooltip>
  );
}
