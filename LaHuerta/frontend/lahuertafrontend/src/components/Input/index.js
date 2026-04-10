import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
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
 *   helperText     — mensaje de error externo (ej. desde Formik)
 *   regex          — RegExp para validación interna
 *   regexErrorText — mensaje si falla regex (default: 'Formato inválido')
 *   multiline      — renderiza <textarea> en lugar de <input>
 *   autoComplete   — atributo autocomplete
 *   showToggle     — muestra botón ojo para revelar/ocultar contraseña (solo type="password")
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
  regex,
  regexErrorText = 'Formato inválido',
  multiline = false,
  autoComplete,
  showToggle = false,
  className = '',
  // Props MUI heredados — absorbidos para no pasarlos al DOM
  variant,
  width,
  height,
  ...props
}) => {
  const [regexError, setRegexError] = useState('');
  const [visible, setVisible] = useState(false);

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

  const resolvedType = type === 'password' && showToggle ? (visible ? 'text' : 'password') : type;

  const fieldProps = {
    id: `${name}-input`,
    name,
    value: value ?? '',
    onChange: handleChange,
    maxLength,
    required,
    autoComplete,
    type: resolvedType,
    className: `${inputCls(isError)}${showToggle && type === 'password' ? ' pr-10' : ''}${className ? ` ${className}` : ''}`,
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
      ) : (
        <div className="relative">
          <input {...fieldProps} />
          {showToggle && type === 'password' && (
            <button
              type="button"
              tabIndex={-1}
              className="focus:outline-none transition-transform hover:scale-110 hover:text-gray-600"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#9ca3af',
              }}
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          )}
        </div>
      )}
      {errorMsg && <p className="mt-1 text-xs text-red-500">{errorMsg}</p>}
    </div>
  );
};

export default CustomInput;
