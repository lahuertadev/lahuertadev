import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import OnAccountBadge, { CancelledBadge } from '../../pago_compra/shared/OnAccountBadge';
import {
  PURCHASE_PAYMENT_KINDS,
  PURCHASE_PAYMENT_KIND_LABELS,
  formatBuyNumber,
  isCancelledPayment,
} from '../../../constants/purchasePaymentTypes';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const BuyLink = ({ buy }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigate(`/buy/detail/${buy.id}`); }}
      className="text-sm text-blue-lahuerta hover:underline font-medium"
    >
      N° {formatBuyNumber(buy.id)}
    </button>
  );
};

// Compras que cubre el pago (puede ser más de una), o "A cuenta" si no cubre ninguna.
const PaymentBuy = ({ payment }) => (
  payment.compras?.length
    ? (
      <span className="inline-flex flex-wrap justify-center gap-x-2 gap-y-1">
        {payment.compras.map((buy) => <BuyLink key={buy.id} buy={buy} />)}
      </span>
    )
    : <OnAccountBadge />
);

// Importe del pago; uno anulado se muestra tachado con la etiqueta "Anulado" (no ocupa el cheque).
const PaymentAmount = ({ payment, className = '' }) => (
  <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
    <span className={isCancelledPayment(payment) ? 'line-through text-on-surface-muted' : 'text-on-surface'}>
      {formatCurrency(payment.importe_abonado)}
    </span>
    {isCancelledPayment(payment) && <CancelledBadge />}
  </span>
);

const kindLabel = (payment) =>
  PURCHASE_PAYMENT_KIND_LABELS[payment.tipo] || PURCHASE_PAYMENT_KIND_LABELS[PURCHASE_PAYMENT_KINDS.ON_ACCOUNT];

// Proveedor al que se entregó el cheque y los pagos (de compras y a cuenta) que se hicieron con él (DEV-141).
// Los pagos anulados se listan como registro; si todos lo están, el cheque queda sin proveedor (DEV-150).
const OwnCheckSupplierPayments = ({ check }) => {
  const navigate = useNavigate();
  const payments = check.payments || [];

  if (!check.supplier && payments.length === 0) {
    return (
      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
        <span className="text-sm text-on-surface-muted">Todavía no se encuentra asociado a ningún pago.</span>
      </div>
    );
  }

  const openPayment = (payment) => navigate(`/purchase-payment/detail/${payment.id}`);

  return (
    <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Proveedor</span>
          <span className="text-sm text-on-surface">
            {check.supplier
              ? `${check.supplier.puesto ? `${check.supplier.puesto} · ` : ''}${check.supplier.nombre}`
              : 'Ninguno: sus pagos están anulados'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelCls}>Pagos</span>

        {/* Desktop: tabla */}
        <div className="hidden sm:block overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="bg-surface-low text-on-surface-muted">
              <tr>
                <th className="px-4 py-2 text-center font-semibold">Fecha</th>
                <th className="px-4 py-2 text-center font-semibold">Tipo</th>
                <th className="px-4 py-2 text-center font-semibold">Compras</th>
                <th className="px-4 py-2 text-right font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  onClick={() => openPayment(payment)}
                  className="border-t border-border-subtle text-on-surface cursor-pointer hover:bg-surface-low transition-colors"
                >
                  <td className="px-4 py-2.5 text-center">{formatDate(payment.fecha_pago)}</td>
                  <td className="px-4 py-2.5 text-center">{kindLabel(payment)}</td>
                  <td className="px-4 py-2.5 text-center"><PaymentBuy payment={payment} /></td>
                  <td className="px-4 py-2.5 text-right"><PaymentAmount payment={payment} className="justify-end" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: tarjetas */}
        <div className="sm:hidden space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              role="button"
              tabIndex={0}
              onClick={() => openPayment(payment)}
              onKeyDown={(e) => { if (e.key === 'Enter') openPayment(payment); }}
              className="rounded-lg border border-border-subtle p-4 space-y-2 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-on-surface">{kindLabel(payment)}</span>
                <PaymentAmount payment={payment} className="text-sm" />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-on-surface-muted">
                <span>{formatDate(payment.fecha_pago)}</span>
                <PaymentBuy payment={payment} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnCheckSupplierPayments;
