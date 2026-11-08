// Tipos de pago a proveedor (DEV-141). El backend los distingue por la compra: un pago con compra
// es "Pago de compras" (tipo COMPRA) y uno sin compra es "Pago a cuenta" (tipo A_CUENTA), mismos
// valores que pago_compra/constants.py.
export const PURCHASE_PAYMENT_KINDS = {
  PURCHASE: 'COMPRA',
  ON_ACCOUNT: 'A_CUENTA',
};

export const PURCHASE_PAYMENT_KIND_CONFIG = {
  [PURCHASE_PAYMENT_KINDS.PURCHASE]: {
    label: 'Pago de compras',
    title: 'Pago de compras',
    description: 'Para pagar una o más compras cargadas en el sistema. El pago se descuenta de la cuenta corriente del proveedor y la compra pasa a parcial o abonada.',
    subtitle: 'Elegí la compra que vas a pagar y cómo la pagás.',
    path: 'purchase',
    icon: 'purchasePayment',
  },
  [PURCHASE_PAYMENT_KINDS.ON_ACCOUNT]: {
    label: 'Pago a cuenta',
    title: 'Pago a cuenta',
    description: 'Para pagar parte del saldo del proveedor sin asociarlo a una compra. Por ejemplo, el saldo inicial de un proveedor recién cargado, cuyas compras anteriores no están en el sistema. Se descuenta de la cuenta corriente.',
    subtitle: 'Un pago sobre el saldo del proveedor, sin compra asociada: saldo inicial, adelantos o pagos que no corresponden a una factura puntual.',
    path: 'on-account',
    icon: 'onAccountPayment',
  },
};

// Texto que se muestra en lugar de la compra cuando el pago es a cuenta.
export const ON_ACCOUNT_LABEL = 'A cuenta';
// Texto del concepto de un pago de compras en el listado.
export const PURCHASE_LABEL = 'Compra';

// Opciones del filtro "Concepto" del listado (parámetro kind del backend).
export const PURCHASE_PAYMENT_CONCEPT_OPTIONS = [
  { name: PURCHASE_LABEL, value: PURCHASE_PAYMENT_KINDS.PURCHASE },
  { name: ON_ACCOUNT_LABEL, value: PURCHASE_PAYMENT_KINDS.ON_ACCOUNT },
];

//* Tipo de un pago según tenga o no compra.
export const purchasePaymentKind = (payment) =>
  payment?.compra ? PURCHASE_PAYMENT_KINDS.PURCHASE : PURCHASE_PAYMENT_KINDS.ON_ACCOUNT;

//* Número de compra con ceros a la izquierda, como en el resto de la app.
export const formatBuyNumber = (id) => String(id).padStart(8, '0');
