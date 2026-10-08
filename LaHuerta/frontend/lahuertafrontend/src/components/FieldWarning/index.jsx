import React from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * FieldWarning — aviso en ámbar debajo de un campo (ej. proveedor con compra en la misma
 * fecha, nombre de lista de precios ya existente).
 *
 * Props:
 *   children — texto del aviso
 */
export default function FieldWarning({ children }) {
  return (
    <p className="flex items-center gap-1 mt-1 text-xs font-medium text-amber-500">
      <WarningAmberIcon sx={{ fontSize: 16 }} />
      {children}
    </p>
  );
}
