import React from 'react';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import DeleteMessage from '../../../components/DeleteMessage';
import { formatCurrency } from '../../../utils/currency';

const iconSx = { fontSize: 16 };

const checkNumbers = (checks) => checks.map((check) => `N° ${check.numero}`).join(', ');

// Qué pasa al anular un pago de cliente (DEV-155). Lo usan el listado y el detalle.
export const cancelClientPaymentEffects = (payment) => {
  const checks = payment.cheques || [];
  const active = checks.filter((check) => check.estado !== 'RECHAZADO');
  const rejected = checks.filter((check) => check.estado === 'RECHAZADO');
  return [
    { icon: <AccountBalanceWalletOutlinedIcon sx={iconSx} />, text: `La deuda del cliente sube ${formatCurrency(payment.importe)}.` },
    active.length > 0 && {
      icon: <PaymentOutlinedIcon sx={iconSx} />,
      text: active.length > 1
        ? `Los cheques ${checkNumbers(active)} quedan anulados: salen de la cartera y se conservan como registro.`
        : `El cheque ${checkNumbers(active)} queda anulado: sale de la cartera y se conserva como registro.`,
    },
    rejected.length > 0 && {
      icon: <PaymentOutlinedIcon sx={iconSx} />,
      text: 'Los cheques rechazados siguen así: su importe ya volvió a la cuenta corriente.',
    },
  ].filter(Boolean);
};

export const ENDORSED_CHECK_NOTE = 'Si algún cheque está endosado a un pago a proveedor vigente, primero hay que anular ese pago.';

const CancelClientPaymentMessage = ({ payment }) => (
  <DeleteMessage
    summary={(
      <>
        Vas a anular el pago de <strong>{formatCurrency(payment.importe)}</strong> de{' '}
        <strong>{payment.cliente?.razon_social || '—'}</strong>. No se borra: queda como registro, con
        estado Anulado y el motivo, y ya no se puede editar.
      </>
    )}
    effects={cancelClientPaymentEffects(payment)}
    note={payment.cheques?.length ? ENDORSED_CHECK_NOTE : null}
  />
);

export default CancelClientPaymentMessage;
