import React, { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AmountInput from '../../../components/AmountInput';
import RoundedCheckbox from '../../../components/RoundedCheckbox';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { formatBuyNumber } from '../../../constants/purchasePaymentTypes';
import { allocationErrors, distributeAmount, onAccountAmount, totalApplied } from './allocation';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider';

// Ayuda de la sección de compras: va en el ícono de información junto a su título.
export const ALLOCATION_HELP_TEXT =
  'Tildá las compras que pagás. El importe se reparte de la más vieja a la más nueva y podés corregir '
  + 'cuánto va a cada una. Lo que no se aplica a ninguna compra queda a cuenta.';

const NOT_REACHED_TEXT = 'El importe del pago no alcanza para esta compra.';

const SummaryItem = ({ label, value, highlight = false }) => (
  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
    <span className={labelCls}>{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-accent' : 'text-on-surface'}`}>{formatCurrency(value)}</span>
  </div>
);

/**
 * Compras que cubre un pago a proveedor (DEV-150), dentro de un formulario Formik con los valores
 * selectedBuys (ids tildados) y allocations ({ id: importe aplicado }).
 *
 * Al tildar o destildar una compra, o al cambiar el importe del pago, el importe se reparte solo
 * de la compra más vieja a la más nueva; después se puede corregir lo de cada una. Lo que no se
 * aplica a ninguna compra queda a cuenta.
 *
 * Props:
 *   buys          — [{ id, fecha, importe, available }]; available: lo que se le puede aplicar
 *   paymentAmount — importe del pago (escrito o suma de los cheques)
 *   keepInitial   — true en la edición: no reparte al abrir, para mostrar lo que el pago ya tenía
 *   showErrors    — mostrar los errores del reparto (después del primer intento de guardar)
 */
const PurchaseAllocationList = ({ buys, paymentAmount, keepInitial = false, showErrors = false }) => {
  const { values, setFieldValue } = useFormikContext();
  const firstRun = useRef(true);
  const selectedIds = values.selectedBuys.map(String);

  // Al cambiar el importe del pago se vuelve a repartir entre las compras tildadas.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (keepInitial) return;
    }
    setFieldValue('allocations', distributeAmount(buys, values.selectedBuys, paymentAmount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentAmount]);

  const toggleBuy = (buyId) => {
    const id = String(buyId);
    const next = selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id];
    setFieldValue('selectedBuys', next);
    setFieldValue('allocations', distributeAmount(buys, next, paymentAmount));
  };

  const changeAllocation = (buyId, value) =>
    setFieldValue('allocations', { ...values.allocations, [buyId]: value });

  const errors = allocationErrors(buys, values.allocations, paymentAmount);

  if (buys.length === 0) {
    return (
      <p className="text-sm text-on-surface-muted">
        El proveedor no tiene compras pendientes: el pago queda a cuenta de su saldo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {buys.map((buy) => {
          const selected = selectedIds.includes(String(buy.id));
          const applied = values.allocations[buy.id];
          const rowError = showErrors ? errors.rows[buy.id] : null;
          const notReached = selected && !rowError && !(parseFloat(applied) > 0);
          return (
            <li
              key={buy.id}
              data-testid={`allocation-buy-${buy.id}`}
              className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 ${selected ? 'bg-accent/5' : ''}`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2 min-w-0">
                <RoundedCheckbox
                  checked={selected}
                  onChange={() => toggleBuy(buy.id)}
                  inputProps={{ 'aria-label': `Compra N° ${formatBuyNumber(buy.id)}` }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-on-surface">
                    Compra N° {formatBuyNumber(buy.id)} · {formatDate(buy.fecha)}
                  </span>
                  <span className="block text-xs text-on-surface-muted">
                    Importe {formatCurrency(buy.importe)} · Saldo {formatCurrency(buy.available)}
                  </span>
                </span>
              </label>
              {selected && (
                <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
                  {/* El aviso va en el ícono, así el campo queda alineado con la compra. */}
                  {notReached && (
                    <Tooltip title={NOT_REACHED_TEXT} placement="top" arrow>
                      <InfoOutlinedIcon
                        aria-label={NOT_REACHED_TEXT}
                        sx={{ fontSize: 18, color: 'var(--color-on-surface-muted)', cursor: 'help', '&:hover': { color: 'var(--color-accent)' } }}
                      />
                    </Tooltip>
                  )}
                  <div className="w-full sm:w-44">
                    <AmountInput
                      name={`allocation-${buy.id}`}
                      value={applied ?? ''}
                      onChange={(raw) => changeAllocation(buy.id, raw)}
                      hasError={Boolean(rowError)}
                    />
                    {rowError && <p className="mt-1 text-xs text-red-500">{rowError}</p>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-1 gap-2 rounded-lg bg-surface-low p-3 sm:grid-cols-3 sm:gap-4">
        <SummaryItem label="Importe del pago" value={paymentAmount || 0} />
        <SummaryItem label="Aplicado a compras" value={totalApplied(values.allocations)} />
        <SummaryItem label="Queda a cuenta" value={onAccountAmount(values.allocations, paymentAmount)} highlight />
      </div>
      {showErrors && errors.total && <p className="text-xs text-red-500">{errors.total}</p>}
    </div>
  );
};

export default PurchaseAllocationList;
