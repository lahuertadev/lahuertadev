import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CountUp from '../../../components/CountUp';
import AmountInput from '../../../components/AmountInput';
import RequiredMark from '../../../components/RequiredMark';
import { formatCurrency } from '../../../utils/currency';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const selectCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

let nextKey = 1;
export const newCheckEntry = () => ({ key: nextKey++, id: '', amount: '' });

// Importe que aporta cada cheque al pago: el de cliente entero, el emitido lo que se indique.
export const entryAmount = (entry, options, withAmount) => {
  if (withAmount) return parseFloat(entry.amount) || 0;
  const option = options.find((opt) => String(opt.value) === String(entry.id));
  return option ? parseFloat(option.importe) || 0 : 0;
};

/**
 * Cheques de un pago a proveedor, como tarjetas que se compactan y expanden (mismo patrón que
 * la carga masiva de compras). Cada tarjeta elige un cheque; los ya elegidos no se ofrecen en
 * las demás.
 *
 * Props:
 *   entries     — [{ key, id, amount }]
 *   onChange    — (entries) => void
 *   options     — [{ value, name, numero, banco, importe }]; importe = lo disponible del cheque
 *   withAmount  — true para cheques emitidos: cada uno con su importe (por defecto, su saldo)
 *   errors      — { [key]: { id?, amount? } }
 *   emptyText   — aviso cuando no hay cheques para elegir
 */
const PaymentChecksList = ({ entries, onChange, options, withAmount = false, errors = {}, emptyText }) => {
  const [collapsedKeys, setCollapsedKeys] = useState([]);

  const toggleCollapsed = (key) =>
    setCollapsedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const updateEntry = (key, changes) =>
    onChange(entries.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)));

  const selectCheck = (key, id) => {
    const option = options.find((opt) => String(opt.value) === String(id));
    updateEntry(key, { id, amount: withAmount && option ? String(option.importe) : '' });
  };

  const removeEntry = (key) => onChange(entries.filter((entry) => entry.key !== key));

  // Al agregar uno nuevo se compactan los ya completos, para que la lista no crezca de más.
  const addEntry = () => {
    setCollapsedKeys(entries.filter((entry) => entry.id).map((entry) => entry.key));
    onChange([...entries, newCheckEntry()]);
  };

  const total = entries.reduce((sum, entry) => sum + entryAmount(entry, options, withAmount), 0);
  const chosenIds = entries.map((entry) => String(entry.id)).filter(Boolean);

  if (options.length === 0) {
    return <p className="text-sm text-on-surface-muted">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, position) => {
        const option = options.find((opt) => String(opt.value) === String(entry.id));
        const collapsed = collapsedKeys.includes(entry.key);
        const entryErrors = errors[entry.key] || {};
        const available = options.filter(
          (opt) => String(opt.value) === String(entry.id) || !chosenIds.includes(String(opt.value))
        );

        return (
          <div key={entry.key} className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
            {/* Encabezado: número, cheque elegido, importe y compactar/expandir */}
            <div className={`flex items-center gap-3 px-3 sm:px-4 py-3 bg-surface-low/60 ${collapsed ? '' : 'border-b border-border-subtle'}`}>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                {position + 1}
              </span>

              <div className="min-w-0 flex-1">
                {option ? (
                  <>
                    <p className="truncate font-semibold text-on-surface">Cheque N° {option.numero}</p>
                    <p className="truncate text-xs text-on-surface-muted">{option.banco}</p>
                  </>
                ) : (
                  <p className="text-sm text-on-surface-muted">Elegí un cheque</p>
                )}
              </div>

              <span className="flex-shrink-0 font-bold text-on-surface">
                {formatCurrency(entryAmount(entry, options, withAmount))}
              </span>

              <IconButton
                size="small"
                onClick={() => toggleCollapsed(entry.key)}
                aria-label={collapsed ? 'Expandir cheque' : 'Compactar cheque'}
                aria-expanded={!collapsed}
                sx={{ color: 'var(--color-on-surface-muted)' }}
              >
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{ transition: 'transform 200ms', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
                />
              </IconButton>

              {entries.length > 1 && (
                <IconButton size="small" onClick={() => removeEntry(entry.key)} color="error" aria-label="Quitar cheque">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </div>

            <Collapse in={!collapsed} timeout={200}>
              <div className={`p-3 sm:p-4 grid grid-cols-1 gap-4 ${withAmount ? 'md:grid-cols-2' : ''}`}>
                <div className="flex flex-col gap-1">
                  <label className={labelCls} htmlFor={`check-${entry.key}`}>Cheque<RequiredMark /></label>
                  <select
                    id={`check-${entry.key}`}
                    value={entry.id}
                    onChange={(e) => selectCheck(entry.key, e.target.value)}
                    className={selectCls(Boolean(entryErrors.id))}
                    aria-required="true"
                  >
                    <option value="">Seleccionar cheque...</option>
                    {available.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                  {entryErrors.id && <p className="mt-1 text-xs text-red-500">{entryErrors.id}</p>}
                </div>

                {withAmount && (
                  <div className="flex flex-col gap-1">
                    <label className={labelCls} htmlFor={`check-amount-${entry.key}`}>Importe a usar<RequiredMark /></label>
                    <AmountInput
                      name={`check-amount-${entry.key}`}
                      value={entry.amount}
                      onChange={(raw) => updateEntry(entry.key, { amount: raw })}
                      hasError={Boolean(entryErrors.amount)}
                      disabled={!entry.id}
                    />
                    {entryErrors.amount ? (
                      <p className="mt-1 text-xs text-red-500">{entryErrors.amount}</p>
                    ) : option && (
                      <p className="mt-1 text-xs text-on-surface-muted">Saldo disponible: {formatCurrency(option.importe)}</p>
                    )}
                  </div>
                )}
              </div>
            </Collapse>
          </div>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        {entries.length < options.length ? (
          <button
            type="button"
            onClick={addEntry}
            data-tour="payment-add-check"
            className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
            style={{ background: 'transparent', boxShadow: 'none' }}
          >
            <AddCircleOutlineIcon fontSize="small" /> Agregar cheque
          </button>
        ) : <span />}

        <div className="text-right">
          <span className="text-on-surface-muted text-sm mr-4">TOTAL DEL PAGO</span>
          <CountUp value={total} className="text-xl font-bold text-on-surface" />
        </div>
      </div>
    </div>
  );
};

export default PaymentChecksList;
