import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// Mismas reglas que backend/autenticacion/utils.py::validate_password_strength
const RULES = [
  { label: 'Mínimo 8 caracteres', test: (v) => v.length >= 8 },
  { label: 'Al menos 1 mayúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Al menos 1 número', test: (v) => /[0-9]/.test(v) },
  { label: 'Al menos 1 carácter especial', test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

/**
 * PasswordRequirements — checklist en vivo de los requisitos de contraseña.
 * Se tilda en verde cada regla a medida que el valor la cumple.
 *
 * Props:
 *   value — el valor actual del campo de contraseña
 */
const PasswordRequirements = ({ value = '' }) => (
  <ul className="mt-1.5 space-y-1">
    {RULES.map((rule) => {
      const met = rule.test(value);
      return (
        <li
          key={rule.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            met ? 'text-green-700' : 'text-on-surface-muted'
          }`}
        >
          {met ? (
            <CheckCircleIcon sx={{ fontSize: 14 }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />
          )}
          {rule.label}
        </li>
      );
    })}
  </ul>
);

export default PasswordRequirements;
