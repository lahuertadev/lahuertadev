import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * PasswordMatchHint — indica en vivo si "Confirmar contraseña" coincide con la contraseña.
 * No muestra nada hasta que el usuario empieza a escribir en el campo de confirmación.
 *
 * Props:
 *   password      — valor del campo de contraseña original
 *   confirmValue  — valor del campo de confirmación
 */
const PasswordMatchHint = ({ password, confirmValue }) => {
  if (!confirmValue) return null;

  const matches = password === confirmValue;

  return (
    <p
      className={`mt-1.5 flex items-center gap-1.5 text-xs transition-colors ${
        matches ? 'text-green-700' : 'text-red-500'
      }`}
    >
      {matches ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CancelIcon sx={{ fontSize: 14 }} />}
      {matches ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
    </p>
  );
};

export default PasswordMatchHint;
