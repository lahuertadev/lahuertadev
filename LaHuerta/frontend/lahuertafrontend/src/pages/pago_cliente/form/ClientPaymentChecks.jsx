import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AmountInput from '../../../components/AmountInput';
import BasicDatePicker from '../../../components/DatePicker';
import CountUp from '../../../components/CountUp';
import RequiredMark from '../../../components/RequiredMark';
import Switch from '../../../components/Switch';
import { formatCurrency } from '../../../utils/currency';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const inputCls = (hasError, disabled) => {
  if (disabled) {
    return 'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted cursor-not-allowed';
  }
  return `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-1 ring-red-400'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;
};

const noSpinnerCls = ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

let nextKey = 1;
export const newClientCheck = () => ({
  key: nextKey++,
  id: null,
  numero: '',
  banco: '',
  importe: '',
  fechaEmision: null,
  diferido: false,
  fechaDeposito: null,
  estado: null,
  endosado: false,
});

// Un cheque del pago tal como viene del backend, para editarlo.
export const clientCheckFromApi = (check) => ({
  key: nextKey++,
  id: check.id,
  numero: check.numero,
  banco: check.banco,
  importe: check.importe,
  fechaEmision: check.fecha_emision,
  diferido: Boolean(check.fecha_deposito),
  fechaDeposito: check.fecha_deposito,
  estado: check.estado,
  endosado: Boolean(check.endosado),
});

// Qué se puede tocar de cada cheque al editar (DEV-155). Uno nuevo se carga entero. Solo se corrige o se
// quita uno en cartera y sin endosar; quitarlo también lo rechaza el backend si alguna vez se usó en un
// pago a proveedor.
export const checkLocks = (entry) => {
  if (!entry.id) return { fields: false, amount: false, removable: true, reason: null };
  if (entry.endosado) {
    return { fields: true, amount: true, removable: false, reason: 'Endosado a un proveedor: no se puede modificar ni quitar.' };
  }
  if (entry.estado !== 'EN_CARTERA') {
    return { fields: true, amount: true, removable: false, reason: 'Ya no está en cartera: no se puede modificar ni quitar.' };
  }
  return { fields: false, amount: false, removable: true, reason: null };
};

export const checksTotal = (entries) => entries.reduce((sum, entry) => sum + (parseFloat(entry.importe) || 0), 0);

/**
 * Cheques de un pago de cliente, como tarjetas que se compactan y expanden (mismo patrón que los cheques
 * de Pagos de Compras). El importe del pago es la suma de los cheques.
 *
 * Props:
 *   entries   — cheques del formulario (newClientCheck / clientCheckFromApi)
 *   onChange  — (entries) => void
 *   banks     — [{ value, name }]
 *   errors    — { [key]: { numero?, banco?, importe?, fechaEmision?, fechaDeposito? } }
 */
const ClientPaymentChecks = ({ entries, onChange, banks, errors = {} }) => {
  const [collapsedKeys, setCollapsedKeys] = useState([]);

  const toggleCollapsed = (key) =>
    setCollapsedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const updateEntry = (key, changes) =>
    onChange(entries.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)));

  const removeEntry = (key) => onChange(entries.filter((entry) => entry.key !== key));

  // Al agregar uno nuevo se compactan los ya cargados, para que la lista no crezca de más.
  const addEntry = () => {
    setCollapsedKeys(entries.map((entry) => entry.key));
    onChange([...entries, newClientCheck()]);
  };

  const bankName = (bankId) => banks.find((bank) => String(bank.value) === String(bankId))?.name;

  return (
    <div className="space-y-3">
      {entries.map((entry, position) => {
        const entryErrors = errors[entry.key] || {};
        const locks = checkLocks(entry);
        // Un cheque endosado o que ya no está en cartera queda compacto y no se abre: así no parece editable.
        const locked = Boolean(locks.reason);
        const collapsed = locked || collapsedKeys.includes(entry.key);
        const canRemove = locks.removable && entries.length > 1;

        return (
          <div key={entry.key} className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
            {/* Encabezado: posición, número y banco, importe y compactar/expandir */}
            <div className={`flex items-center gap-3 px-3 sm:px-4 py-3 bg-surface-low/60 ${collapsed ? '' : 'border-b border-border-subtle'}`}>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                {position + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-on-surface">
                  {entry.numero ? `Cheque N° ${entry.numero}` : 'Cheque nuevo'}
                </p>
                <p className="truncate text-xs text-on-surface-muted">{bankName(entry.banco) || 'Sin banco'}</p>
              </div>

              {locks.reason && (
                <Tooltip title={locks.reason} placement="top" arrow>
                  <LockIcon aria-label={locks.reason} sx={{ fontSize: 18, color: 'var(--color-required)' }} />
                </Tooltip>
              )}

              <span className="flex-shrink-0 font-bold text-on-surface">{formatCurrency(parseFloat(entry.importe) || 0)}</span>

              {!locked && (
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
              )}

              {canRemove && (
                <IconButton size="small" onClick={() => removeEntry(entry.key)} color="error" aria-label="Quitar cheque">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </div>

            <Collapse in={!collapsed} timeout={200}>
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls} htmlFor={`check-number-${entry.key}`}>Número<RequiredMark /></label>
                  <input
                    id={`check-number-${entry.key}`}
                    aria-required="true"
                    type="number"
                    min="1"
                    value={entry.numero}
                    onChange={(e) => updateEntry(entry.key, { numero: e.target.value })}
                    placeholder="Nº de cheque"
                    disabled={locks.fields}
                    className={inputCls(Boolean(entryErrors.numero), locks.fields) + noSpinnerCls}
                  />
                  {entryErrors.numero && <p className="mt-1 text-xs text-red-500">{entryErrors.numero}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls} htmlFor={`check-bank-${entry.key}`}>Banco<RequiredMark /></label>
                  <select
                    id={`check-bank-${entry.key}`}
                    aria-required="true"
                    value={entry.banco}
                    onChange={(e) => updateEntry(entry.key, { banco: e.target.value })}
                    disabled={locks.fields}
                    className={inputCls(Boolean(entryErrors.banco), locks.fields)}
                  >
                    <option value="">Seleccionar...</option>
                    {banks.map((bank) => (
                      <option key={bank.value} value={bank.value}>{bank.name}</option>
                    ))}
                  </select>
                  {entryErrors.banco && <p className="mt-1 text-xs text-red-500">{entryErrors.banco}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls} htmlFor={`check-amount-${entry.key}`}>Importe<RequiredMark /></label>
                  <AmountInput
                    id={`check-amount-${entry.key}`}
                    required
                    value={entry.importe}
                    onChange={(raw) => updateEntry(entry.key, { importe: raw })}
                    hasError={Boolean(entryErrors.importe)}
                    disabled={locks.amount}
                  />
                  {entryErrors.importe && <p className="mt-1 text-xs text-red-500">{entryErrors.importe}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Fecha de emisión<RequiredMark /></label>
                  <BasicDatePicker
                    required
                    value={entry.fechaEmision}
                    onChange={(date) => updateEntry(entry.key, { fechaEmision: date })}
                    hasError={Boolean(entryErrors.fechaEmision)}
                    disabled={locks.fields}
                  />
                  {entryErrors.fechaEmision && <p className="mt-1 text-xs text-red-500">{entryErrors.fechaEmision}</p>}
                </div>
                {/* Interruptor Sí/No con el mismo formato que "¿Se entrega en otra dirección?" de Clientes. */}
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>¿Es un cheque diferido?</label>
                  <div className="flex items-center justify-between h-11 bg-surface-low/50 px-4 rounded-lg">
                    <span className="text-sm font-medium text-on-surface-muted">{entry.diferido ? 'Sí' : 'No'}</span>
                    <Switch
                      checked={entry.diferido}
                      disabled={locks.fields}
                      ariaLabel="Cheque diferido"
                      onChange={(checked) => updateEntry(entry.key, { diferido: checked, ...(checked ? {} : { fechaDeposito: null }) })}
                    />
                  </div>
                </div>
                {entry.diferido && (
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Fecha de depósito<RequiredMark /></label>
                    <BasicDatePicker
                      required
                      value={entry.fechaDeposito}
                      onChange={(date) => updateEntry(entry.key, { fechaDeposito: date })}
                      hasError={Boolean(entryErrors.fechaDeposito)}
                      disabled={locks.fields}
                    />
                    {entryErrors.fechaDeposito && <p className="mt-1 text-xs text-red-500">{entryErrors.fechaDeposito}</p>}
                  </div>
                )}
              </div>
            </Collapse>
          </div>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <button
          type="button"
          onClick={addEntry}
          data-tour="payment-add-check"
          className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
          style={{ background: 'transparent', boxShadow: 'none' }}
        >
          <AddCircleOutlineIcon fontSize="small" /> Agregar cheque
        </button>

        <div className="text-right">
          <span className="text-on-surface-muted text-sm mr-4">TOTAL DEL PAGO</span>
          <CountUp value={checksTotal(entries)} className="text-xl font-bold text-on-surface" />
        </div>
      </div>
    </div>
  );
};

export default ClientPaymentChecks;
