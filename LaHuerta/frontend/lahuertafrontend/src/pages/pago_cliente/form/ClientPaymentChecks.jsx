import React from 'react';
import AmountInput from '../../../components/AmountInput';
import BasicDatePicker from '../../../components/DatePicker';
import CardListFooter from '../../../components/CardListFooter';
import CollapsibleCard, { useCollapsedKeys } from '../../../components/CollapsibleCard';
import LockedIcon from '../../../components/LockedIcon';
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
  const { isCollapsed, toggle, collapseOnly } = useCollapsedKeys();

  const updateEntry = (key, changes) =>
    onChange(entries.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)));

  const removeEntry = (key) => onChange(entries.filter((entry) => entry.key !== key));

  // Al agregar uno nuevo se compactan los ya cargados, para que la lista no crezca de más.
  const addEntry = () => {
    collapseOnly(entries.map((entry) => entry.key));
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

        return (
          <CollapsibleCard
            key={entry.key}
            position={position + 1}
            title={entry.numero ? `Cheque N° ${entry.numero}` : 'Cheque nuevo'}
            subtitle={bankName(entry.banco) || 'Sin banco'}
            amount={formatCurrency(parseFloat(entry.importe) || 0)}
            adornment={locked && <LockedIcon title={locks.reason} />}
            itemLabel="cheque"
            collapsed={locked || isCollapsed(entry.key)}
            onToggle={locked ? undefined : () => toggle(entry.key)}
            onRemove={locks.removable && entries.length > 1 ? () => removeEntry(entry.key) : undefined}
          >
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
          </CollapsibleCard>
        );
      })}

      <CardListFooter
        addLabel="Agregar cheque"
        onAdd={addEntry}
        addDataTour="payment-add-check"
        totalLabel="TOTAL DEL PAGO"
        total={checksTotal(entries)}
      />
    </div>
  );
};

export default ClientPaymentChecks;
