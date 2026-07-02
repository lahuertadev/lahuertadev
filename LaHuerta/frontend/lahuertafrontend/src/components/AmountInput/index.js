import React from 'react';

const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

// Formatea para mostrar: separa miles con punto, decimal con coma.
// Solo muestra los decimales que el usuario haya escrito (sin forzar ",00").
const formatDisplay = (raw, allowNegative = false) => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const str = String(raw);
  const isNegative = allowNegative && str.startsWith('-');
  const absStr = isNegative ? str.slice(1) : str;
  const parts = absStr.split('.');
  const intPart = parts[0];
  if (intPart === '' && parts.length === 1) return isNegative ? '-' : '';
  const intNum = parseInt(intPart || '0', 10);
  if (isNaN(intNum)) return '';
  const intFormatted = intNum.toLocaleString('es-AR'); // usa punto como separador de miles
  const formatted = parts.length > 1 ? `${intFormatted},${parts[1]}` : intFormatted;
  return isNegative ? `-${formatted}` : formatted;
};

const AmountInput = ({ name, value, onChange, hasError = false, placeholder = '0,00', allowNegative = false }) => {

  const handleChange = (e) => {
    const input = e.target.value;
    // Los puntos en el display son separadores de miles → los quitamos
    const noThousands = input.replace(/\./g, '');
    // La coma es el separador decimal en es-AR → la convertimos a punto para almacenar
    const normalized = noThousands.replace(',', '.');
    if (allowNegative) {
      const isNegative = normalized.startsWith('-');
      const absRaw = (isNegative ? normalized.slice(1) : normalized)
        .replace(/[^0-9.]/g, '')
        .replace(/(\..*)\./g, '$1');
      onChange(isNegative ? `-${absRaw}` : absRaw);
    } else {
      const raw = normalized
        .replace(/[^0-9.]/g, '')
        .replace(/(\..*)\./g, '$1');
      onChange(raw);
    }
  };

  const handleBlur = () => {
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
      value={formatDisplay(value, allowNegative)}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={inputCls(hasError)}
    />
  );
};

export default AmountInput;
