import React from 'react';

// Qué pasa al eliminar un pago a proveedor, según sus cheques. Lo usan el detalle y el listado.
export const deletePaymentEffects = (payment) => {
  const clientChecks = payment.cheques || [];
  const activeClientChecks = clientChecks.filter((check) => check.estado !== 'RECHAZADO');
  const rejectedClientChecks = clientChecks.filter((check) => check.estado === 'RECHAZADO');
  return [
    'El importe vuelve a la cuenta corriente del proveedor.',
    activeClientChecks.length > 0 && 'Los cheques de clientes vuelven a estar en cartera.',
    rejectedClientChecks.length > 0 && 'Los cheques rechazados siguen rechazados y su importe no se devuelve otra vez.',
    payment.cheques_propios?.length > 0 && 'Lo usado de los cheques propios queda libre para otros pagos.',
  ].filter(Boolean);
};

const DeletePaymentMessage = ({ payment, supplierName }) => (
  <div className="space-y-2">
    <p>¿Estás seguro que querés eliminar este pago de {supplierName}? Esta acción no se puede deshacer.</p>
    <ul className="list-disc pl-5 space-y-1 text-on-surface-muted">
      {deletePaymentEffects(payment).map((effect) => <li key={effect}>{effect}</li>)}
    </ul>
  </div>
);

export default DeletePaymentMessage;
