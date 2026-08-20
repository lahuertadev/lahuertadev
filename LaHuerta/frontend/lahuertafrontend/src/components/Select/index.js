import React from 'react';

const selectCls = (hasError, isLocked) =>
  isLocked
    ? 'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted cursor-not-allowed'
    : `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface focus:outline-none focus:ring-2 transition-all ${
        hasError
          ? 'border-red-400 ring-2 ring-red-100'
          : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
      }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

/**
 * BasicSelect — select nativo estilizado con los tokens del proyecto.
 *
 * Props:
 *   label      — texto del label (renderizado arriba)
 *   name       — name del campo
 *   value      — opción seleccionada como objeto { name, value } o ''
 *   options    — array de { name, value }
 *   onChange   — callback con { target: { name, value: opciónCompleta } }
 *   helperText — mensaje de error/ayuda
 *   error      — alias para helperText
 *   disabled   — campo bloqueado (no editable): se ve grisado y con cursor "no permitido",
 *                acorde al tema claro/oscuro
 */
export default function BasicSelect({ label, name, value, options = [], onChange, helperText, error, disabled = false }) {
  const isError = Boolean(error) || Boolean(helperText);

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const selected = options.find((opt) => String(opt.value) === rawValue) ?? null;
    onChange({ target: { name, value: selected } });
  };

  return (
    <div className="w-full">
      {label && <label className={labelCls}>{label}</label>}
      <select
        id={name}
        name={name}
        value={value?.value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        className={selectCls(isError, disabled)}
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.name}
          </option>
        ))}
      </select>
      {(helperText || error) && (
        <p className="mt-1 text-xs text-red-500">{error || helperText}</p>
      )}
    </div>
  );
}
