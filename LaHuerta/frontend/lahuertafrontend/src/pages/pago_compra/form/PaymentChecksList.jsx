import React from 'react';
import CardListFooter from '../../../components/CardListFooter';
import CollapsibleCard, { useCollapsedKeys } from '../../../components/CollapsibleCard';
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
export const newCheckEntry = () => ({ key: nextKey++, id: '' });

// Importe que aporta cada cheque al pago: el cheque entero, sea de cliente o emitido (DEV-150).
export const entryAmount = (entry, options) => {
  const option = options.find((opt) => String(opt.value) === String(entry.id));
  return option ? parseFloat(option.importe) || 0 : 0;
};

/**
 * Cheques de un pago a proveedor, como tarjetas que se compactan y expanden (mismo patrón que
 * la carga masiva de compras). Cada tarjeta elige un cheque; los ya elegidos no se ofrecen en
 * las demás.
 *
 * Props:
 *   entries     — [{ key, id }]
 *   onChange    — (entries) => void
 *   options     — [{ value, name, numero, banco, importe }]; cada cheque se usa entero
 *   errors      — { [key]: { id? } }
 *   emptyText   — aviso cuando no hay cheques para elegir
 */
const PaymentChecksList = ({ entries, onChange, options, errors = {}, emptyText }) => {
  const { isCollapsed, toggle, collapseOnly } = useCollapsedKeys();

  const updateEntry = (key, changes) =>
    onChange(entries.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)));

  const selectCheck = (key, id) => updateEntry(key, { id });

  const removeEntry = (key) => onChange(entries.filter((entry) => entry.key !== key));

  // Al agregar uno nuevo se compactan los ya completos, para que la lista no crezca de más.
  const addEntry = () => {
    collapseOnly(entries.filter((entry) => entry.id).map((entry) => entry.key));
    onChange([...entries, newCheckEntry()]);
  };

  const total = entries.reduce((sum, entry) => sum + entryAmount(entry, options), 0);
  const chosenIds = entries.map((entry) => String(entry.id)).filter(Boolean);

  if (options.length === 0) {
    return <p className="text-sm text-on-surface-muted">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, position) => {
        const option = options.find((opt) => String(opt.value) === String(entry.id));
        const entryErrors = errors[entry.key] || {};
        const available = options.filter(
          (opt) => String(opt.value) === String(entry.id) || !chosenIds.includes(String(opt.value))
        );

        return (
          <CollapsibleCard
            key={entry.key}
            position={position + 1}
            title={option && `Cheque N° ${option.numero}`}
            subtitle={option?.banco}
            placeholder="Elegí un cheque"
            amount={formatCurrency(entryAmount(entry, options))}
            itemLabel="cheque"
            collapsed={isCollapsed(entry.key)}
            onToggle={() => toggle(entry.key)}
            onRemove={entries.length > 1 ? () => removeEntry(entry.key) : undefined}
          >
            <div className="p-3 sm:p-4 grid grid-cols-1 gap-4">
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
            </div>
          </CollapsibleCard>
        );
      })}

      <CardListFooter
        addLabel="Agregar cheque"
        onAdd={entries.length < options.length ? addEntry : undefined}
        addDataTour="payment-add-check"
        totalLabel="TOTAL DEL PAGO"
        total={total}
      />
    </div>
  );
};

export default PaymentChecksList;
