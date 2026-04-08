import React, { useState } from 'react';

const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const formatDisplay = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const num = parseFloat(String(raw).replace(',', '.'));
  if (isNaN(num)) return '';
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const AmountInput = ({ name, value, onChange, hasError = false, placeholder = '0,00' }) => {
  const [focused, setFocused] = useState(false);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    onChange(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    if (value !== '' && value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num)) onChange(String(num));
    }
  };

  return (
    <input
      name={name}
      type="text"
      inputMode="decimal"
      value={focused ? (value || '') : formatDisplay(value)}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={inputCls(hasError)}
    />
  );
};

export default AmountInput;
