import React from 'react';
import DeleteMessage from '../../../components/DeleteMessage';
import { formatCurrency } from '../../../utils/currency';

const DROPPED_CHECK_STATES = ['RECHAZADO', 'ANULADO'];

// Qué pasa al anular un pago a proveedor (DEV-150), según sus compras y cheques. Lo usan el detalle y el listado.
export const cancelPaymentEffects = (payment) => {
  const clientChecks = payment.cheques || [];
  const ownChecks = payment.cheques_propios || [];
  const activeClientChecks = clientChecks.filter((check) => check.estado !== 'RECHAZADO');
  const activeOwnChecks = ownChecks.filter((ownCheck) => !DROPPED_CHECK_STATES.includes(ownCheck.estado));
  const hasDroppedChecks = clientChecks.some((check) => check.estado === 'RECHAZADO')
    || ownChecks.some((ownCheck) => DROPPED_CHECK_STATES.includes(ownCheck.estado));
  return [
    'El importe vuelve a la cuenta corriente del proveedor.',
    payment.compras?.length > 0 && 'Las compras que cubre el pago dejan de contarlo y vuelven a su estado anterior.',
    activeClientChecks.length > 0 && 'Los cheques de clientes vuelven a estar en cartera.',
    activeOwnChecks.length > 0 && 'Lo usado de los cheques emitidos se libera: quedan disponibles, también para otro proveedor.',
    hasDroppedChecks && 'Los cheques rechazados o anulados siguen así y su importe no se devuelve otra vez.',
  ].filter(Boolean);
};

const CancelPaymentMessage = ({ payment, supplierName }) => (
  <DeleteMessage
    summary={(
      <>
        Vas a anular el pago de <strong>{formatCurrency(payment.importe_abonado)}</strong> a <strong>{supplierName}</strong>.
        {' '}No se borra: queda como registro, con estado Anulado, y ya no se puede editar.
      </>
    )}
    effects={cancelPaymentEffects(payment)}
  />
);

export default CancelPaymentMessage;
