import React from 'react';
import { ON_ACCOUNT_LABEL, PURCHASE_LABEL } from '../../../constants/purchasePaymentTypes';

// Etiquetas del concepto de un pago a proveedor (DEV-141), con la misma altura que las de tipo de pago.
const badgeCls = 'inline-flex w-fit items-center rounded-md px-2.5 py-0.5 text-xs leading-[18px] font-semibold';

// "A cuenta": se muestra en lugar de la compra en los pagos a proveedor sin compra.
const OnAccountBadge = ({ className = '' }) => (
  <span className={`${badgeCls} bg-accent/15 text-accent ${className}`}>
    {ON_ACCOUNT_LABEL}
  </span>
);

// "Compra": pago de una compra (columna Concepto del listado). Naranja, el opuesto del azul de
// "A cuenta", para que los dos conceptos contrasten; tampoco se cruza con los tipos de pago (verde, azul, violeta).
export const PurchaseBadge = ({ className = '' }) => (
  <span className={`${badgeCls} bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 ${className}`}>
    {PURCHASE_LABEL}
  </span>
);

export default OnAccountBadge;
