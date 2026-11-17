import React from 'react';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import DeleteMessage from '../../../components/DeleteMessage';
import { formatCurrency } from '../../../utils/currency';

const iconSx = { fontSize: 16 };

// Qué pasa al eliminar un pago de cliente (DEV-150). Lo usan el listado y el detalle.
export const deleteClientPaymentEffects = (payment) => [
  { icon: <AccountBalanceWalletOutlinedIcon sx={iconSx} />, text: `La deuda del cliente sube ${formatCurrency(payment.importe)}.` },
  payment.cheque && { icon: <PaymentOutlinedIcon sx={iconSx} />, text: `Se elimina el cheque N° ${payment.cheque.numero}.` },
].filter(Boolean);

export const CHECK_USED_NOTE = 'Si el cheque ya se endosó o se usó en un pago a proveedor, no se va a poder eliminar.';

const DeleteClientPaymentMessage = ({ payment }) => (
  <DeleteMessage
    summary={(
      <>
        Vas a eliminar el pago de <strong>{formatCurrency(payment.importe)}</strong> de{' '}
        <strong>{payment.cliente?.razon_social || '—'}</strong>. No se puede deshacer.
      </>
    )}
    effects={deleteClientPaymentEffects(payment)}
    note={payment.cheque ? CHECK_USED_NOTE : null}
  />
);

export default DeleteClientPaymentMessage;
