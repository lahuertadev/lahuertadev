import React, { useState } from 'react';

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
  className = '',
  // Props MUI heredados — absorbidos para no pasarlos al DOM
  variant,
  width,
  height,
  ...props
}) => {
  const [regexError, setRegexError] = useState('');

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

  const fieldProps = {
    id: `${name}-input`,
    name,
    value: value ?? '',
    onChange: handleChange,
    maxLength,
    required,
    autoComplete,
    className: `${inputCls(isError)}${className ? ` ${className}` : ''}`,
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
        <input type={type} {...fieldProps} />
      )}
      {errorMsg && <p className="mt-1 text-xs text-red-500">{errorMsg}</p>}
    </div>
  );
};

export default CustomInput;
