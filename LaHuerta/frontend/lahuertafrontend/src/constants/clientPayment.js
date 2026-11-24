import { formatCurrency } from '../utils/currency';

// Estado de un pago de cliente (DEV-155), mismos valores que PaymentState de pago_cliente/constants.py.
// Un pago no se elimina: se anula, con un motivo, y queda como registro.
export const CLIENT_PAYMENT_STATES = {
  CURRENT: 'VIGENTE',
  CANCELLED: 'ANULADO',
};

// Solapas del listado (parámetro state del backend): Vigentes al entrar, Anulados en rojo.
export const CLIENT_PAYMENT_STATE_TABS = {
  param: 'state',
  options: [
    { label: 'Vigentes', value: CLIENT_PAYMENT_STATES.CURRENT },
    { label: 'Anulados', value: CLIENT_PAYMENT_STATES.CANCELLED, tone: 'danger' },
  ],
};

export const isCancelledClientPayment = (payment) => payment?.estado_pago === CLIENT_PAYMENT_STATES.CANCELLED;

// Tipo de pago con cheques (catálogo tipo_pago, registro del sistema).
export const CHECK_PAYMENT_TYPE = 'Cheque';

/**
 * Aviso de un pago vigente con cheques rechazados: su importe ya se descontó del pago y se le volvió
 * a sumar a la deuda del cliente. Si se rechazan todos, el pago se anula solo. null si no tiene ninguno.
 */
export const rejectedChecksNotice = (payment) => {
  if (isCancelledClientPayment(payment)) return null;
  const rejected = (payment?.cheques || []).filter((check) => check.estado === 'RECHAZADO');
  if (!rejected.length) return null;
  const numbers = rejected.map((check) => `N° ${check.numero}`).join(', ');
  return `${rejected.length > 1 ? 'Los cheques' : 'El cheque'} ${numbers} ${rejected.length > 1 ? 'fueron rechazados' : 'fue rechazado'}: `
    + 'su importe se descontó del pago y volvió a la cuenta corriente del cliente.';
};

/**
 * Aviso del importe cuando no incluye cheques rechazados (su importe ya volvió a la cuenta corriente).
 * Un pago que se anuló solo porque se rechazaron todos sus cheques muestra el importe original: sin aviso.
 * null si el importe incluye todos los cheques.
 */
export const excludedChecksNotice = (payment) => {
  const checks = payment?.cheques || [];
  const rejected = checks.filter((check) => check.estado === 'RECHAZADO');
  const originalAmount = checks.reduce((sum, check) => sum + (parseFloat(check.importe) || 0), 0);
  if (!rejected.length || parseFloat(payment.importe) >= originalAmount) return null;
  const rejectedAmount = rejected.reduce((sum, check) => sum + (parseFloat(check.importe) || 0), 0);
  const numbers = rejected.map((check) => `N° ${check.numero}`).join(', ');
  return `No incluye ${rejected.length > 1 ? 'los cheques rechazados' : 'el cheque rechazado'} ${numbers} `
    + `(${formatCurrency(rejectedAmount)}): su importe ya volvió a la cuenta corriente del cliente. `
    + `Importe original: ${formatCurrency(originalAmount)}.`;
};
