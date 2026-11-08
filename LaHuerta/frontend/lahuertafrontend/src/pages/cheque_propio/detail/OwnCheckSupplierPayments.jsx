import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import OnAccountBadge from '../../pago_compra/shared/OnAccountBadge';
import {
  PURCHASE_PAYMENT_KINDS,
  PURCHASE_PAYMENT_KIND_CONFIG,
  formatBuyNumber,
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

const PaymentBuy = ({ payment }) => (
  payment.compra ? <BuyLink buy={payment.compra} /> : <OnAccountBadge />
);

const kindLabel = (payment) =>
  PURCHASE_PAYMENT_KIND_CONFIG[payment.tipo]?.label
  || PURCHASE_PAYMENT_KIND_CONFIG[PURCHASE_PAYMENT_KINDS.ON_ACCOUNT].label;

// Proveedor al que se entregó el cheque y los pagos (de compras y a cuenta) que se hicieron con él (DEV-141).
const OwnCheckSupplierPayments = ({ check }) => {
  const navigate = useNavigate();
  const payments = check.payments || [];

  if (!check.supplier) {
    return (
      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
        <span className="text-sm text-on-surface-muted">Todavía no se encuentra asociado a ningún pago.</span>
      </div>
    );
  }

  const openPayment = (payment) => navigate(`/purchase-payment/detail/${payment.id}`);

  return (
    <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Proveedor</span>
          <span className="text-sm text-on-surface">
            {check.supplier.puesto ? `${check.supplier.puesto} · ` : ''}{check.supplier.nombre}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Usado</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(check.used_amount)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Saldo sin usar</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(check.remaining_balance)}</span>
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
                <th className="px-4 py-2 text-center font-semibold">Compra</th>
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
                  <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(payment.importe_abonado)}</td>
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
                <span className="text-sm font-semibold text-on-surface">{formatCurrency(payment.importe_abonado)}</span>
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
