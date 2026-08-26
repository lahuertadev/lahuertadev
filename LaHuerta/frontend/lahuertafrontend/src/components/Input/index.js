import React, { useState } from 'react';
import Visibility from '@mui/icons-material/VisibilityOutlined';
import VisibilityOff from '@mui/icons-material/VisibilityOffOutlined';

const inputCls = (hasError, isPassword, isLocked) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm placeholder:text-gray-400 focus:outline-none transition-all ${
    isPassword ? 'pr-10' : ''
  } ${
    isLocked
      ? 'bg-field-locked border-field-locked-border text-on-surface-muted select-none cursor-not-allowed'
      : `bg-surface-low text-on-surface focus:ring-2 ${
          hasError
            ? 'border-red-400 ring-2 ring-red-100'
            : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
        }`
  }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

/**
 * CustomInput — input nativo estilizado con los tokens del proyecto.
 *
 * Props:
 *   label          — texto del label (renderizado arriba)
 *   name           — name del campo
 *   value          — valor actual
 *   onChange       — handler estándar de cambio
 *   type           — tipo de input (default: 'text')
 *   maxLength      — longitud máxima (default: 255)
 *   required       — campo requerido
 *   helperText     — mensaje de error externo (ej. desde Formik). Si tiene contenido, el campo se marca en rojo.
 *   hint           — texto de ayuda neutro (gris), se muestra solo cuando no hay error activo
 *   regex          — RegExp para validación interna
 *   regexErrorText — mensaje si falla regex (default: 'Formato inválido')
 *   multiline      — renderiza <textarea> en lugar de <input>
 *   autoComplete   — atributo autocomplete
 *   readOnly       — campo bloqueado (no editable): se ve grisado y con cursor "no permitido",
 *                     acorde al tema claro/oscuro, sin necesidad de estilos por afuera
 *   className      — clases adicionales
 */
const CustomInput = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  maxLength = 255,
  required = false,
  helperText = '',
  hint = '',
  regex,
  regexErrorText = 'Formato inválido',
  multiline = false,
  autoComplete,
  readOnly = false,
  disabled = false,
  className = '',
  // Props MUI heredados — absorbidos para no pasarlos al DOM
  variant,
  width,
  height,
  ...props
}) => {
  const [regexError, setRegexError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (regex instanceof RegExp) {
      setRegexError(regex.test(newValue) ? '' : regexErrorText);
    } else {
      setRegexError('');
    }
    onChange(e);
  };

  const errorMsg = regexError || helperText;
  const isError = Boolean(errorMsg);
  const isPassword = type === 'password';
  const isLocked = readOnly || disabled;

  const fieldProps = {
    id: `${name}-input`,
    name,
    value: value ?? '',
    onChange: handleChange,
    maxLength,
    required,
    autoComplete,
    readOnly,
    disabled,
    className: `${inputCls(isError, isPassword, isLocked)}${className ? ` ${className}` : ''}`,
    ...props,
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={`${name}-input`} className={labelCls}>
          {label}
        </label>
      )}
      {multiline ? (
        <textarea rows={3} {...fieldProps} />
      ) : isPassword ? (
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} {...fieldProps} />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-on-surface-muted transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
          </button>
        </div>
      ) : (
        <input type={type} {...fieldProps} />
      )}
      {errorMsg ? (
        <p className="mt-1 text-xs text-red-500">{errorMsg}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-on-surface-muted">{hint}</p>
      ) : null}
    </div>
  );
};

export default CustomInput;
