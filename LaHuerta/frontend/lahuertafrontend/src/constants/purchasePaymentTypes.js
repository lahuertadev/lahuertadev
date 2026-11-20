// Tipos de pago a proveedor según las compras que cubre (DEV-141, DEV-150): un pago que cubre al
// menos una compra es "Pago de compras" (tipo COMPRA) y uno que no cubre ninguna es "Pago a cuenta"
// (tipo A_CUENTA), mismos valores que pago_compra/constants.py. Los dos se cargan con el mismo formulario.
export const PURCHASE_PAYMENT_KINDS = {
  PURCHASE: 'COMPRA',
  ON_ACCOUNT: 'A_CUENTA',
};

export const PURCHASE_PAYMENT_KIND_LABELS = {
  [PURCHASE_PAYMENT_KINDS.PURCHASE]: 'Pago de compras',
  [PURCHASE_PAYMENT_KINDS.ON_ACCOUNT]: 'Pago a cuenta',
};

// Texto que se muestra en lugar de las compras cuando el pago es a cuenta.
export const ON_ACCOUNT_LABEL = 'A cuenta';
// Texto del concepto de un pago que cubre compras: cuántas ("1 compra", "3 compras"). Los números
// de cada compra se ven en el detalle del pago.
export const purchaseCountLabel = (count) => `${count} ${count === 1 ? 'compra' : 'compras'}`;

// Opciones del filtro "Concepto" del listado (parámetro kind del backend).
export const PURCHASE_PAYMENT_CONCEPT_OPTIONS = [
  { name: 'Compras', value: PURCHASE_PAYMENT_KINDS.PURCHASE },
  { name: ON_ACCOUNT_LABEL, value: PURCHASE_PAYMENT_KINDS.ON_ACCOUNT },
];

//* Tipo de un pago según cubra o no compras.
export const purchasePaymentKind = (payment) =>
  payment?.compras?.length ? PURCHASE_PAYMENT_KINDS.PURCHASE : PURCHASE_PAYMENT_KINDS.ON_ACCOUNT;

//* Número de compra con ceros a la izquierda, como en el resto de la app.
export const formatBuyNumber = (id) => String(id).padStart(8, '0');

/**
 * Aviso de un pago con cheques que se cayeron: rechazados (de clientes o emitidos) o anulados
 * (emitidos). Su importe ya se sacó del pago y de sus compras; el cheque queda en el pago como
 * registro. null si el pago no tiene ninguno.
 */
export const droppedChecksNotice = (payment) => {
  const checks = [...(payment?.cheques || []), ...(payment?.cheques_propios || [])];
  const rejected = checks.some((check) => check.estado === 'RECHAZADO');
  const cancelled = (payment?.cheques_propios || []).some((ownCheck) => ownCheck.estado === 'ANULADO');
  if (!rejected && !cancelled) return null;
  const what = rejected && cancelled
    ? 'Este pago tiene cheques rechazados y anulados'
    : `Un cheque de este pago fue ${rejected ? 'rechazado' : 'anulado'}`;
  return `${what}: su importe se descontó del pago y de sus compras (de la más nueva a la más vieja), y se le volvió a deber al proveedor.`;
};

// Estado de un pago a proveedor (DEV-150), mismos valores que PaymentState de pago_compra/constants.py.
// Un pago no se elimina: se anula y queda como registro.
export const PURCHASE_PAYMENT_STATES = {
  CURRENT: 'VIGENTE',
  CANCELLED: 'ANULADO',
};

// Solapas del listado (parámetro estado del backend): Vigentes al entrar, Anulados en rojo.
export const PURCHASE_PAYMENT_STATE_TABS = {
  param: 'estado',
  options: [
    { label: 'Vigentes', value: PURCHASE_PAYMENT_STATES.CURRENT },
    { label: 'Anulados', value: PURCHASE_PAYMENT_STATES.CANCELLED, tone: 'danger' },
  ],
};

export const isCancelledPayment = (payment) => payment?.estado_pago === PURCHASE_PAYMENT_STATES.CANCELLED;

// El pago está vigente pero se le cayó un cheque (rechazado, o anulado si es propio).
export const hasFallenCheck = (payment) => !isCancelledPayment(payment) && Boolean(payment?.fallen_check);
