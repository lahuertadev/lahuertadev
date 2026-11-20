import React from 'react';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DeleteMessage from '../../../components/DeleteMessage';
import { formatCurrency } from '../../../utils/currency';

const iconSx = { fontSize: 16 };

export const buyNumber = (id) => String(id).padStart(8, '0');

// Lo que la compra le sumó a la cuenta corriente del proveedor: el importe menos la seña.
const netDebt = (buy) => parseFloat(buy.importe || 0) - parseFloat(buy.senia || 0);

export const PAYMENTS_BLOCK_NOTE = 'Si un pago cubre la compra, aunque esté anulado, no se va a poder eliminar.';

// Qué pasa al eliminar una compra (DEV-150). Lo usan el listado y el detalle.
// buy: { id, importe, senia, proveedor: { nombre } }.
const DeleteBuyMessage = ({ buy }) => (
  <DeleteMessage
    summary={(
      <>
        Vas a eliminar la compra N° <strong>{buyNumber(buy.id)}</strong> de <strong>{buy.proveedor?.nombre || '—'}</strong> por{' '}
        <strong>{formatCurrency(buy.importe)}</strong>. No se puede deshacer.
      </>
    )}
    effects={[
      { icon: <AccountBalanceWalletOutlinedIcon sx={iconSx} />, text: `La deuda con el proveedor baja ${formatCurrency(netDebt(buy))}.` },
      { icon: <Inventory2OutlinedIcon sx={iconSx} />, text: 'Se eliminan los productos de la compra.' },
    ]}
    note={PAYMENTS_BLOCK_NOTE}
  />
);

export default DeleteBuyMessage;
